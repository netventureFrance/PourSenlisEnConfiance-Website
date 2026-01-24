// Netlify Function to upload photos via imgBB

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
        const IMGBB_API_KEY = process.env.IMGBB_API_KEY;

        if (!IMGBB_API_KEY) {
            return {
                statusCode: 500,
                headers: corsHeaders,
                body: JSON.stringify({ error: 'Configuration serveur manquante (IMGBB_API_KEY)' })
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

        // Extract base64 data (remove data:image/xxx;base64, prefix if present)
        let base64Data = image;
        if (image.includes('base64,')) {
            base64Data = image.split('base64,')[1];
        }

        // Upload to imgBB
        const formData = new URLSearchParams();
        formData.append('key', IMGBB_API_KEY);
        formData.append('image', base64Data);
        if (name) {
            formData.append('name', name);
        }

        const response = await fetch('https://api.imgbb.com/1/upload', {
            method: 'POST',
            body: formData
        });

        const result = await response.json();

        if (!result.success) {
            console.error('imgBB error:', result);
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({ error: 'Erreur imgBB: ' + (result.error?.message || 'Erreur inconnue') })
            };
        }

        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify({
                success: true,
                url: result.data.url,
                display_url: result.data.display_url,
                thumb_url: result.data.thumb.url,
                delete_url: result.data.delete_url
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
