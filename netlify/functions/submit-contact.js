// Netlify Function to handle contact form submission to Airtable
exports.handler = async (event) => {
    // Only allow POST requests
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: JSON.stringify({ error: 'Method Not Allowed' })
        };
    }

    try {
        const formData = JSON.parse(event.body);

        // Validate required fields
        if (!formData.name || !formData.email || !formData.message || !formData.gdpr) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'Champs requis manquants' })
            };
        }

        // Airtable configuration from environment variables
        const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
        const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
        const AIRTABLE_TABLE_NAME = process.env.AIRTABLE_TABLE_NAME;

        if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID || !AIRTABLE_TABLE_NAME) {
            return {
                statusCode: 500,
                body: JSON.stringify({ error: 'Configuration serveur manquante' })
            };
        }

        // Prepare data for Airtable
        const airtableData = {
            fields: {
                'Nom': formData.name,
                'Email': formData.email,
                'Téléphone': formData.phone || '',
                'Message': formData.message,
                'Newsletter': formData.newsletter || false,
                'GDPR Consent': formData.gdpr || false,
                'Date': new Date().toISOString()
            }
        };

        // Send to Airtable
        const response = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_NAME}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(airtableData)
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Airtable error:', errorData);

            // Return detailed error for debugging
            let errorMessage = 'Erreur Airtable: ';
            if (errorData.error && errorData.error.type === 'INVALID_REQUEST_UNKNOWN') {
                errorMessage = 'Champs Airtable incorrects. Vérifiez les noms des champs.';
            } else if (errorData.error && errorData.error.message) {
                errorMessage = errorData.error.message;
            }

            return {
                statusCode: response.status,
                body: JSON.stringify({
                    error: errorMessage,
                    details: errorData // Include full error for debugging
                })
            };
        }

        const result = await response.json();

        return {
            statusCode: 200,
            body: JSON.stringify({
                success: true,
                message: 'Message envoyé avec succès',
                id: result.id
            })
        };

    } catch (error) {
        console.error('Function error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Erreur serveur interne' })
        };
    }
};
