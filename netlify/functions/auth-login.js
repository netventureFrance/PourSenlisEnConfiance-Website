// Netlify Function for admin authentication
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

exports.handler = async (event) => {
    // Handle preflight OPTIONS request
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 204,
            headers: corsHeaders,
            body: ''
        };
    }

    // Only allow POST requests
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers: corsHeaders,
            body: JSON.stringify({ error: 'Method Not Allowed' })
        };
    }

    try {
        const { email, password } = JSON.parse(event.body);

        // Validate required fields
        if (!email || !password) {
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({ error: 'Email et mot de passe requis' })
            };
        }

        // Environment variables
        const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
        const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
        const AIRTABLE_USERS_TABLE = process.env.AIRTABLE_USERS_TABLE || 'Users';
        const JWT_SECRET = process.env.JWT_SECRET;

        if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID || !JWT_SECRET) {
            console.error('Missing environment variables');
            return {
                statusCode: 500,
                headers: corsHeaders,
                body: JSON.stringify({ error: 'Configuration serveur manquante' })
            };
        }

        // Fetch user from Airtable by email
        const filterFormula = `{Email}='${email.replace(/'/g, "\\'")}'`;
        const airtableResponse = await fetch(
            `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_USERS_TABLE)}?filterByFormula=${encodeURIComponent(filterFormula)}&maxRecords=1`,
            {
                headers: {
                    'Authorization': `Bearer ${AIRTABLE_API_KEY}`
                }
            }
        );

        if (!airtableResponse.ok) {
            console.error('Airtable error:', await airtableResponse.text());
            return {
                statusCode: 500,
                headers: corsHeaders,
                body: JSON.stringify({ error: 'Erreur de connexion à la base de données' })
            };
        }

        const airtableData = await airtableResponse.json();

        // Check if user exists
        if (!airtableData.records || airtableData.records.length === 0) {
            return {
                statusCode: 401,
                headers: corsHeaders,
                body: JSON.stringify({ error: 'Email ou mot de passe incorrect' })
            };
        }

        const user = airtableData.records[0];
        const storedHash = user.fields.Password;

        // Verify password
        const passwordMatch = await bcrypt.compare(password, storedHash);

        if (!passwordMatch) {
            return {
                statusCode: 401,
                headers: corsHeaders,
                body: JSON.stringify({ error: 'Email ou mot de passe incorrect' })
            };
        }

        // Generate JWT token
        const token = jwt.sign(
            {
                email: user.fields.Email,
                nom: user.fields.Nom || user.fields.Email.split('@')[0],
                userId: user.id
            },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        // Update last login in Airtable (non-blocking)
        fetch(
            `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_USERS_TABLE)}/${user.id}`,
            {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    fields: {
                        'Last Login': new Date().toISOString()
                    }
                })
            }
        ).catch(err => console.error('Failed to update last login:', err));

        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify({
                success: true,
                token,
                user: {
                    email: user.fields.Email,
                    nom: user.fields.Nom || user.fields.Email.split('@')[0]
                }
            })
        };

    } catch (error) {
        console.error('Auth error:', error);
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({ error: 'Erreur serveur interne' })
        };
    }
};
