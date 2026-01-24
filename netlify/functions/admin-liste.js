// Admin function for Liste management (validate, update status)

const ALLOWED_ORIGINS = [
    'https://poursenlisenconfiance.fr',
    'https://www.poursenlisenconfiance.fr'
];

function getCorsHeaders(event) {
    const origin = event.headers.origin || event.headers.Origin || '';
    const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
    return {
        'Access-Control-Allow-Origin': allowedOrigin,
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Credentials': 'true'
    };
}

// Simple JWT verification (matching existing admin pattern)
function verifyToken(authHeader, jwtSecret) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return null;
    }

    const token = authHeader.split(' ')[1];

    try {
        // Simple JWT decode (in production, use a proper JWT library)
        const parts = token.split('.');
        if (parts.length !== 3) return null;

        const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());

        // Check expiration
        if (payload.exp && payload.exp < Date.now() / 1000) {
            return null;
        }

        return payload;
    } catch (error) {
        return null;
    }
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

    // Verify admin authentication
    const JWT_SECRET = process.env.JWT_SECRET;
    const user = verifyToken(event.headers.authorization, JWT_SECRET);

    if (!user) {
        return {
            statusCode: 401,
            headers: corsHeaders,
            body: JSON.stringify({ error: 'Non autorisé' })
        };
    }

    try {
        const { action, recordId, status } = JSON.parse(event.body);

        const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
        const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
        const AIRTABLE_LISTE_TABLE = process.env.AIRTABLE_LISTE_TABLE || 'Liste';

        if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
            return {
                statusCode: 500,
                headers: corsHeaders,
                body: JSON.stringify({ error: 'Configuration manquante' })
            };
        }

        // Handle different actions
        if (action === 'updateStatus') {
            if (!recordId || !status) {
                return {
                    statusCode: 400,
                    headers: corsHeaders,
                    body: JSON.stringify({ error: 'recordId et status requis' })
                };
            }

            const validStatuses = ['À valider', 'Validé', 'Publié'];
            if (!validStatuses.includes(status)) {
                return {
                    statusCode: 400,
                    headers: corsHeaders,
                    body: JSON.stringify({ error: 'Statut invalide' })
                };
            }

            // Update record in Airtable
            const response = await fetch(
                `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_LISTE_TABLE)}/${recordId}`,
                {
                    method: 'PATCH',
                    headers: {
                        'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        fields: { 'Statut': status }
                    })
                }
            );

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Airtable error:', errorText);
                return {
                    statusCode: response.status,
                    headers: corsHeaders,
                    body: JSON.stringify({ error: 'Erreur de mise à jour' })
                };
            }

            const result = await response.json();

            return {
                statusCode: 200,
                headers: corsHeaders,
                body: JSON.stringify({
                    success: true,
                    message: `Statut mis à jour: ${status}`,
                    record: result
                })
            };
        }

        if (action === 'delete') {
            if (!recordId) {
                return {
                    statusCode: 400,
                    headers: corsHeaders,
                    body: JSON.stringify({ error: 'recordId requis' })
                };
            }

            const response = await fetch(
                `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_LISTE_TABLE)}/${recordId}`,
                {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${AIRTABLE_API_KEY}`
                    }
                }
            );

            if (!response.ok) {
                return {
                    statusCode: response.status,
                    headers: corsHeaders,
                    body: JSON.stringify({ error: 'Erreur de suppression' })
                };
            }

            return {
                statusCode: 200,
                headers: corsHeaders,
                body: JSON.stringify({
                    success: true,
                    message: 'Fiche supprimée'
                })
            };
        }

        return {
            statusCode: 400,
            headers: corsHeaders,
            body: JSON.stringify({ error: 'Action non reconnue' })
        };

    } catch (error) {
        console.error('Admin Liste error:', error);
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({ error: 'Erreur serveur' })
        };
    }
};
