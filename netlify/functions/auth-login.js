// Netlify Function for admin authentication
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Allowed origins for CORS
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

// Safe escape for Airtable formula strings
function escapeAirtableValue(value) {
    if (typeof value !== 'string') return '';
    // Escape backslashes first, then quotes
    return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '\\"');
}

// Email validation
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Simple in-memory rate limiting (resets on function cold start)
const loginAttempts = new Map();
const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes

function checkRateLimit(email) {
    const now = Date.now();
    const key = email.toLowerCase();
    const attempts = loginAttempts.get(key);

    if (!attempts) {
        return { allowed: true };
    }

    // Clean old attempts
    if (now - attempts.firstAttempt > LOCKOUT_DURATION) {
        loginAttempts.delete(key);
        return { allowed: true };
    }

    if (attempts.count >= MAX_ATTEMPTS) {
        const remainingTime = Math.ceil((LOCKOUT_DURATION - (now - attempts.firstAttempt)) / 1000 / 60);
        return { allowed: false, remainingMinutes: remainingTime };
    }

    return { allowed: true };
}

function recordFailedAttempt(email) {
    const key = email.toLowerCase();
    const now = Date.now();
    const attempts = loginAttempts.get(key);

    if (!attempts) {
        loginAttempts.set(key, { count: 1, firstAttempt: now });
    } else {
        attempts.count++;
    }
}

function clearAttempts(email) {
    loginAttempts.delete(email.toLowerCase());
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

        // Validate email format
        if (!isValidEmail(email)) {
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({ error: 'Format d\'email invalide' })
            };
        }

        // Check rate limiting
        const rateCheck = checkRateLimit(email);
        if (!rateCheck.allowed) {
            return {
                statusCode: 429,
                headers: corsHeaders,
                body: JSON.stringify({
                    error: `Trop de tentatives. Réessayez dans ${rateCheck.remainingMinutes} minute(s).`
                })
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

        // Fetch user from Airtable by email (safely escaped)
        const filterFormula = `{Email}='${escapeAirtableValue(email)}'`;
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
            recordFailedAttempt(email);
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
            recordFailedAttempt(email);
            return {
                statusCode: 401,
                headers: corsHeaders,
                body: JSON.stringify({ error: 'Email ou mot de passe incorrect' })
            };
        }

        // Clear rate limit on successful login
        clearAttempts(email);

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
