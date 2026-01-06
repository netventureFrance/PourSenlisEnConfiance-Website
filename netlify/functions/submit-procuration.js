// Netlify Function to handle procuration form submission to Airtable with matching logic

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
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
        const formData = JSON.parse(event.body);

        // Validate required fields
        if (!formData.nom || !formData.email || !formData.phone || !formData.bureau || !formData.quartier || !formData.type || !formData.gdpr) {
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({ error: 'Champs requis manquants' })
            };
        }

        // Validate at least one tour is selected
        if (!formData.tour1 && !formData.tour2) {
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({ error: 'Veuillez sélectionner au moins un tour' })
            };
        }

        // Validate security check
        if (!formData.securityAnswer || parseInt(formData.securityAnswer) !== formData.expectedAnswer) {
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({ error: 'Vérification de sécurité incorrecte' })
            };
        }

        // Environment variables
        const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
        const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
        const AIRTABLE_PROCURATIONS_TABLE = process.env.AIRTABLE_PROCURATIONS_TABLE || 'Procurations';
        const RESEND_API_KEY = process.env.RESEND_API_KEY;

        if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
            return {
                statusCode: 500,
                headers: corsHeaders,
                body: JSON.stringify({ error: 'Configuration serveur manquante' })
            };
        }

        // Extract IP address
        const clientIP = event.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
                         event.headers['x-real-ip'] ||
                         event.headers['client-ip'] ||
                         'Non disponible';

        // IP Lookup
        let ipInfo = { city: '', region: '', country: '' };
        try {
            if (clientIP && clientIP !== 'Non disponible') {
                const ipLookup = await fetch(`http://ip-api.com/json/${clientIP}?fields=status,country,regionName,city`);
                const ipData = await ipLookup.json();
                if (ipData.status === 'success') {
                    ipInfo = {
                        city: ipData.city || '',
                        region: ipData.regionName || '',
                        country: ipData.country || ''
                    };
                }
            }
        } catch (ipError) {
            console.error('IP lookup error:', ipError);
        }

        const geoLocation = [ipInfo.city, ipInfo.region, ipInfo.country].filter(Boolean).join(', ') || 'Non disponible';

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

        // Build tours array
        const tours = [];
        if (formData.tour1) tours.push('1er tour (15 mars)');
        if (formData.tour2) tours.push('2e tour (22 mars)');

        // Format date of birth for display
        let dateNaissanceFormatted = '';
        if (formData.dateNaissance) {
            const dob = new Date(formData.dateNaissance);
            dateNaissanceFormatted = dob.toLocaleDateString('fr-FR', {
                day: 'numeric',
                month: 'long',
                year: 'numeric'
            });
        }

        // Prepare data for Airtable
        const airtableFields = {
            'Nom': formData.nom,
            'Email': formData.email,
            'Téléphone': formData.phone,
            'Type': formData.type, // 'Mandant' or 'Mandataire'
            'Bureau de Vote': formData.bureau,
            'Quartier': formData.quartier,
            'Tours': tours.join(', '),
            'Message': formData.message || '',
            'Statut': 'En attente',
            'Date': submissionDate.toISOString(),
            'GDPR Consent': formData.gdpr || false,
            'Adresse IP': clientIP,
            'Localisation': geoLocation
        };

        // Only add optional fields if they have values (Airtable rejects empty strings for some field types)
        if (formData.dateNaissance) {
            airtableFields['Date de Naissance'] = formData.dateNaissance;
        }
        if (formData.numeroElecteur) {
            airtableFields['Numéro Électeur'] = formData.numeroElecteur;
        }
        // Mandataire-specific fields for maprocuration.gouv.fr
        if (formData.civilite) {
            airtableFields['Civilité'] = formData.civilite;
        }
        if (formData.nomNaissance) {
            airtableFields['Nom de Naissance'] = formData.nomNaissance;
        }
        if (formData.prenoms) {
            airtableFields['Prénoms'] = formData.prenoms;
        }

        const airtableData = { fields: airtableFields };

        // Send to Airtable
        const airtableResponse = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_PROCURATIONS_TABLE)}`, {
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
            return {
                statusCode: airtableResponse.status,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                body: JSON.stringify({ error: 'Erreur lors de l\'enregistrement' })
            };
        }

        const airtableResult = await airtableResponse.json();

        // Search for potential matches
        let potentialMatches = [];
        const oppositeType = formData.type === 'Mandant' ? 'Mandataire' : 'Mandant';

        try {
            // Search for opposite type in the same bureau de vote with status "En attente"
            const filterFormula = `AND({Type}='${oppositeType}', {Statut}='En attente', OR(FIND('${tours[0] || ''}', {Tours}), FIND('${tours[1] || ''}', {Tours})))`;

            const searchResponse = await fetch(
                `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_PROCURATIONS_TABLE)}?filterByFormula=${encodeURIComponent(filterFormula)}`,
                {
                    headers: {
                        'Authorization': `Bearer ${AIRTABLE_API_KEY}`
                    }
                }
            );

            if (searchResponse.ok) {
                const searchResult = await searchResponse.json();

                // Sort: same bureau first, then same quartier
                potentialMatches = searchResult.records
                    .map(record => ({
                        id: record.id,
                        nom: record.fields['Nom'],
                        email: record.fields['Email'],
                        phone: record.fields['Téléphone'],
                        dateNaissance: record.fields['Date de Naissance'],
                        numeroElecteur: record.fields['Numéro Électeur'],
                        bureau: record.fields['Bureau de Vote'],
                        quartier: record.fields['Quartier'],
                        tours: record.fields['Tours'],
                        sameBureau: record.fields['Bureau de Vote']?.toLowerCase() === formData.bureau.toLowerCase(),
                        sameQuartier: record.fields['Quartier'] === formData.quartier
                    }))
                    .sort((a, b) => {
                        // Same bureau first
                        if (a.sameBureau && !b.sameBureau) return -1;
                        if (!a.sameBureau && b.sameBureau) return 1;
                        // Then same quartier
                        if (a.sameQuartier && !b.sameQuartier) return -1;
                        if (!a.sameQuartier && b.sameQuartier) return 1;
                        return 0;
                    })
                    .slice(0, 5); // Limit to 5 matches
            }
        } catch (searchError) {
            console.error('Search error:', searchError);
        }

        // Send emails via Resend
        if (RESEND_API_KEY) {
            try {
                const emailStyles = `
                    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f8f9fa; }
                    .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
                    .header { background: linear-gradient(135deg, #0d3d5c 0%, #3d9dd9 100%); padding: 30px 20px; text-align: center; }
                    .header h1 { color: #ffffff; margin: 0; font-size: 24px; }
                    .content { padding: 30px 20px; color: #2c3e50; line-height: 1.6; }
                    .content h2 { color: #0d3d5c; margin-top: 0; }
                    .highlight-box { background-color: #f0f7fa; border-left: 4px solid #3d9dd9; padding: 15px; margin: 20px 0; }
                    .info-box { background-color: #f8f9fa; border: 1px solid #dee2e6; border-radius: 8px; padding: 20px; margin: 20px 0; }
                    .info-row { margin: 8px 0; }
                    .info-label { font-weight: bold; color: #0d3d5c; }
                    .match-card { background: #fff; border: 2px solid #6cb13e; border-radius: 8px; padding: 15px; margin: 10px 0; }
                    .match-card.same-bureau { border-color: #6cb13e; background: rgba(108, 177, 62, 0.05); }
                    .match-card.same-quartier { border-color: #3d9dd9; }
                    .match-badge { display: inline-block; padding: 3px 10px; border-radius: 12px; font-size: 12px; font-weight: bold; margin-bottom: 8px; }
                    .badge-bureau { background: #6cb13e; color: white; }
                    .badge-quartier { background: #3d9dd9; color: white; }
                    .footer { background-color: #0d3d5c; color: #ffffff; padding: 20px; text-align: center; font-size: 14px; }
                    .footer a { color: #a8d98f; text-decoration: none; }
                    .btn { display: inline-block; background-color: #6cb13e; color: #ffffff; padding: 12px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; margin-top: 15px; }
                    .type-badge { display: inline-block; background: ${formData.type === 'Mandant' ? '#e74c3c' : '#6cb13e'}; color: white; padding: 5px 15px; border-radius: 15px; font-weight: bold; }
                `;

                const isMandant = formData.type === 'Mandant';
                const typeLabel = isMandant ? 'mandataire' : 'mandant';

                // 1. Acknowledgment email to the submitter
                const acknowledgmentHtml = `
                <!DOCTYPE html>
                <html lang="fr">
                <head>
                    <meta charset="UTF-8">
                    <style>${emailStyles}</style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>Pour Senlis en Confiance</h1>
                        </div>
                        <div class="content">
                            <h2>Bonjour ${formData.nom.split(' ')[0]},</h2>

                            <p>${isMandant
                                ? 'Votre demande de procuration a bien été enregistrée.'
                                : 'Merci de vous porter volontaire pour une procuration !'}</p>

                            <div class="highlight-box">
                                <strong>Enregistré le ${formattedDate}</strong>
                            </div>

                            <div class="info-box">
                                <div class="info-row"><span class="info-label">Type :</span> ${formData.type}</div>
                                <div class="info-row"><span class="info-label">Bureau de vote :</span> ${formData.bureau}</div>
                                <div class="info-row"><span class="info-label">Quartier :</span> ${formData.quartier}</div>
                                <div class="info-row"><span class="info-label">Tours :</span> ${tours.join(' et ')}</div>
                            </div>

                            <h3>Prochaines étapes</h3>
                            <p>Notre équipe va rechercher ${isMandant ? 'un mandataire' : 'un mandant'} compatible avec votre demande et vous recontactera par email ou téléphone.</p>

                            ${isMandant ? `
                            <p><strong>Important :</strong> Une fois le match confirmé, vous devrez établir la procuration officielle sur :</p>
                            <a href="https://www.maprocuration.gouv.fr/" class="btn">maprocuration.gouv.fr</a>
                            ` : `
                            <p><strong>Rappel :</strong> Vous ne pouvez détenir qu'une seule procuration établie en France. Le jour du vote, vous devrez vous rendre au bureau de vote du mandant.</p>
                            `}

                            <p style="margin-top: 30px;">À très bientôt,</p>
                            <p><strong>L'équipe Pour Senlis en Confiance</strong></p>
                        </div>
                        <div class="footer">
                            <p>Pour Senlis en Confiance - Élections Municipales 2026</p>
                            <p><a href="https://poursenlisenconfiance.fr">www.poursenlisenconfiance.fr</a></p>
                        </div>
                    </div>
                </body>
                </html>
                `;

                // 2. Notification email to the campaign team with potential matches
                let matchesHtml = '';
                if (potentialMatches.length > 0) {
                    matchesHtml = `
                    <h3 style="color: #6cb13e;">Matches potentiels trouvés (${potentialMatches.length})</h3>
                    ${potentialMatches.map(match => {
                        // Format date of birth if available
                        let dobFormatted = '';
                        if (match.dateNaissance) {
                            const dob = new Date(match.dateNaissance);
                            dobFormatted = dob.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
                        }
                        return `
                        <div class="match-card ${match.sameBureau ? 'same-bureau' : match.sameQuartier ? 'same-quartier' : ''}">
                            ${match.sameBureau ? '<span class="match-badge badge-bureau">Même bureau</span>' : ''}
                            ${match.sameQuartier && !match.sameBureau ? '<span class="match-badge badge-quartier">Même quartier</span>' : ''}
                            <div class="info-row"><span class="info-label">Nom :</span> ${match.nom}</div>
                            <div class="info-row"><span class="info-label">Email :</span> <a href="mailto:${match.email}">${match.email}</a></div>
                            <div class="info-row"><span class="info-label">Téléphone :</span> ${match.phone}</div>
                            ${dobFormatted ? `<div class="info-row"><span class="info-label">Date de naissance :</span> ${dobFormatted}</div>` : ''}
                            ${match.numeroElecteur ? `<div class="info-row"><span class="info-label">N° électeur :</span> ${match.numeroElecteur}</div>` : ''}
                            <div class="info-row"><span class="info-label">Bureau :</span> ${match.bureau}</div>
                            <div class="info-row"><span class="info-label">Quartier :</span> ${match.quartier}</div>
                            <div class="info-row"><span class="info-label">Tours :</span> ${match.tours}</div>
                        </div>
                    `}).join('')}
                    `;
                } else {
                    matchesHtml = `
                    <div class="info-box" style="background: #fff3cd; border-color: #ffc107;">
                        <p style="margin: 0;"><strong>Aucun ${typeLabel} disponible</strong> pour le moment dans ce secteur.</p>
                    </div>
                    `;
                }

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
                            <h1>Nouvelle demande de procuration</h1>
                        </div>
                        <div class="content">
                            <div class="highlight-box">
                                <span class="type-badge">${formData.type}</span>
                                <strong style="margin-left: 10px;">Reçue le ${formattedDate}</strong>
                            </div>

                            <div class="info-box">
                                <div class="info-row"><span class="info-label">Nom :</span> ${formData.nom}</div>
                                <div class="info-row"><span class="info-label">Email :</span> <a href="mailto:${formData.email}">${formData.email}</a></div>
                                <div class="info-row"><span class="info-label">Téléphone :</span> ${formData.phone}</div>
                                ${formData.type === 'Mandataire' && dateNaissanceFormatted ? `<div class="info-row"><span class="info-label">Date de naissance :</span> ${dateNaissanceFormatted}</div>` : ''}
                                ${formData.type === 'Mandataire' && formData.numeroElecteur ? `<div class="info-row"><span class="info-label">N° électeur :</span> ${formData.numeroElecteur}</div>` : ''}
                                <div class="info-row"><span class="info-label">Bureau de vote :</span> ${formData.bureau}</div>
                                <div class="info-row"><span class="info-label">Quartier :</span> ${formData.quartier}</div>
                                <div class="info-row"><span class="info-label">Tours :</span> ${tours.join(' et ')}</div>
                                ${formData.message ? `<div class="info-row"><span class="info-label">Message :</span> ${formData.message}</div>` : ''}
                            </div>

                            ${matchesHtml}

                            <div class="info-box" style="font-size: 13px; color: #6c757d;">
                                <div class="info-row"><span class="info-label">Adresse IP :</span> ${clientIP}</div>
                                <div class="info-row"><span class="info-label">Localisation :</span> ${geoLocation}</div>
                                <div class="info-row"><span class="info-label">ID Airtable :</span> ${airtableResult.id}</div>
                            </div>

                            <a href="mailto:${formData.email}?subject=Re: Votre demande de procuration" class="btn">Répondre à ${formData.nom.split(' ')[0]}</a>
                        </div>
                        <div class="footer">
                            <p>Notification automatique - Pour Senlis en Confiance</p>
                        </div>
                    </div>
                </body>
                </html>
                `;

                // Send acknowledgment email
                await fetch('https://api.resend.com/emails', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${RESEND_API_KEY}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        from: 'Pour Senlis en Confiance <contact@poursenlisenconfiance.fr>',
                        to: [formData.email],
                        subject: isMandant
                            ? 'Votre demande de procuration a été enregistrée'
                            : 'Merci de vous porter volontaire pour une procuration',
                        html: acknowledgmentHtml
                    })
                });

                // Send notification email to team
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
                        subject: `[Procuration] ${formData.type} - ${formData.nom} - Bureau ${formData.bureau}`,
                        html: notificationHtml
                    })
                });

                console.log('Emails sent successfully');
            } catch (emailError) {
                console.error('Email sending error:', emailError);
            }
        }

        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify({
                success: true,
                message: formData.type === 'Mandant'
                    ? 'Votre demande a été enregistrée. Nous vous recontacterons rapidement.'
                    : 'Merci pour votre engagement ! Nous vous recontacterons dès qu\'un mandant correspondant sera trouvé.',
                id: airtableResult.id,
                matchesFound: potentialMatches.length
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
