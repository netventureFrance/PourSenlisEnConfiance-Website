// Netlify Function to fetch all Liste records from Airtable

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
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Credentials': 'true'
    };
}

// Check if a record is complete (has all required fields)
function isRecordComplete(fields) {
    const requiredFields = ['Nom', 'Photo', 'Profession', 'Quartier', 'Bio', 'Message Personnel'];
    return requiredFields.every(field => {
        const value = fields[field];
        if (!value) return false;
        return value.toString().trim() !== '';
    });
}

exports.handler = async (event) => {
    const corsHeaders = getCorsHeaders(event);

    // Handle preflight OPTIONS request
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 204,
            headers: corsHeaders,
            body: ''
        };
    }

    // Only allow GET requests
    if (event.httpMethod !== 'GET') {
        return {
            statusCode: 405,
            headers: corsHeaders,
            body: JSON.stringify({ error: 'Method Not Allowed' })
        };
    }

    try {
        const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
        const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
        const AIRTABLE_LISTE_TABLE = process.env.AIRTABLE_LISTE_TABLE || 'Liste';

        if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
            return {
                statusCode: 500,
                headers: corsHeaders,
                body: JSON.stringify({ error: 'Configuration serveur manquante' })
            };
        }

        // Fetch all records from Airtable
        let allRecords = [];
        let offset = null;

        do {
            const url = new URL(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_LISTE_TABLE)}`);
            url.searchParams.append('sort[0][field]', 'Nom');
            url.searchParams.append('sort[0][direction]', 'asc');
            if (offset) {
                url.searchParams.append('offset', offset);
            }

            const response = await fetch(url.toString(), {
                headers: {
                    'Authorization': `Bearer ${AIRTABLE_API_KEY}`
                }
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Airtable error:', errorText);
                return {
                    statusCode: response.status,
                    headers: corsHeaders,
                    body: JSON.stringify({ error: 'Erreur lors de la récupération des données' })
                };
            }

            const data = await response.json();
            allRecords = allRecords.concat(data.records);
            offset = data.offset;
        } while (offset);

        // Process records for the frontend
        const records = allRecords.map(record => ({
            id: record.id,
            nom: record.fields['Nom'] || '',
            age: record.fields['Age'] || null,
            profession: record.fields['Profession'] || '',
            quartier: record.fields['Quartier'] || '',
            bio: record.fields['Bio'] || '',
            message: record.fields['Message Personnel'] || '',
            photo: record.fields['Photo'] ? { url: record.fields['Photo'] } : null,
            email: record.fields['Email'] || '',
            telephone: record.fields['Telephone'] || '',
            facebook: record.fields['Facebook'] || '',
            linkedin: record.fields['LinkedIn'] || '',
            instagram: record.fields['Instagram'] || '',
            statut: record.fields['Statut'] || 'À valider',
            isComplete: isRecordComplete(record.fields),
            isValidated: record.fields['Statut'] === 'Validé' || record.fields['Statut'] === 'Publié'
        }));

        // Calculate stats
        const totalRecords = records.length;
        const completeRecords = records.filter(r => r.isComplete).length;
        const validatedRecords = records.filter(r => r.isValidated).length;

        return {
            statusCode: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                success: true,
                records: records,
                stats: {
                    total: totalRecords,
                    target: 35,
                    complete: completeRecords,
                    validated: validatedRecords
                }
            })
        };

    } catch (error) {
        console.error('Function error:', error);
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({ error: 'Erreur serveur interne' })
        };
    }
};
