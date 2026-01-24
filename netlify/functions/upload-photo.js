// Netlify Function to upload photos directly to GitHub

const ALLOWED_ORIGINS = [
    'https://poursenlisenconfiance.fr',
    'https://www.poursenlisenconfiance.fr'
];

function getCorsHeaders(event) {
    const origin = event.headers.origin || event.headers.Origin || '';
    const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
    return {
        'Access-Control-Allow-Origin': allowedOrigin,
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Credentials': 'true'
    };
}

exports.handler = async (event) => {
    const corsHeaders = getCorsHeaders(event);

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 204, headers: corsHeaders, body: '' };
    }

    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers: corsHeaders,
            body: JSON.stringify({ error: 'Method Not Allowed' })
        };
    }

    try {
        const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
        const GITHUB_REPO = 'netventureFrance/PourSenlisEnConfiance-Website';
        const GITHUB_BRANCH = 'main';

        if (!GITHUB_TOKEN) {
            return {
                statusCode: 500,
                headers: corsHeaders,
                body: JSON.stringify({ error: 'Configuration serveur manquante (GITHUB_TOKEN)' })
            };
        }

        const { image, name } = JSON.parse(event.body);

        if (!image) {
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({ error: 'Image requise' })
            };
        }

        // Extract base64 data and file type
        const matches = image.match(/^data:image\/(\w+);base64,(.+)$/);
        if (!matches) {
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({ error: 'Format image invalide' })
            };
        }

        const imageType = matches[1] === 'jpeg' ? 'jpg' : matches[1];
        const base64Data = matches[2];

        // Generate filename
        const timestamp = Date.now();
        const cleanName = name
            ? name.toLowerCase()
                .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // Remove accents
                .replace(/[^a-z0-9]/g, '-')
                .replace(/-+/g, '-')
                .substring(0, 30)
            : 'photo';
        const filename = `${cleanName}-${timestamp}.${imageType}`;
        const filePath = `images/liste/${filename}`;

        // Check if images/liste folder exists, if not it will be created with the file

        // Upload to GitHub
        const githubResponse = await fetch(
            `https://api.github.com/repos/${GITHUB_REPO}/contents/${filePath}`,
            {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${GITHUB_TOKEN}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/vnd.github.v3+json',
                    'User-Agent': 'PSEC-Website'
                },
                body: JSON.stringify({
                    message: `Add photo: ${filename}`,
                    content: base64Data,
                    branch: GITHUB_BRANCH
                })
            }
        );

        if (!githubResponse.ok) {
            const errorData = await githubResponse.text();
            console.error('GitHub API error:', errorData);
            return {
                statusCode: githubResponse.status,
                headers: corsHeaders,
                body: JSON.stringify({ error: 'Erreur GitHub: ' + errorData })
            };
        }

        const result = await githubResponse.json();

        // The URL will be served by Netlify from the repo
        const siteUrl = 'https://poursenlisenconfiance.fr';
        const imageUrl = `${siteUrl}/${filePath}`;

        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify({
                success: true,
                url: imageUrl,
                filename: filename,
                path: filePath,
                sha: result.content.sha
            })
        };

    } catch (error) {
        console.error('Upload error:', error);
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({ error: 'Erreur serveur: ' + error.message })
        };
    }
};
