// Netlify Function for JWT token verification
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
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Credentials': 'true'
    };
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
        const JWT_SECRET = process.env.JWT_SECRET;

        if (!JWT_SECRET) {
            return {
                statusCode: 500,
                headers: corsHeaders,
                body: JSON.stringify({ error: 'Configuration serveur manquante' })
            };
        }

        // Get token from Authorization header
        const authHeader = event.headers.authorization || event.headers.Authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return {
                statusCode: 401,
                headers: corsHeaders,
                body: JSON.stringify({ valid: false, error: 'Token manquant' })
            };
        }

        const token = authHeader.slice(7);

        // Verify token
        const decoded = jwt.verify(token, JWT_SECRET);

        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify({
                valid: true,
                user: {
                    email: decoded.email,
                    nom: decoded.nom,
                    userId: decoded.userId
                }
            })
        };

    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return {
                statusCode: 401,
                headers: corsHeaders,
                body: JSON.stringify({ valid: false, error: 'Token expiré' })
            };
        }

        if (error.name === 'JsonWebTokenError') {
            return {
                statusCode: 401,
                headers: corsHeaders,
                body: JSON.stringify({ valid: false, error: 'Token invalide' })
            };
        }

        console.error('Verify error:', error);
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({ valid: false, error: 'Erreur serveur' })
        };
    }
};
