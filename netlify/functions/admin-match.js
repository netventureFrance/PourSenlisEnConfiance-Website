// Netlify Function for creating and managing procuration matches
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
        'Access-Control-Allow-Methods': 'POST, PATCH, GET, OPTIONS',
        'Access-Control-Allow-Credentials': 'true'
    };
}

// Valid statuses for matches
const VALID_STATUSES = ['Proposé', 'Confirmé', 'Annulé'];

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

// Send match notification emails
async function sendMatchEmails(mandant, mandataire, RESEND_API_KEY) {
    if (!RESEND_API_KEY) return;

    const emailStyles = `
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f8f9fa; }
        .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
        .header { background: linear-gradient(135deg, #0d3d5c 0%, #3d9dd9 100%); padding: 30px 20px; text-align: center; }
        .header h1 { color: #ffffff; margin: 0; font-size: 24px; }
        .content { padding: 30px 20px; color: #2c3e50; line-height: 1.6; }
        .highlight-box { background-color: #d4edda; border-left: 4px solid #6cb13e; padding: 15px; margin: 20px 0; }
        .info-box { background-color: #f8f9fa; border: 1px solid #dee2e6; border-radius: 8px; padding: 20px; margin: 20px 0; }
        .info-row { margin: 8px 0; }
        .info-label { font-weight: bold; color: #0d3d5c; }
        .footer { background-color: #0d3d5c; color: #ffffff; padding: 20px; text-align: center; font-size: 14px; }
        .footer a { color: #a8d98f; text-decoration: none; }
        .btn { display: inline-block; background-color: #6cb13e; color: #ffffff; padding: 12px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; margin-top: 15px; }
    `;

    // Email to Mandant
    const mandantHtml = `
    <!DOCTYPE html>
    <html lang="fr">
    <head><meta charset="UTF-8"><style>${emailStyles}</style></head>
    <body>
        <div class="container">
            <div class="header"><h1>Pour Senlis en Confiance</h1></div>
            <div class="content">
                <h2>Bonjour ${mandant.civilite || ''} ${mandant.nom},</h2>
                <div class="highlight-box">
                    <strong>Bonne nouvelle !</strong> Nous avons trouvé un mandataire pour voter à votre place.
                </div>
                <p>Voici les coordonnées de votre mandataire :</p>
                <div class="info-box">
                    <div class="info-row"><span class="info-label">Nom :</span> ${mandataire.nom}</div>
                    <div class="info-row"><span class="info-label">Email :</span> <a href="mailto:${mandataire.email}">${mandataire.email}</a></div>
                    <div class="info-row"><span class="info-label">Téléphone :</span> ${mandataire.phone}</div>
                </div>
                <h3>Prochaines étapes</h3>
                <ol>
                    <li>Contactez votre mandataire pour confirmer</li>
                    <li>Établissez la procuration officielle sur maprocuration.gouv.fr</li>
                    <li>Vous aurez besoin de sa date de naissance${mandataire.dateNaissance ? ` : <strong>${new Date(mandataire.dateNaissance).toLocaleDateString('fr-FR')}</strong>` : ''}</li>
                </ol>
                <a href="https://www.maprocuration.gouv.fr/" class="btn">Faire ma procuration</a>
                <p style="margin-top: 30px;">À très bientôt,<br><strong>L'équipe Pour Senlis en Confiance avec Pascale Loiseleur</strong></p>
            </div>
            <div class="footer">
                <p>Pour Senlis en Confiance - Élections Municipales 2026</p>
                <p><a href="https://poursenlisenconfiance.fr">www.poursenlisenconfiance.fr</a></p>
            </div>
        </div>
    </body>
    </html>
    `;

    // Email to Mandataire
    const mandataireHtml = `
    <!DOCTYPE html>
    <html lang="fr">
    <head><meta charset="UTF-8"><style>${emailStyles}</style></head>
    <body>
        <div class="container">
            <div class="header"><h1>Pour Senlis en Confiance</h1></div>
            <div class="content">
                <h2>Bonjour ${mandataire.civilite || ''} ${mandataire.nom},</h2>
                <div class="highlight-box">
                    <strong>Merci pour votre engagement !</strong> Nous avons trouvé un mandant qui a besoin de vous.
                </div>
                <p>Voici les coordonnées de la personne pour qui vous allez voter :</p>
                <div class="info-box">
                    <div class="info-row"><span class="info-label">Nom :</span> ${mandant.nom}</div>
                    <div class="info-row"><span class="info-label">Email :</span> <a href="mailto:${mandant.email}">${mandant.email}</a></div>
                    <div class="info-row"><span class="info-label">Téléphone :</span> ${mandant.phone}</div>
                    <div class="info-row"><span class="info-label">Bureau de vote :</span> ${mandant.bureau}</div>
                </div>
                <h3>Rappels importants</h3>
                <ul>
                    <li>Vous devrez voter dans le bureau de vote du mandant : <strong>${mandant.bureau}</strong></li>
                    <li>Le mandant établira la procuration sur maprocuration.gouv.fr</li>
                    <li>N'oubliez pas d'apporter votre pièce d'identité le jour du vote</li>
                </ul>
                <p style="margin-top: 30px;">Merci encore pour votre aide,<br><strong>L'équipe Pour Senlis en Confiance avec Pascale Loiseleur</strong></p>
            </div>
            <div class="footer">
                <p>Pour Senlis en Confiance - Élections Municipales 2026</p>
                <p><a href="https://poursenlisenconfiance.fr">www.poursenlisenconfiance.fr</a></p>
            </div>
        </div>
    </body>
    </html>
    `;

    try {
        // Send to mandant
        await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${RESEND_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                from: 'Pour Senlis en Confiance avec Pascale Loiseleur <contact@poursenlisenconfiance.fr>',
                to: [mandant.email],
                subject: 'Votre mandataire de procuration a été trouvé !',
                html: mandantHtml
            })
        });

        // Send to mandataire
        await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${RESEND_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                from: 'Pour Senlis en Confiance avec Pascale Loiseleur <contact@poursenlisenconfiance.fr>',
                to: [mandataire.email],
                subject: 'Nouveau mandant pour votre procuration',
                html: mandataireHtml
            })
        });

        console.log('Match emails sent successfully');
    } catch (error) {
        console.error('Error sending match emails:', error);
    }
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
    const AIRTABLE_PROCURATIONS_TABLE = process.env.AIRTABLE_PROCURATIONS_TABLE || 'Procurations';
    const AIRTABLE_MATCHES_TABLE = process.env.AIRTABLE_MATCHES_TABLE || 'Matches';
    const RESEND_API_KEY = process.env.RESEND_API_KEY;

    if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({ error: 'Configuration serveur manquante' })
        };
    }

    try {
        // GET: Fetch matches
        if (event.httpMethod === 'GET') {
            const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_MATCHES_TABLE)}?sort[0][field]=Matched At&sort[0][direction]=desc`;

            const response = await fetch(url, {
                headers: { 'Authorization': `Bearer ${AIRTABLE_API_KEY}` }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch matches');
            }

            const data = await response.json();
            const matches = data.records.map(r => ({
                id: r.id,
                mandantId: r.fields['Mandant'] ? r.fields['Mandant'][0] : null,
                mandataireId: r.fields['Mandataire'] ? r.fields['Mandataire'][0] : null,
                matchedBy: r.fields['Matched By'] || '',
                matchedAt: r.fields['Matched At'] || '',
                status: r.fields['Status'] || 'Proposé',
                tour: r.fields['Tour'] || '',
                notes: r.fields['Notes'] || ''
            }));

            return {
                statusCode: 200,
                headers: corsHeaders,
                body: JSON.stringify({ success: true, matches })
            };
        }

        // POST: Create new match
        if (event.httpMethod === 'POST') {
            const { mandantId, mandataireId, tour, notes } = JSON.parse(event.body);

            if (!mandantId || !mandataireId) {
                return {
                    statusCode: 400,
                    headers: corsHeaders,
                    body: JSON.stringify({ error: 'mandantId et mandataireId requis' })
                };
            }

            // Create match record
            const matchData = {
                fields: {
                    'Mandant': [mandantId],
                    'Mandataire': [mandataireId],
                    'Matched By': auth.user.email,
                    'Matched At': new Date().toISOString(),
                    'Status': 'Proposé',
                    'Tour': tour || '',
                    'Notes': notes || ''
                }
            };

            const matchResponse = await fetch(
                `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_MATCHES_TABLE)}`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(matchData)
                }
            );

            if (!matchResponse.ok) {
                const errorText = await matchResponse.text();
                console.error('Match creation error:', errorText);
                throw new Error('Failed to create match');
            }

            const matchResult = await matchResponse.json();

            // Update both procurations status to "Proposé"
            const updatePromises = [mandantId, mandataireId].map(id =>
                fetch(
                    `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_PROCURATIONS_TABLE)}/${id}`,
                    {
                        method: 'PATCH',
                        headers: {
                            'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            fields: { 'Statut': 'Proposé' }
                        })
                    }
                )
            );

            await Promise.all(updatePromises);

            // Fetch both records for email
            const [mandantRes, mandataireRes] = await Promise.all([
                fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_PROCURATIONS_TABLE)}/${mandantId}`, {
                    headers: { 'Authorization': `Bearer ${AIRTABLE_API_KEY}` }
                }),
                fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_PROCURATIONS_TABLE)}/${mandataireId}`, {
                    headers: { 'Authorization': `Bearer ${AIRTABLE_API_KEY}` }
                })
            ]);

            const mandantData = await mandantRes.json();
            const mandataireData = await mandataireRes.json();

            const mandant = {
                nom: mandantData.fields['Nom'],
                civilite: mandantData.fields['Civilité'],
                email: mandantData.fields['Email'],
                phone: mandantData.fields['Téléphone'],
                bureau: mandantData.fields['Bureau de Vote']
            };

            const mandataire = {
                nom: mandataireData.fields['Nom'],
                civilite: mandataireData.fields['Civilité'],
                email: mandataireData.fields['Email'],
                phone: mandataireData.fields['Téléphone'],
                dateNaissance: mandataireData.fields['Date de Naissance']
            };

            // Send notification emails
            await sendMatchEmails(mandant, mandataire, RESEND_API_KEY);

            return {
                statusCode: 200,
                headers: corsHeaders,
                body: JSON.stringify({
                    success: true,
                    matchId: matchResult.id,
                    message: 'Match créé avec succès'
                })
            };
        }

        // PATCH: Update match status
        if (event.httpMethod === 'PATCH') {
            const { matchId, status, notes } = JSON.parse(event.body);

            if (!matchId) {
                return {
                    statusCode: 400,
                    headers: corsHeaders,
                    body: JSON.stringify({ error: 'matchId requis' })
                };
            }

            // Validate status against whitelist
            if (status && !VALID_STATUSES.includes(status)) {
                return {
                    statusCode: 400,
                    headers: corsHeaders,
                    body: JSON.stringify({ error: 'Statut invalide' })
                };
            }

            const updateFields = {};
            if (status) updateFields['Status'] = status;
            if (notes !== undefined) updateFields['Notes'] = notes;

            // Update match
            const matchResponse = await fetch(
                `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_MATCHES_TABLE)}/${matchId}`,
                {
                    method: 'PATCH',
                    headers: {
                        'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ fields: updateFields })
                }
            );

            if (!matchResponse.ok) {
                throw new Error('Failed to update match');
            }

            const matchResult = await matchResponse.json();

            // If status changed, update procurations too
            if (status) {
                const mandantId = matchResult.fields['Mandant'] ? matchResult.fields['Mandant'][0] : null;
                const mandataireId = matchResult.fields['Mandataire'] ? matchResult.fields['Mandataire'][0] : null;

                if (mandantId && mandataireId) {
                    const newProcStatus = status === 'Annulé' ? 'En attente' : status;
                    await Promise.all([mandantId, mandataireId].map(id =>
                        fetch(
                            `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_PROCURATIONS_TABLE)}/${id}`,
                            {
                                method: 'PATCH',
                                headers: {
                                    'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
                                    'Content-Type': 'application/json'
                                },
                                body: JSON.stringify({
                                    fields: { 'Statut': newProcStatus }
                                })
                            }
                        )
                    ));
                }
            }

            return {
                statusCode: 200,
                headers: corsHeaders,
                body: JSON.stringify({
                    success: true,
                    message: 'Match mis à jour'
                })
            };
        }

        return {
            statusCode: 405,
            headers: corsHeaders,
            body: JSON.stringify({ error: 'Method Not Allowed' })
        };

    } catch (error) {
        console.error('Match error:', error);
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({ error: 'Erreur serveur interne' })
        };
    }
};
