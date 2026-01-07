// Netlify Function to handle consultation form submission to Airtable with Resend email notifications

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
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Credentials': 'true'
    };
}

// Email validation
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

exports.handler = async (event) => {
    const corsHeaders = getCorsHeaders(event);

    // Handle preflight OPTIONS request (required for CORS in Edge)
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
        const formData = JSON.parse(event.body);

        // Validate required fields
        if (!formData.nom || !formData.email || !formData.statut || !formData.age || !formData.quartier || !formData.idee || !formData.gdpr) {
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({ error: 'Champs requis manquants' })
            };
        }

        // Validate email format
        if (!isValidEmail(formData.email)) {
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({ error: 'Format d\'email invalide' })
            };
        }

        // Validate security check (simple math captcha)
        if (!formData.securityAnswer || parseInt(formData.securityAnswer) !== formData.expectedAnswer) {
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({ error: 'Vérification de sécurité incorrecte' })
            };
        }

        // Environment variables - Use existing Contacts table
        const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
        const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
        const AIRTABLE_TABLE_NAME = process.env.AIRTABLE_TABLE_NAME; // Existing Contacts table
        const RESEND_API_KEY = process.env.RESEND_API_KEY;

        if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID || !AIRTABLE_TABLE_NAME) {
            return {
                statusCode: 500,
                headers: corsHeaders,
                body: JSON.stringify({ error: 'Configuration serveur manquante' })
            };
        }

        // Extract IP address from headers
        const clientIP = event.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
                         event.headers['x-real-ip'] ||
                         event.headers['client-ip'] ||
                         'Non disponible';

        // IP Lookup using ip-api.com (free, no API key needed)
        let ipInfo = {
            city: '',
            region: '',
            country: '',
            isp: '',
            org: '',
            timezone: '',
            lat: '',
            lon: ''
        };

        try {
            if (clientIP && clientIP !== 'Non disponible') {
                const ipLookup = await fetch(`http://ip-api.com/json/${clientIP}?fields=status,country,regionName,city,isp,org,timezone,lat,lon`);
                const ipData = await ipLookup.json();
                if (ipData.status === 'success') {
                    ipInfo = {
                        city: ipData.city || '',
                        region: ipData.regionName || '',
                        country: ipData.country || '',
                        isp: ipData.isp || '',
                        org: ipData.org || '',
                        timezone: ipData.timezone || '',
                        lat: ipData.lat || '',
                        lon: ipData.lon || ''
                    };
                }
            }
        } catch (ipError) {
            console.error('IP lookup error:', ipError);
        }

        // Build detailed location string
        const geoLocation = [ipInfo.city, ipInfo.region, ipInfo.country].filter(Boolean).join(', ') || 'Non disponible';
        const ispInfo = [ipInfo.isp, ipInfo.org].filter(Boolean).join(' / ') || 'Non disponible';
        const coordinates = (ipInfo.lat && ipInfo.lon) ? `${ipInfo.lat}, ${ipInfo.lon}` : 'Non disponible';

        // Current date/time
        const submissionDate = new Date();
        const formattedDate = submissionDate.toLocaleDateString('fr-FR', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        // Combine idée and message into Message field
        let fullMessage = formData.idee;
        if (formData.message) {
            fullMessage += `\n\n--- Message complémentaire ---\n${formData.message}`;
        }

        // Prepare data for Airtable - Using existing Contacts table with all columns
        const airtableData = {
            fields: {
                'Nom': formData.nom,
                'Email': formData.email,
                'Téléphone': formData.phone || '',
                'Message': fullMessage,
                'Newsletter': formData.newsletter || false,
                'GDPR Consent': formData.gdpr || false,
                'Date': submissionDate.toISOString(),
                'Adresse IP': clientIP,
                'Localisation': `${geoLocation} | FAI: ${ispInfo} | GPS: ${coordinates} | TZ: ${ipInfo.timezone || 'N/A'}`,
                'Status': formData.statut,
                'Tranche d\'âge': formData.age,
                'Quartier': formData.quartier
            }
        };

        // Send to Airtable - Using existing Contacts table
        const airtableResponse = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_TABLE_NAME)}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(airtableData)
        });

        if (!airtableResponse.ok) {
            const errorText = await airtableResponse.text();
            console.error('Airtable error response:', errorText);

            let errorData;
            try {
                errorData = JSON.parse(errorText);
            } catch (e) {
                errorData = { error: { message: errorText } };
            }

            let errorMessage = 'Erreur Airtable: ';
            if (errorData.error && errorData.error.type === 'INVALID_REQUEST_UNKNOWN') {
                errorMessage = 'Champs Airtable incorrects. Vérifiez les noms des champs.';
            } else if (errorData.error && errorData.error.message) {
                errorMessage = errorData.error.message;
            }

            return {
                statusCode: airtableResponse.status,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    error: errorMessage,
                    details: errorData
                })
            };
        }

        const airtableResult = await airtableResponse.json();

        // Send emails via Resend if API key is configured
        if (RESEND_API_KEY) {
            try {
                // Email template styles (site colors)
                const emailStyles = `
                    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f8f9fa; }
                    .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
                    .header { background: linear-gradient(135deg, #0d3d5c 0%, #3d9dd9 100%); padding: 30px 20px; text-align: center; }
                    .header img { max-width: 120px; height: auto; }
                    .header h1 { color: #ffffff; margin: 15px 0 0 0; font-size: 24px; }
                    .content { padding: 30px 20px; color: #2c3e50; line-height: 1.6; }
                    .content h2 { color: #0d3d5c; margin-top: 0; }
                    .highlight-box { background-color: #f0f7fa; border-left: 4px solid #3d9dd9; padding: 15px; margin: 20px 0; }
                    .message-box { background-color: #f8f9fa; border: 1px solid #dee2e6; border-radius: 8px; padding: 20px; margin: 20px 0; }
                    .info-row { margin: 10px 0; }
                    .info-label { font-weight: bold; color: #0d3d5c; }
                    .footer { background-color: #0d3d5c; color: #ffffff; padding: 20px; text-align: center; font-size: 14px; }
                    .footer a { color: #a8d98f; text-decoration: none; }
                    .btn { display: inline-block; background-color: #6cb13e; color: #ffffff; padding: 12px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; margin-top: 15px; }
                    .green-accent { color: #6cb13e; }
                    .quartier-badge { display: inline-block; background-color: #3d9dd9; color: white; padding: 5px 15px; border-radius: 15px; font-size: 14px; margin-bottom: 10px; }
                `;

                // 1. Acknowledgment email to the sender
                const acknowledgmentHtml = `
                <!DOCTYPE html>
                <html lang="fr">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Merci pour votre contribution</title>
                    <style>${emailStyles}</style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>Pour Senlis en Confiance</h1>
                        </div>
                        <div class="content">
                            <h2>Bonjour ${formData.nom.split(' ')[0]},</h2>

                            <p>Merci pour votre contribution à notre consultation citoyenne !</p>

                            <div class="highlight-box">
                                <strong>Votre idée a été enregistrée le ${formattedDate}</strong>
                            </div>

                            <p>Votre avis compte pour construire ensemble l'avenir de Senlis. Notre équipe prendra connaissance de votre suggestion avec attention.</p>

                            <div class="message-box">
                                <span class="quartier-badge">${formData.quartier}</span>
                                <p class="info-label">Votre idée :</p>
                                <p><em>"${formData.idee.substring(0, 300)}${formData.idee.length > 300 ? '...' : ''}"</em></p>
                                ${formData.message ? `<p class="info-label" style="margin-top: 15px;">Message complémentaire :</p><p><em>"${formData.message.substring(0, 200)}${formData.message.length > 200 ? '...' : ''}"</em></p>` : ''}
                            </div>

                            ${formData.newsletter ? '<p class="green-accent">Vous êtes inscrit(e) à notre newsletter de campagne.</p>' : ''}

                            <p>À très bientôt,</p>
                            <p><strong>L'équipe Pour Senlis en Confiance avec Pascale Loiseleur</strong><br>
                            <em>Pascale Loiseleur - Candidate aux élections municipales 2026</em></p>

                            <a href="https://poursenlisenconfiance.fr" class="btn">Visiter notre site</a>
                        </div>
                        <div class="footer">
                            <p>Pour Senlis en Confiance - Élections Municipales 2026</p>
                            <p><a href="https://poursenlisenconfiance.fr/mentions-legales.html">Mentions légales</a> | <a href="https://poursenlisenconfiance.fr">www.poursenlisenconfiance.fr</a></p>
                        </div>
                    </div>
                </body>
                </html>
                `;

                // 2. Notification email to the campaign team
                const notificationHtml = `
                <!DOCTYPE html>
                <html lang="fr">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Nouvelle idée - Consultation Citoyenne</title>
                    <style>${emailStyles}</style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>Nouvelle idée citoyenne</h1>
                        </div>
                        <div class="content">
                            <h2>Une nouvelle contribution a été soumise</h2>

                            <div class="highlight-box">
                                <strong>Reçue le ${formattedDate}</strong>
                            </div>

                            <div class="message-box">
                                <span class="quartier-badge">${formData.quartier}</span>
                                <div class="info-row">
                                    <span class="info-label">Nom :</span> ${formData.nom}
                                </div>
                                <div class="info-row">
                                    <span class="info-label">Email :</span> <a href="mailto:${formData.email}">${formData.email}</a>
                                </div>
                                <div class="info-row">
                                    <span class="info-label">Statut :</span> ${formData.statut}
                                </div>
                                <div class="info-row">
                                    <span class="info-label">Tranche d'âge :</span> ${formData.age}
                                </div>
                                <div class="info-row">
                                    <span class="info-label">Newsletter :</span> ${formData.newsletter ? 'Inscrit' : 'Non inscrit'}
                                </div>
                            </div>

                            <h3 style="color: #0d3d5c;">Idée / Suggestion :</h3>
                            <div class="message-box" style="background-color: #fff; border-left: 4px solid #6cb13e;">
                                <p style="white-space: pre-wrap;">${formData.idee}</p>
                            </div>

                            ${formData.message ? `
                            <h3 style="color: #0d3d5c;">Message complémentaire :</h3>
                            <div class="message-box">
                                <p style="white-space: pre-wrap;">${formData.message}</p>
                            </div>
                            ` : ''}

                            <h3 style="color: #0d3d5c;">Informations techniques :</h3>
                            <div class="message-box" style="font-size: 13px; color: #6c757d;">
                                <div class="info-row">
                                    <span class="info-label">Adresse IP :</span> ${clientIP}
                                </div>
                                <div class="info-row">
                                    <span class="info-label">Localisation :</span> ${geoLocation}
                                </div>
                                <div class="info-row">
                                    <span class="info-label">FAI / Organisation :</span> ${ispInfo}
                                </div>
                                <div class="info-row">
                                    <span class="info-label">Coordonnées GPS :</span> ${coordinates}
                                </div>
                                <div class="info-row">
                                    <span class="info-label">Fuseau horaire :</span> ${ipInfo.timezone || 'Non disponible'}
                                </div>
                                <div class="info-row">
                                    <span class="info-label">ID Airtable :</span> ${airtableResult.id}
                                </div>
                                <div class="info-row">
                                    <span class="info-label">Consentement RGPD :</span> ${formData.gdpr ? 'Accepté' : 'Non accepté'}
                                </div>
                            </div>

                            <a href="mailto:${formData.email}?subject=Re: Votre idée pour ${formData.quartier}" class="btn">Répondre à ${formData.nom.split(' ')[0]}</a>
                        </div>
                        <div class="footer">
                            <p>Notification automatique - Pour Senlis en Confiance avec Pascale Loiseleur</p>
                            <p><a href="https://airtable.com">Voir dans Airtable</a></p>
                        </div>
                    </div>
                </body>
                </html>
                `;

                // Send acknowledgment email to the sender
                await fetch('https://api.resend.com/emails', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${RESEND_API_KEY}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        from: 'Pour Senlis en Confiance avec Pascale Loiseleur <contact@poursenlisenconfiance.fr>',
                        to: [formData.email],
                        subject: 'Merci pour votre contribution - Consultation Citoyenne',
                        html: acknowledgmentHtml
                    })
                });

                // Send notification email to the campaign team
                await fetch('https://api.resend.com/emails', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${RESEND_API_KEY}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        from: 'Site Web PSEC <contact@poursenlisenconfiance.fr>',
                        to: ['contact@poursenlisenconfiance.fr'],
                        replyTo: formData.email,
                        subject: `Nouvelle idée de ${formData.nom} - ${formData.quartier}`,
                        html: notificationHtml
                    })
                });

                console.log('Emails sent successfully');
            } catch (emailError) {
                // Log email error but don't fail the form submission
                console.error('Email sending error:', emailError);
            }
        }

        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify({
                success: true,
                message: 'Votre idée a été enregistrée avec succès',
                id: airtableResult.id
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
