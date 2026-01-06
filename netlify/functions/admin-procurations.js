// Netlify Function to fetch procurations for admin dashboard
const jwt = require('jsonwebtoken');

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, OPTIONS'
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

    // Only allow GET requests
    if (event.httpMethod !== 'GET') {
        return {
            statusCode: 405,
            headers: corsHeaders,
            body: JSON.stringify({ error: 'Method Not Allowed' })
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

    try {
        const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
        const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
        const AIRTABLE_PROCURATIONS_TABLE = process.env.AIRTABLE_PROCURATIONS_TABLE || 'Procurations';

        if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
            return {
                statusCode: 500,
                headers: corsHeaders,
                body: JSON.stringify({ error: 'Configuration serveur manquante' })
            };
        }

        // Parse query parameters
        const params = event.queryStringParameters || {};
        const type = params.type; // 'Mandant' or 'Mandataire'
        const statut = params.statut; // 'En attente', 'Proposé', 'Confirmé'

        // Build filter formula
        const filters = [];
        if (type) {
            filters.push(`{Type}='${type}'`);
        }
        if (statut) {
            filters.push(`{Statut}='${statut}'`);
        }

        let filterFormula = '';
        if (filters.length === 1) {
            filterFormula = filters[0];
        } else if (filters.length > 1) {
            filterFormula = `AND(${filters.join(', ')})`;
        }

        // Fetch from Airtable
        let url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_PROCURATIONS_TABLE)}?sort[0][field]=Date&sort[0][direction]=desc`;

        if (filterFormula) {
            url += `&filterByFormula=${encodeURIComponent(filterFormula)}`;
        }

        const airtableResponse = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${AIRTABLE_API_KEY}`
            }
        });

        if (!airtableResponse.ok) {
            console.error('Airtable error:', await airtableResponse.text());
            return {
                statusCode: 500,
                headers: corsHeaders,
                body: JSON.stringify({ error: 'Erreur de connexion à Airtable' })
            };
        }

        const airtableData = await airtableResponse.json();

        // Format records for frontend
        const records = airtableData.records.map(record => ({
            id: record.id,
            nom: record.fields['Nom'] || '',
            email: record.fields['Email'] || '',
            phone: record.fields['Téléphone'] || '',
            type: record.fields['Type'] || '',
            dateNaissance: record.fields['Date de Naissance'] || '',
            numeroElecteur: record.fields['Numéro Électeur'] || '',
            bureau: record.fields['Bureau de Vote'] || '',
            quartier: record.fields['Quartier'] || '',
            tours: record.fields['Tours'] || '',
            message: record.fields['Message'] || '',
            statut: record.fields['Statut'] || 'En attente',
            date: record.fields['Date'] || '',
            matchId: record.fields['Match'] ? record.fields['Match'][0] : null
        }));

        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify({
                success: true,
                records,
                total: records.length
            })
        };

    } catch (error) {
        console.error('Procurations fetch error:', error);
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({ error: 'Erreur serveur interne' })
        };
    }
};
