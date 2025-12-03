// Netlify Function to handle contact form submission to Airtable with Resend email notifications
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

        // Validate security check (simple math captcha)
        if (!formData.securityAnswer || parseInt(formData.securityAnswer) !== formData.expectedAnswer) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'Vérification de sécurité incorrecte' })
            };
        }

        // Environment variables
        const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
        const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
        const AIRTABLE_TABLE_NAME = process.env.AIRTABLE_TABLE_NAME;
        const RESEND_API_KEY = process.env.RESEND_API_KEY;

        if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID || !AIRTABLE_TABLE_NAME) {
            return {
                statusCode: 500,
                body: JSON.stringify({ error: 'Configuration serveur manquante' })
            };
        }

        // Extract IP address from headers
        const clientIP = event.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
                         event.headers['x-real-ip'] ||
                         event.headers['client-ip'] ||
                         'Non disponible';

        // Get geo-location from Netlify's geo headers (if available)
        const geoCountry = event.headers['x-country'] || event.headers['x-nf-country'] || '';
        const geoCity = event.headers['x-city'] || event.headers['x-nf-city'] || '';
        const geoRegion = event.headers['x-region'] || event.headers['x-nf-region'] || '';

        const geoLocation = [geoCity, geoRegion, geoCountry].filter(Boolean).join(', ') || 'Non disponible';

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

        // Prepare data for Airtable
        const airtableData = {
            fields: {
                'Nom': formData.name,
                'Email': formData.email,
                'Téléphone': formData.phone || '',
                'Message': formData.message,
                'Newsletter': formData.newsletter || false,
                'GDPR Consent': formData.gdpr || false,
                'Date': submissionDate.toISOString(),
                'Adresse IP': clientIP,
                'Localisation': geoLocation
            }
        };

        // Send to Airtable
        const airtableResponse = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_NAME}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(airtableData)
        });

        if (!airtableResponse.ok) {
            const errorData = await airtableResponse.json();
            console.error('Airtable error:', errorData);

            let errorMessage = 'Erreur Airtable: ';
            if (errorData.error && errorData.error.type === 'INVALID_REQUEST_UNKNOWN') {
                errorMessage = 'Champs Airtable incorrects. Vérifiez les noms des champs.';
            } else if (errorData.error && errorData.error.message) {
                errorMessage = errorData.error.message;
            }

            return {
                statusCode: airtableResponse.status,
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
                `;

                // 1. Acknowledgment email to the sender
                const acknowledgmentHtml = `
                <!DOCTYPE html>
                <html lang="fr">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Confirmation de réception</title>
                    <style>${emailStyles}</style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>Pour Senlis en Confiance</h1>
                        </div>
                        <div class="content">
                            <h2>Bonjour ${formData.name.split(' ')[0]},</h2>

                            <p>Nous avons bien reçu votre message et nous vous en remercions !</p>

                            <div class="highlight-box">
                                <strong>📬 Votre message a été enregistré le ${formattedDate}</strong>
                            </div>

                            <p>Notre équipe prendra connaissance de votre demande dans les meilleurs délais et vous répondra rapidement.</p>

                            <div class="message-box">
                                <p class="info-label">Récapitulatif de votre message :</p>
                                <p><em>"${formData.message.substring(0, 200)}${formData.message.length > 200 ? '...' : ''}"</em></p>
                            </div>

                            ${formData.newsletter ? '<p class="green-accent">✓ Vous êtes inscrit(e) à notre newsletter de campagne.</p>' : ''}

                            <p>À très bientôt,</p>
                            <p><strong>L'équipe Pour Senlis en Confiance</strong><br>
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
                    <title>Nouveau message - Formulaire de contact</title>
                    <style>${emailStyles}</style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>📩 Nouveau message reçu</h1>
                        </div>
                        <div class="content">
                            <h2>Un nouveau message a été envoyé via le site</h2>

                            <div class="highlight-box">
                                <strong>📅 Reçu le ${formattedDate}</strong>
                            </div>

                            <div class="message-box">
                                <div class="info-row">
                                    <span class="info-label">Nom :</span> ${formData.name}
                                </div>
                                <div class="info-row">
                                    <span class="info-label">Email :</span> <a href="mailto:${formData.email}">${formData.email}</a>
                                </div>
                                <div class="info-row">
                                    <span class="info-label">Téléphone :</span> ${formData.phone || 'Non renseigné'}
                                </div>
                                <div class="info-row">
                                    <span class="info-label">Newsletter :</span> ${formData.newsletter ? '✓ Inscrit' : '✗ Non inscrit'}
                                </div>
                            </div>

                            <h3 style="color: #0d3d5c;">Message :</h3>
                            <div class="message-box" style="background-color: #fff; border-left: 4px solid #6cb13e;">
                                <p style="white-space: pre-wrap;">${formData.message}</p>
                            </div>

                            <h3 style="color: #0d3d5c;">Informations techniques :</h3>
                            <div class="message-box" style="font-size: 13px; color: #6c757d;">
                                <div class="info-row">
                                    <span class="info-label">Adresse IP :</span> ${clientIP}
                                </div>
                                <div class="info-row">
                                    <span class="info-label">Localisation :</span> ${geoLocation}
                                </div>
                                <div class="info-row">
                                    <span class="info-label">ID Airtable :</span> ${airtableResult.id}
                                </div>
                                <div class="info-row">
                                    <span class="info-label">Consentement RGPD :</span> ${formData.gdpr ? '✓ Accepté' : '✗ Non accepté'}
                                </div>
                            </div>

                            <a href="mailto:${formData.email}?subject=Re: Votre message sur Pour Senlis en Confiance" class="btn">Répondre à ${formData.name.split(' ')[0]}</a>
                        </div>
                        <div class="footer">
                            <p>Notification automatique - Pour Senlis en Confiance</p>
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
                        from: 'Pour Senlis en Confiance <contact@poursenlisenconfiance.fr>',
                        to: [formData.email],
                        subject: 'Confirmation de réception de votre message - Pour Senlis en Confiance',
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
                        subject: `Nouveau message de ${formData.name}`,
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
            body: JSON.stringify({
                success: true,
                message: 'Message envoyé avec succès',
                id: airtableResult.id
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
