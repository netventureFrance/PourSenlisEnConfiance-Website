// Netlify Function for user management
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS'
};

// Verify JWT token helper
function verifyToken(event) {
    const JWT_SECRET = process.env.JWT_SECRET;
    const authHeader = event.headers.authorization || event.headers.Authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return { valid: false, error: 'Token manquant' };
    }

    try {
        const token = authHeader.slice(7);
        const decoded = jwt.verify(token, JWT_SECRET);
        return { valid: true, user: decoded };
    } catch (error) {
        return { valid: false, error: error.name === 'TokenExpiredError' ? 'Token expiré' : 'Token invalide' };
    }
}

exports.handler = async (event) => {
    // Handle preflight OPTIONS request
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 204,
            headers: corsHeaders,
            body: ''
        };
    }

    // Verify authentication
    const auth = verifyToken(event);
    if (!auth.valid) {
        return {
            statusCode: 401,
            headers: corsHeaders,
            body: JSON.stringify({ error: auth.error })
        };
    }

    const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
    const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
    const AIRTABLE_USERS_TABLE = process.env.AIRTABLE_USERS_TABLE || 'Users';

    if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({ error: 'Configuration serveur manquante' })
        };
    }

    try {
        // GET: List all users
        if (event.httpMethod === 'GET') {
            const response = await fetch(
                `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_USERS_TABLE)}?sort[0][field]=Email&sort[0][direction]=asc`,
                {
                    headers: { 'Authorization': `Bearer ${AIRTABLE_API_KEY}` }
                }
            );

            if (!response.ok) {
                throw new Error('Failed to fetch users');
            }

            const data = await response.json();
            const users = data.records.map(r => ({
                id: r.id,
                visibleId: r.fields['ID'] || '',
                email: r.fields['Email'] || '',
                nom: r.fields['Nom'] || '',
                lastLogin: r.fields['Last Login'] || null
            }));

            return {
                statusCode: 200,
                headers: corsHeaders,
                body: JSON.stringify({ success: true, users })
            };
        }

        // POST: Create new user
        if (event.httpMethod === 'POST') {
            const { email, password, nom } = JSON.parse(event.body);

            if (!email || !password) {
                return {
                    statusCode: 400,
                    headers: corsHeaders,
                    body: JSON.stringify({ error: 'Email et mot de passe requis' })
                };
            }

            // Check if user already exists
            const checkResponse = await fetch(
                `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_USERS_TABLE)}?filterByFormula=${encodeURIComponent(`{Email}='${email.replace(/'/g, "\\'")}'`)}`,
                {
                    headers: { 'Authorization': `Bearer ${AIRTABLE_API_KEY}` }
                }
            );

            const checkData = await checkResponse.json();
            if (checkData.records && checkData.records.length > 0) {
                return {
                    statusCode: 400,
                    headers: corsHeaders,
                    body: JSON.stringify({ error: 'Un utilisateur avec cet email existe déjà' })
                };
            }

            // Hash password
            const hashedPassword = await bcrypt.hash(password, 12);

            // Create user
            const createResponse = await fetch(
                `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_USERS_TABLE)}`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        fields: {
                            'Email': email,
                            'Password': hashedPassword,
                            'Nom': nom || email.split('@')[0]
                        }
                    })
                }
            );

            if (!createResponse.ok) {
                throw new Error('Failed to create user');
            }

            const newUser = await createResponse.json();

            return {
                statusCode: 200,
                headers: corsHeaders,
                body: JSON.stringify({
                    success: true,
                    message: 'Utilisateur créé avec succès',
                    user: {
                        id: newUser.id,
                        email: newUser.fields['Email'],
                        nom: newUser.fields['Nom']
                    }
                })
            };
        }

        // PATCH: Update user (reset password or update name)
        if (event.httpMethod === 'PATCH') {
            const { userId, password, nom } = JSON.parse(event.body);

            if (!userId) {
                return {
                    statusCode: 400,
                    headers: corsHeaders,
                    body: JSON.stringify({ error: 'userId requis' })
                };
            }

            const updateFields = {};
            if (password) {
                updateFields['Password'] = await bcrypt.hash(password, 12);
            }
            if (nom !== undefined) {
                updateFields['Nom'] = nom;
            }

            if (Object.keys(updateFields).length === 0) {
                return {
                    statusCode: 400,
                    headers: corsHeaders,
                    body: JSON.stringify({ error: 'Aucune modification fournie' })
                };
            }

            const updateResponse = await fetch(
                `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_USERS_TABLE)}/${userId}`,
                {
                    method: 'PATCH',
                    headers: {
                        'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ fields: updateFields })
                }
            );

            if (!updateResponse.ok) {
                throw new Error('Failed to update user');
            }

            return {
                statusCode: 200,
                headers: corsHeaders,
                body: JSON.stringify({
                    success: true,
                    message: password ? 'Mot de passe mis à jour' : 'Utilisateur mis à jour'
                })
            };
        }

        // DELETE: Remove user
        if (event.httpMethod === 'DELETE') {
            const { userId } = JSON.parse(event.body);

            if (!userId) {
                return {
                    statusCode: 400,
                    headers: corsHeaders,
                    body: JSON.stringify({ error: 'userId requis' })
                };
            }

            // Prevent self-deletion
            if (auth.user.userId === userId) {
                return {
                    statusCode: 400,
                    headers: corsHeaders,
                    body: JSON.stringify({ error: 'Vous ne pouvez pas supprimer votre propre compte' })
                };
            }

            const deleteResponse = await fetch(
                `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_USERS_TABLE)}/${userId}`,
                {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${AIRTABLE_API_KEY}` }
                }
            );

            if (!deleteResponse.ok) {
                throw new Error('Failed to delete user');
            }

            return {
                statusCode: 200,
                headers: corsHeaders,
                body: JSON.stringify({
                    success: true,
                    message: 'Utilisateur supprimé'
                })
            };
        }

        return {
            statusCode: 405,
            headers: corsHeaders,
            body: JSON.stringify({ error: 'Method Not Allowed' })
        };

    } catch (error) {
        console.error('Users error:', error);
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({ error: 'Erreur serveur interne' })
        };
    }
};
