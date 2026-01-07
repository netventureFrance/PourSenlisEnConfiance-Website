// Netlify Function for confirming procuration matches via email link
const crypto = require('crypto');

exports.handler = async (event) => {
    const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
    const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
    const AIRTABLE_MATCHES_TABLE = process.env.AIRTABLE_MATCHES_TABLE || 'Matches';
    const AIRTABLE_PROCURATIONS_TABLE = process.env.AIRTABLE_PROCURATIONS_TABLE || 'Procurations';
    const RESEND_API_KEY = process.env.RESEND_API_KEY;

    // Only GET requests allowed
    if (event.httpMethod !== 'GET') {
        return {
            statusCode: 405,
            headers: { 'Content-Type': 'text/html; charset=utf-8' },
            body: generateHtmlPage('Erreur', 'Méthode non autorisée', 'error')
        };
    }

    const token = event.queryStringParameters?.token;

    if (!token) {
        return {
            statusCode: 400,
            headers: { 'Content-Type': 'text/html; charset=utf-8' },
            body: generateHtmlPage('Erreur', 'Token manquant', 'error')
        };
    }

    try {
        // Search for match by token (could be mandant or mandataire token)
        const searchFormula = `OR({Token Mandant}='${token}',{Token Mandataire}='${token}')`;
        const searchUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_MATCHES_TABLE)}?filterByFormula=${encodeURIComponent(searchFormula)}`;

        const matchResponse = await fetch(searchUrl, {
            headers: { 'Authorization': `Bearer ${AIRTABLE_API_KEY}` }
        });

        if (!matchResponse.ok) {
            throw new Error('Erreur lors de la recherche');
        }

        const matchData = await matchResponse.json();

        if (!matchData.records || matchData.records.length === 0) {
            return {
                statusCode: 404,
                headers: { 'Content-Type': 'text/html; charset=utf-8' },
                body: generateHtmlPage('Lien invalide', 'Ce lien de confirmation n\'est plus valide ou a déjà été utilisé.', 'error')
            };
        }

        const match = matchData.records[0];
        const matchId = match.id;
        const fields = match.fields;

        // Determine which party is confirming
        const isMandant = fields['Token Mandant'] === token;
        const isMandataire = fields['Token Mandataire'] === token;

        // Check if already confirmed
        const alreadyConfirmedField = isMandant ? 'Mandant Confirmé' : 'Mandataire Confirmé';
        if (fields[alreadyConfirmedField]) {
            return {
                statusCode: 200,
                headers: { 'Content-Type': 'text/html; charset=utf-8' },
                body: generateHtmlPage('Déjà confirmé', 'Vous avez déjà confirmé cette procuration. Merci !', 'info')
            };
        }

        // Update confirmation status
        const updateFields = {
            [alreadyConfirmedField]: true
        };

        // Check if both will be confirmed after this update
        const otherConfirmed = isMandant ? fields['Mandataire Confirmé'] : fields['Mandant Confirmé'];
        const bothConfirmed = otherConfirmed === true;

        if (bothConfirmed) {
            updateFields['Status'] = 'Confirmé';
        }

        // Update the match record
        await fetch(
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

        // If both confirmed, update procurations status and send final emails
        if (bothConfirmed) {
            const mandantId = fields['Mandant']?.[0];
            const mandataireId = fields['Mandataire']?.[0];

            // Update procurations status to "Confirmé"
            if (mandantId && mandataireId) {
                await Promise.all([mandantId, mandataireId].map(id =>
                    fetch(
                        `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_PROCURATIONS_TABLE)}/${id}`,
                        {
                            method: 'PATCH',
                            headers: {
                                'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({ fields: { 'Statut': 'Confirmé' } })
                        }
                    )
                ));

                // Fetch contact info for final emails
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
                    prenoms: mandantData.fields['Prénoms'],
                    civilite: mandantData.fields['Civilité'],
                    email: mandantData.fields['Email'],
                    bureau: mandantData.fields['Bureau de Vote']
                };

                const mandataire = {
                    nom: mandataireData.fields['Nom'],
                    prenoms: mandataireData.fields['Prénoms'],
                    civilite: mandataireData.fields['Civilité'],
                    email: mandataireData.fields['Email']
                };

                // Send final confirmation emails
                await sendFinalConfirmationEmails(mandant, mandataire, RESEND_API_KEY);
            }

            return {
                statusCode: 200,
                headers: { 'Content-Type': 'text/html; charset=utf-8' },
                body: generateHtmlPage(
                    'Procuration confirmée !',
                    'Les deux parties ont confirmé. La procuration est maintenant officielle. Vous allez recevoir un email de confirmation.',
                    'success-final'
                )
            };
        }

        // Only one party confirmed so far
        const waitingFor = isMandant ? 'le mandataire' : 'le mandant';
        return {
            statusCode: 200,
            headers: { 'Content-Type': 'text/html; charset=utf-8' },
            body: generateHtmlPage(
                'Confirmation enregistrée !',
                `Merci pour votre confirmation. En attente de la confirmation de ${waitingFor}.`,
                'success'
            )
        };

    } catch (error) {
        console.error('Confirmation error:', error);
        return {
            statusCode: 500,
            headers: { 'Content-Type': 'text/html; charset=utf-8' },
            body: generateHtmlPage('Erreur', 'Une erreur est survenue. Veuillez réessayer ou nous contacter.', 'error')
        };
    }
};

// Format greeting helper
function formatGreeting(person) {
    if (person.civilite) {
        return `${person.civilite} ${person.nom}`;
    }
    if (person.prenoms) {
        const firstPrenom = person.prenoms.split(' ')[0];
        return `${firstPrenom} ${person.nom}`;
    }
    return person.nom;
}

// Send final confirmation emails to both parties
async function sendFinalConfirmationEmails(mandant, mandataire, RESEND_API_KEY) {
    if (!RESEND_API_KEY) return;

    const emailStyles = `
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f8f9fa; }
        .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
        .header { background: linear-gradient(135deg, #6cb13e 0%, #4a9028 100%); padding: 30px 20px; text-align: center; }
        .header h1 { color: #ffffff; margin: 0; font-size: 24px; }
        .content { padding: 30px 20px; color: #2c3e50; line-height: 1.6; }
        .success-box { background-color: #d4edda; border-left: 4px solid #6cb13e; padding: 15px; margin: 20px 0; }
        .info-box { background-color: #f8f9fa; border: 1px solid #dee2e6; border-radius: 8px; padding: 20px; margin: 20px 0; }
        .footer { background-color: #0d3d5c; color: #ffffff; padding: 20px; text-align: center; font-size: 14px; }
        .footer a { color: #a8d98f; text-decoration: none; }
        .checkmark { font-size: 48px; margin-bottom: 10px; }
    `;

    // Email to Mandant
    const mandantHtml = `
    <!DOCTYPE html>
    <html lang="fr">
    <head><meta charset="UTF-8"><style>${emailStyles}</style></head>
    <body>
        <div class="container">
            <div class="header">
                <div class="checkmark">✓</div>
                <h1>Procuration Confirmée</h1>
            </div>
            <div class="content">
                <h2>Bonjour ${formatGreeting(mandant)},</h2>
                <div class="success-box">
                    <strong>Bonne nouvelle !</strong> Votre procuration a été confirmée par les deux parties.
                </div>
                <p>Votre mandataire <strong>${formatGreeting(mandataire)}</strong> votera pour vous.</p>
                <div class="info-box">
                    <h3>Rappels importants :</h3>
                    <ul>
                        <li>Si ce n'est pas déjà fait, établissez la procuration officielle sur <a href="https://www.maprocuration.gouv.fr/">maprocuration.gouv.fr</a></li>
                        <li>Votre mandataire votera dans votre bureau de vote : <strong>${mandant.bureau}</strong></li>
                    </ul>
                </div>
                <p>Merci pour votre confiance et votre participation !</p>
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
            <div class="header">
                <div class="checkmark">✓</div>
                <h1>Procuration Confirmée</h1>
            </div>
            <div class="content">
                <h2>Bonjour ${formatGreeting(mandataire)},</h2>
                <div class="success-box">
                    <strong>Merci !</strong> La procuration a été confirmée par les deux parties.
                </div>
                <p>Vous voterez pour <strong>${formatGreeting(mandant)}</strong>.</p>
                <div class="info-box">
                    <h3>Rappels importants :</h3>
                    <ul>
                        <li>Vous devrez voter dans le bureau de vote du mandant : <strong>${mandant.bureau}</strong></li>
                        <li>N'oubliez pas d'apporter votre pièce d'identité</li>
                        <li>Le mandant établira (ou a déjà établi) la procuration sur maprocuration.gouv.fr</li>
                    </ul>
                </div>
                <p>Merci pour votre engagement citoyen !</p>
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

    try {
        await Promise.all([
            fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${RESEND_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    from: 'Pour Senlis en Confiance avec Pascale Loiseleur <contact@poursenlisenconfiance.fr>',
                    to: [mandant.email],
                    subject: '✓ Procuration confirmée !',
                    html: mandantHtml
                })
            }),
            fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${RESEND_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    from: 'Pour Senlis en Confiance avec Pascale Loiseleur <contact@poursenlisenconfiance.fr>',
                    to: [mandataire.email],
                    subject: '✓ Procuration confirmée !',
                    html: mandataireHtml
                })
            })
        ]);
    } catch (error) {
        console.error('Error sending final confirmation emails:', error);
    }
}

// Generate HTML response page
function generateHtmlPage(title, message, type) {
    const colors = {
        success: { bg: '#d4edda', border: '#6cb13e', icon: '✓' },
        'success-final': { bg: '#d4edda', border: '#6cb13e', icon: '✓✓' },
        error: { bg: '#f8d7da', border: '#dc3545', icon: '✕' },
        info: { bg: '#cce5ff', border: '#0d3d5c', icon: 'ℹ' }
    };
    const color = colors[type] || colors.info;

    return `
    <!DOCTYPE html>
    <html lang="fr">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title} - Pour Senlis en Confiance</title>
        <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                background: linear-gradient(135deg, #0d3d5c 0%, #3d9dd9 100%);
                min-height: 100vh;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 20px;
            }
            .card {
                background: white;
                border-radius: 16px;
                box-shadow: 0 10px 40px rgba(0,0,0,0.2);
                max-width: 500px;
                width: 100%;
                overflow: hidden;
            }
            .header {
                background: ${color.bg};
                border-bottom: 4px solid ${color.border};
                padding: 30px;
                text-align: center;
            }
            .icon {
                font-size: 48px;
                margin-bottom: 15px;
            }
            .header h1 {
                color: #2c3e50;
                font-size: 24px;
            }
            .content {
                padding: 30px;
                text-align: center;
            }
            .content p {
                color: #555;
                font-size: 16px;
                line-height: 1.6;
            }
            .footer {
                background: #f8f9fa;
                padding: 20px;
                text-align: center;
                border-top: 1px solid #dee2e6;
            }
            .footer a {
                color: #0d3d5c;
                text-decoration: none;
                font-weight: bold;
            }
            .footer a:hover {
                text-decoration: underline;
            }
        </style>
    </head>
    <body>
        <div class="card">
            <div class="header">
                <div class="icon">${color.icon}</div>
                <h1>${title}</h1>
            </div>
            <div class="content">
                <p>${message}</p>
            </div>
            <div class="footer">
                <a href="https://poursenlisenconfiance.fr">← Retour au site</a>
            </div>
        </div>
    </body>
    </html>
    `;
}
