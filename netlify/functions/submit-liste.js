// Netlify Function to handle Liste colistiers form submission (create & update)

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

// Phone validation (French format)
function isValidPhone(phone) {
    const phoneRegex = /^(?:(?:\+|00)33|0)\s*[1-9](?:[\s.-]*\d{2}){4}$/;
    return phoneRegex.test(phone.replace(/\s/g, ''));
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
        const formData = JSON.parse(event.body);
        const isUpdate = !!formData.id;

        // For new records, require all fields. For updates, be more flexible.
        if (!isUpdate) {
            const requiredFields = ['nomComplet', 'profession', 'quartier', 'bio', 'message'];
            for (const field of requiredFields) {
                if (!formData[field]) {
                    return {
                        statusCode: 400,
                        headers: corsHeaders,
                        body: JSON.stringify({ error: `Champ requis manquant: ${field}` })
                    };
                }
            }
        } else {
            // For updates, at least nom is required
            if (!formData.nomComplet) {
                return {
                    statusCode: 400,
                    headers: corsHeaders,
                    body: JSON.stringify({ error: 'Le nom est requis' })
                };
            }
        }

        // Validate email format if provided
        if (formData.email && !isValidEmail(formData.email)) {
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({ error: 'Format d\'email invalide' })
            };
        }

        // Validate phone format if provided
        if (formData.telephone && !isValidPhone(formData.telephone)) {
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({ error: 'Format de téléphone invalide' })
            };
        }

        // Environment variables
        const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
        const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
        const AIRTABLE_LISTE_TABLE = process.env.AIRTABLE_LISTE_TABLE || 'Liste';
        const RESEND_API_KEY = process.env.RESEND_API_KEY;

        if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
            return {
                statusCode: 500,
                headers: corsHeaders,
                body: JSON.stringify({ error: 'Configuration serveur manquante (Airtable)' })
            };
        }

        // If updating, first check if record is validated
        if (isUpdate) {
            const checkResponse = await fetch(
                `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_LISTE_TABLE)}/${formData.id}`,
                {
                    headers: {
                        'Authorization': `Bearer ${AIRTABLE_API_KEY}`
                    }
                }
            );

            if (!checkResponse.ok) {
                return {
                    statusCode: 404,
                    headers: corsHeaders,
                    body: JSON.stringify({ error: 'Fiche non trouvée' })
                };
            }

            const existingRecord = await checkResponse.json();
            if (existingRecord.fields['Statut'] === 'Validé') {
                return {
                    statusCode: 403,
                    headers: corsHeaders,
                    body: JSON.stringify({ error: 'Cette fiche a été validée et ne peut plus être modifiée' })
                };
            }
        }

        // Current date/time for email
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
        const airtableFields = {
            'Nom': formData.nomComplet
        };

        // Add fields if provided (for both create and update)
        if (formData.profession) airtableFields['Profession'] = formData.profession;
        if (formData.quartier) airtableFields['Quartier'] = formData.quartier;
        if (formData.bio) airtableFields['Bio'] = formData.bio;
        if (formData.message) airtableFields['Message Personnel'] = formData.message;
        if (formData.age) airtableFields['Âge'] = formData.age;
        if (formData.email) airtableFields['Email'] = formData.email;
        if (formData.telephone) airtableFields['Téléphone'] = formData.telephone;
        if (formData.facebook) airtableFields['Facebook'] = formData.facebook;
        if (formData.linkedin) airtableFields['LinkedIn'] = formData.linkedin;
        if (formData.instagram) airtableFields['Instagram'] = formData.instagram;

        // Handle photo - if it's a new base64 image (starts with data:), we need to handle it
        // If it's a URL (existing photo), we keep it as is
        if (formData.photo && formData.photo.startsWith('data:')) {
            // New photo uploaded - for now, we'll store the URL directly
            // In a production setup, you'd upload to a storage service first
            // Airtable accepts URLs, so we'd need to host the image somewhere

            // For now, skip new photo uploads in edit mode
            // Photos should be managed separately or through a proper upload service
            console.log('New photo upload detected - would need image hosting service');
        }

        // For new records, set initial status and GDPR consent
        if (!isUpdate) {
            airtableFields['Statut'] = 'À valider';
            airtableFields['GDPR Consent'] = formData.gdpr || false;
        }

        const airtableData = { fields: airtableFields };

        // Determine API endpoint and method
        const apiUrl = isUpdate
            ? `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_LISTE_TABLE)}/${formData.id}`
            : `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_LISTE_TABLE)}`;

        const airtableResponse = await fetch(apiUrl, {
            method: isUpdate ? 'PATCH' : 'POST',
            headers: {
                'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(airtableData)
        });

        if (!airtableResponse.ok) {
            const errorText = await airtableResponse.text();
            console.error('Airtable error response:', errorText);
            return {
                statusCode: airtableResponse.status,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                body: JSON.stringify({ error: 'Erreur lors de l\'enregistrement' })
            };
        }

        const airtableResult = await airtableResponse.json();

        // Send notification email to team (only for new records)
        if (!isUpdate && RESEND_API_KEY) {
            try {
                const emailStyles = `
                    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f8f9fa; }
                    .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
                    .header { background: linear-gradient(135deg, #0d3d5c 0%, #3d9dd9 100%); padding: 30px 20px; text-align: center; }
                    .header h1 { color: #ffffff; margin: 0; font-size: 24px; }
                    .content { padding: 30px 20px; color: #2c3e50; line-height: 1.6; }
                    .highlight-box { background-color: #f0f7fa; border-left: 4px solid #6cb13e; padding: 15px; margin: 20px 0; }
                    .info-box { background-color: #f8f9fa; border: 1px solid #dee2e6; border-radius: 8px; padding: 20px; margin: 20px 0; }
                    .info-row { margin: 8px 0; }
                    .info-label { font-weight: bold; color: #0d3d5c; }
                    .bio-text { background: #fff; padding: 15px; border-left: 3px solid #3d9dd9; margin: 10px 0; font-style: italic; }
                    .footer { background-color: #0d3d5c; color: #ffffff; padding: 20px; text-align: center; font-size: 14px; }
                    .btn { display: inline-block; background-color: #6cb13e; color: #ffffff; padding: 12px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; margin-top: 15px; }
                `;

                const prenom = formData.nomComplet.split(' ')[0];

                const notificationHtml = `
                <!DOCTYPE html>
                <html lang="fr">
                <head>
                    <meta charset="UTF-8">
                    <style>${emailStyles}</style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>Nouvelle fiche colistier</h1>
                        </div>
                        <div class="content">
                            <div class="highlight-box">
                                <strong>Reçue le ${formattedDate}</strong>
                            </div>

                            <div class="info-box">
                                <div class="info-row"><span class="info-label">Nom :</span> ${formData.nomComplet}</div>
                                ${formData.age ? `<div class="info-row"><span class="info-label">Âge :</span> ${formData.age} ans</div>` : ''}
                                <div class="info-row"><span class="info-label">Profession :</span> ${formData.profession}</div>
                                <div class="info-row"><span class="info-label">Quartier :</span> ${formData.quartier}</div>
                            </div>

                            <h3 style="color: #0d3d5c;">Biographie</h3>
                            <div class="bio-text">${formData.bio}</div>

                            <h3 style="color: #0d3d5c;">Message personnel</h3>
                            <div class="bio-text">${formData.message}</div>

                            <div class="info-box" style="font-size: 13px; color: #6c757d;">
                                <div class="info-row"><span class="info-label">ID Airtable :</span> ${airtableResult.id}</div>
                            </div>

                            ${formData.email ? `<p style="text-align: center;">
                                <a href="mailto:${formData.email}?subject=Votre fiche colistier - Pour Senlis en Confiance" class="btn" style="color: #ffffff !important;">Contacter ${prenom}</a>
                            </p>` : ''}
                        </div>
                        <div class="footer">
                            <p>Notification automatique - Espace Colistiers</p>
                        </div>
                    </div>
                </body>
                </html>
                `;

                const notificationEmailData = {
                    from: 'Site Web PSEC <contact@poursenlisenconfiance.fr>',
                    to: ['contact@poursenlisenconfiance.fr'],
                    subject: `[Liste] Nouvelle fiche - ${formData.nomComplet}`,
                    html: notificationHtml
                };
                if (formData.email) {
                    notificationEmailData.replyTo = formData.email;
                }

                await fetch('https://api.resend.com/emails', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${RESEND_API_KEY}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(notificationEmailData)
                });

                console.log('Notification email sent');
            } catch (emailError) {
                console.error('Email sending error:', emailError);
            }
        }

        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify({
                success: true,
                message: isUpdate
                    ? 'Votre fiche a été mise à jour.'
                    : 'Votre fiche a été créée avec succès.',
                id: airtableResult.id,
                isUpdate: isUpdate
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
