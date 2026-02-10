// Daily Stats Email - Runs at 3 AM CET via Netlify Scheduled Function
// Fetches Plausible analytics (API v2) and sends email summary

const PLAUSIBLE_API_KEY = process.env.PLAUSIBLE_API_KEY;
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const SITE_ID = 'poursenlisenconfiance.fr';

// Helper to query Plausible API v2
async function queryPlausible(query) {
    const response = await fetch('https://plausible.io/api/v2/query', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${PLAUSIBLE_API_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ site_id: SITE_ID, ...query })
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error(`Plausible API v2 error (${response.status}):`, errorText);
        return null;
    }
    return response.json();
}

// Parse breakdown results from v2 format: { results: [{ dimensions: [...], metrics: [...] }] }
function parseBreakdown(data) {
    if (!data?.results) return [];
    return data.results.map(row => ({
        dimension: row.dimensions[0],
        visitors: row.metrics[0]
    }));
}

exports.handler = async (event, context) => {
    console.log('Daily stats function triggered');

    if (!PLAUSIBLE_API_KEY || !RESEND_API_KEY) {
        console.error('Missing API keys — PLAUSIBLE_API_KEY:', !!PLAUSIBLE_API_KEY, 'RESEND_API_KEY:', !!RESEND_API_KEY);
        return { statusCode: 500, body: 'Missing API keys' };
    }

    try {
        // Get yesterday's date
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const dateStr = yesterday.toISOString().split('T')[0];
        const dateRange = [dateStr, dateStr];

        // Fetch all data in parallel using Plausible API v2
        const [
            statsData,
            pagesData,
            sourcesData,
            consultationByQuartier,
            consultationByStatut,
            procurationByType,
            procurationByQuartier,
            procurationByBureau,
            documentViews,
            documentDownloads,
            // Cumulative (all-time) stats
            cumulStatsData,
            cumulConsultations,
            cumulProcurations,
            cumulDocViews,
            cumulDocDownloads
        ] = await Promise.all([
            // General stats (aggregate — no dimensions)
            queryPlausible({
                metrics: ['visitors', 'pageviews', 'bounce_rate', 'visit_duration'],
                date_range: dateRange
            }),
            // Top pages
            queryPlausible({
                metrics: ['visitors'],
                date_range: dateRange,
                dimensions: ['event:page'],
                order_by: [['visitors', 'desc']],
                pagination: { limit: 5 }
            }),
            // Top sources
            queryPlausible({
                metrics: ['visitors'],
                date_range: dateRange,
                dimensions: ['visit:source'],
                order_by: [['visitors', 'desc']],
                pagination: { limit: 5 }
            }),
            // Consultation breakdowns
            queryPlausible({
                metrics: ['visitors'],
                date_range: dateRange,
                dimensions: ['event:props:quartier'],
                filters: [['is', 'event:goal', ['Consultation']]],
                order_by: [['visitors', 'desc']],
                pagination: { limit: 10 }
            }),
            queryPlausible({
                metrics: ['visitors'],
                date_range: dateRange,
                dimensions: ['event:props:statut'],
                filters: [['is', 'event:goal', ['Consultation']]],
                order_by: [['visitors', 'desc']],
                pagination: { limit: 5 }
            }),
            // Procuration breakdowns
            queryPlausible({
                metrics: ['visitors'],
                date_range: dateRange,
                dimensions: ['event:props:type'],
                filters: [['is', 'event:goal', ['Procuration']]],
                order_by: [['visitors', 'desc']],
                pagination: { limit: 5 }
            }),
            queryPlausible({
                metrics: ['visitors'],
                date_range: dateRange,
                dimensions: ['event:props:quartier'],
                filters: [['is', 'event:goal', ['Procuration']]],
                order_by: [['visitors', 'desc']],
                pagination: { limit: 10 }
            }),
            queryPlausible({
                metrics: ['visitors'],
                date_range: dateRange,
                dimensions: ['event:props:bureau'],
                filters: [['is', 'event:goal', ['Procuration']]],
                order_by: [['visitors', 'desc']],
                pagination: { limit: 10 }
            }),
            // Document events
            queryPlausible({
                metrics: ['visitors'],
                date_range: dateRange,
                dimensions: ['event:props:document_name'],
                filters: [['is', 'event:goal', ['Document View']]],
                order_by: [['visitors', 'desc']],
                pagination: { limit: 5 }
            }),
            queryPlausible({
                metrics: ['visitors'],
                date_range: dateRange,
                dimensions: ['event:props:document_name'],
                filters: [['is', 'event:goal', ['Document Download']]],
                order_by: [['visitors', 'desc']],
                pagination: { limit: 5 }
            }),
            // Cumulative (all-time) queries
            queryPlausible({
                metrics: ['visitors', 'pageviews', 'visits'],
                date_range: 'all'
            }),
            queryPlausible({
                metrics: ['visitors'],
                date_range: 'all',
                filters: [['is', 'event:goal', ['Consultation']]]
            }),
            queryPlausible({
                metrics: ['visitors'],
                date_range: 'all',
                filters: [['is', 'event:goal', ['Procuration']]]
            }),
            queryPlausible({
                metrics: ['visitors'],
                date_range: 'all',
                filters: [['is', 'event:goal', ['Document View']]]
            }),
            queryPlausible({
                metrics: ['visitors'],
                date_range: 'all',
                filters: [['is', 'event:goal', ['Document Download']]]
            })
        ]);

        // Parse aggregate stats
        // v2 response: { results: [{ metrics: [visitors, pageviews, bounce_rate, visit_duration] }] }
        const statsMetrics = statsData?.results?.[0]?.metrics || [0, 0, 0, 0];
        const stats = {
            visitors: statsMetrics[0] || 0,
            pageviews: statsMetrics[1] || 0,
            bounce_rate: statsMetrics[2] || 0,
            visit_duration: statsMetrics[3] || 0
        };

        // Parse all breakdowns
        const topPages = parseBreakdown(pagesData);
        const topSources = parseBreakdown(sourcesData);
        const consultQuartiers = parseBreakdown(consultationByQuartier);
        const consultStatuts = parseBreakdown(consultationByStatut);
        const procTypes = parseBreakdown(procurationByType);
        const procQuartiers = parseBreakdown(procurationByQuartier);
        const procBureaux = parseBreakdown(procurationByBureau);
        const docViews = parseBreakdown(documentViews);
        const docDownloads = parseBreakdown(documentDownloads);

        // Calculate daily totals
        const totalConsultations = consultQuartiers.reduce((sum, q) => sum + (q.visitors || 0), 0);
        const totalProcurations = procTypes.reduce((sum, t) => sum + (t.visitors || 0), 0);
        const totalDocViews = docViews.reduce((sum, d) => sum + (d.visitors || 0), 0);
        const totalDocDownloads = docDownloads.reduce((sum, d) => sum + (d.visitors || 0), 0);

        // Parse cumulative (all-time) stats
        const cumulMetrics = cumulStatsData?.results?.[0]?.metrics || [0, 0, 0];
        const cumul = {
            visitors: cumulMetrics[0] || 0,
            pageviews: cumulMetrics[1] || 0,
            visits: cumulMetrics[2] || 0
        };
        const cumulTotalConsultations = cumulConsultations?.results?.[0]?.metrics?.[0] || 0;
        const cumulTotalProcurations = cumulProcurations?.results?.[0]?.metrics?.[0] || 0;
        const cumulTotalDocViews = cumulDocViews?.results?.[0]?.metrics?.[0] || 0;
        const cumulTotalDocDownloads = cumulDocDownloads?.results?.[0]?.metrics?.[0] || 0;

        // Format date in French
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        const formattedDate = yesterday.toLocaleDateString('fr-FR', options);

        // Format visit duration
        const duration = stats.visit_duration;
        const minutes = Math.floor(duration / 60);
        const seconds = duration % 60;
        const durationStr = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;

        // Build email HTML
        const emailHtml = `
        <!DOCTYPE html>
        <html lang="fr">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Statistiques quotidiennes</title>
            <style>
                body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
                .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
                .header { background: linear-gradient(135deg, #0d3d5c 0%, #3d9dd9 100%); color: white; padding: 30px; text-align: center; }
                .header h1 { margin: 0; font-size: 24px; }
                .header p { margin: 10px 0 0; opacity: 0.9; }
                .content { padding: 30px; }
                .stats-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-bottom: 30px; }
                .stat-card { background: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center; }
                .stat-value { font-size: 32px; font-weight: bold; color: #0d3d5c; }
                .stat-label { font-size: 14px; color: #6c757d; margin-top: 5px; }
                .section { margin-bottom: 25px; }
                .section h3 { color: #0d3d5c; margin: 0 0 10px; font-size: 16px; border-bottom: 2px solid #6cb13e; padding-bottom: 8px; }
                .section-desc { font-size: 13px; color: #6c757d; margin: 0 0 12px; font-style: italic; }
                .list-item { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
                .list-item:last-child { border-bottom: none; }
                .list-name { color: #333; }
                .list-value { font-weight: bold; color: #0d3d5c; }
                .empty-state { color: #999; font-style: italic; padding: 10px 0; }
                .actions-table { width: 100%; margin-bottom: 30px; border-collapse: separate; border-spacing: 8px; }
                .action-card { background-color: #6cb13e; padding: 20px; border-radius: 8px; text-align: center; }
                .action-value { font-size: 28px; font-weight: bold; color: #ffffff; }
                .action-label { font-size: 13px; margin-top: 5px; color: #ffffff; }
                .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 13px; color: #6c757d; }
                .footer a { color: #3d9dd9; text-decoration: none; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Statistiques du site</h1>
                    <p>${formattedDate}</p>
                </div>
                <div class="content">
                    <!-- Cumulative (All-Time) Stats -->
                    <div style="background: linear-gradient(135deg, #f0f7ed 0%, #e8f5e1 100%); border-radius: 10px; padding: 20px; margin-bottom: 25px; border: 1px solid #c8e6b8;">
                        <h3 style="color: #0d3d5c; margin: 0 0 15px; font-size: 15px; text-align: center; text-transform: uppercase; letter-spacing: 1px;">Cumul depuis le lancement</h3>
                        <table cellpadding="0" cellspacing="0" style="width: 100%;">
                            <tr>
                                <td style="text-align: center; padding: 8px;">
                                    <div style="font-size: 24px; font-weight: bold; color: #0d3d5c;">${cumul.visitors.toLocaleString('fr-FR')}</div>
                                    <div style="font-size: 11px; color: #6c757d;">Visiteurs</div>
                                </td>
                                <td style="text-align: center; padding: 8px;">
                                    <div style="font-size: 24px; font-weight: bold; color: #0d3d5c;">${cumul.pageviews.toLocaleString('fr-FR')}</div>
                                    <div style="font-size: 11px; color: #6c757d;">Pages vues</div>
                                </td>
                                <td style="text-align: center; padding: 8px;">
                                    <div style="font-size: 24px; font-weight: bold; color: #6cb13e;">${cumulTotalConsultations}</div>
                                    <div style="font-size: 11px; color: #6c757d;">Idées</div>
                                </td>
                            </tr>
                            <tr>
                                <td style="text-align: center; padding: 8px;">
                                    <div style="font-size: 24px; font-weight: bold; color: #6cb13e;">${cumulTotalProcurations}</div>
                                    <div style="font-size: 11px; color: #6c757d;">Procurations</div>
                                </td>
                                <td style="text-align: center; padding: 8px;">
                                    <div style="font-size: 24px; font-weight: bold; color: #0d3d5c;">${cumulTotalDocViews}</div>
                                    <div style="font-size: 11px; color: #6c757d;">Docs vus</div>
                                </td>
                                <td style="text-align: center; padding: 8px;">
                                    <div style="font-size: 24px; font-weight: bold; color: #0d3d5c;">${cumulTotalDocDownloads}</div>
                                    <div style="font-size: 11px; color: #6c757d;">Téléchargements</div>
                                </td>
                            </tr>
                        </table>
                    </div>

                    <h3 style="color: #6c757d; margin: 0 0 15px; font-size: 13px; text-align: center; text-transform: uppercase; letter-spacing: 1px;">Statistiques de la veille</h3>

                    <!-- Daily Stats -->
                    <div class="stats-grid">
                        <div class="stat-card">
                            <div class="stat-value">${stats.visitors}</div>
                            <div class="stat-label">Visiteurs uniques</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-value">${stats.pageviews}</div>
                            <div class="stat-label">Pages vues</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-value">${stats.bounce_rate}%</div>
                            <div class="stat-label">Taux de rebond</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-value">${durationStr}</div>
                            <div class="stat-label">Durée moyenne</div>
                        </div>
                    </div>

                    <!-- Actions Summary -->
                    <table class="actions-table" cellpadding="0" cellspacing="8" style="width: 100%; margin-bottom: 30px;">
                        <tr>
                            <td style="background-color: #6cb13e; padding: 20px; border-radius: 8px; text-align: center; width: 50%;">
                                <div style="font-size: 28px; font-weight: bold; color: #ffffff;">${totalConsultations}</div>
                                <div style="font-size: 13px; margin-top: 5px; color: #ffffff;">Idées soumises</div>
                            </td>
                            <td style="background-color: #6cb13e; padding: 20px; border-radius: 8px; text-align: center; width: 50%;">
                                <div style="font-size: 28px; font-weight: bold; color: #ffffff;">${totalProcurations}</div>
                                <div style="font-size: 13px; margin-top: 5px; color: #ffffff;">Procurations</div>
                            </td>
                        </tr>
                        <tr>
                            <td style="background-color: #6cb13e; padding: 20px; border-radius: 8px; text-align: center; width: 50%;">
                                <div style="font-size: 28px; font-weight: bold; color: #ffffff;">${totalDocViews}</div>
                                <div style="font-size: 13px; margin-top: 5px; color: #ffffff;">Documents vus</div>
                            </td>
                            <td style="background-color: #6cb13e; padding: 20px; border-radius: 8px; text-align: center; width: 50%;">
                                <div style="font-size: 28px; font-weight: bold; color: #ffffff;">${totalDocDownloads}</div>
                                <div style="font-size: 13px; margin-top: 5px; color: #ffffff;">Téléchargements</div>
                            </td>
                        </tr>
                    </table>

                    <!-- Consultation Details -->
                    ${totalConsultations > 0 ? `
                    <div class="section">
                        <h3>Consultation Citoyenne</h3>
                        <p class="section-desc">Idées soumises par quartier - permet de voir quels quartiers participent le plus</p>
                        ${consultQuartiers.map(q => `
                            <div class="list-item">
                                <span class="list-name">${q.dimension || 'Non spécifié'}</span>
                                <span class="list-value">${q.visitors} idée${q.visitors > 1 ? 's' : ''}</span>
                            </div>
                        `).join('')}
                    </div>
                    ${consultStatuts.length > 0 ? `
                    <div class="section">
                        <h3>Par statut électoral</h3>
                        <p class="section-desc">Profil des participants : Senlisiens, personnes travaillant à Senlis, etc.</p>
                        ${consultStatuts.map(s => `
                            <div class="list-item">
                                <span class="list-name">${s.dimension || 'Non spécifié'}</span>
                                <span class="list-value">${s.visitors}</span>
                            </div>
                        `).join('')}
                    </div>
                    ` : ''}
                    ` : ''}

                    <!-- Procuration Details -->
                    ${totalProcurations > 0 ? `
                    <div class="section">
                        <h3>Procurations</h3>
                        <p class="section-desc">Répartition Mandant (cherche un mandataire) vs Mandataire (se porte volontaire)</p>
                        ${procTypes.map(t => `
                            <div class="list-item">
                                <span class="list-name">${t.dimension}</span>
                                <span class="list-value">${t.visitors}</span>
                            </div>
                        `).join('')}
                    </div>
                    ${procQuartiers.length > 0 ? `
                    <div class="section">
                        <h3>Procurations par quartier</h3>
                        <p class="section-desc">Quartiers les plus actifs pour les demandes de procuration</p>
                        ${procQuartiers.map(q => `
                            <div class="list-item">
                                <span class="list-name">${q.dimension || 'Non spécifié'}</span>
                                <span class="list-value">${q.visitors}</span>
                            </div>
                        `).join('')}
                    </div>
                    ` : ''}
                    ${procBureaux.length > 0 ? `
                    <div class="section">
                        <h3>Par bureau de vote</h3>
                        <p class="section-desc">Bureaux de vote concernés par les demandes de procuration</p>
                        ${procBureaux.slice(0, 5).map(b => `
                            <div class="list-item">
                                <span class="list-name">${b.dimension || 'Non spécifié'}</span>
                                <span class="list-value">${b.visitors}</span>
                            </div>
                        `).join('')}
                    </div>
                    ` : ''}
                    ` : ''}

                    <!-- Document Stats -->
                    ${(totalDocViews > 0 || totalDocDownloads > 0) ? `
                    <div class="section">
                        <h3>Documents consultés</h3>
                        <p class="section-desc">Documents les plus consultés (tract, programme, lettre aux habitants)</p>
                        ${docViews.length > 0 ? docViews.map(d => `
                            <div class="list-item">
                                <span class="list-name">${d.dimension || 'Document'}</span>
                                <span class="list-value">${d.visitors} vue${d.visitors > 1 ? 's' : ''}</span>
                            </div>
                        `).join('') : '<p class="empty-state">Aucun document consulté</p>'}
                    </div>
                    ${docDownloads.length > 0 ? `
                    <div class="section">
                        <h3>Documents téléchargés</h3>
                        <p class="section-desc">Documents téléchargés pour lecture hors-ligne ou partage</p>
                        ${docDownloads.map(d => `
                            <div class="list-item">
                                <span class="list-name">${d.dimension || 'Document'}</span>
                                <span class="list-value">${d.visitors} téléchargement${d.visitors > 1 ? 's' : ''}</span>
                            </div>
                        `).join('')}
                    </div>
                    ` : ''}
                    ` : ''}

                    <!-- Top Pages -->
                    ${topPages.length > 0 ? `
                    <div class="section">
                        <h3>Pages les plus visitées</h3>
                        <p class="section-desc">Pages du site les plus consultées</p>
                        ${topPages.map(page => `
                            <div class="list-item">
                                <span class="list-name">${page.dimension === '/' ? 'Accueil' : page.dimension}</span>
                                <span class="list-value">${page.visitors} visiteurs</span>
                            </div>
                        `).join('')}
                    </div>
                    ` : ''}

                    <!-- Top Sources -->
                    ${topSources.length > 0 ? `
                    <div class="section">
                        <h3>Sources de trafic</h3>
                        <p class="section-desc">D'où viennent les visiteurs : recherche Google, Facebook, lien direct, etc.</p>
                        ${topSources.map(source => `
                            <div class="list-item">
                                <span class="list-name">${source.dimension || 'Accès direct'}</span>
                                <span class="list-value">${source.visitors} visiteurs</span>
                            </div>
                        `).join('')}
                    </div>
                    ` : ''}
                </div>
                <div class="footer">
                    <p>
                        <a href="https://plausible.io/${SITE_ID}">Voir le tableau de bord complet</a>
                    </p>
                    <p>Pour Senlis en Confiance avec Pascale Loiseleur</p>
                </div>
            </div>
        </body>
        </html>
        `;

        // Send email
        const emailResponse = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${RESEND_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                from: 'Pour Senlis en Confiance avec Pascale Loiseleur <contact@poursenlisenconfiance.fr>',
                to: ['contact@poursenlisenconfiance.fr'],
                subject: `Stats ${formattedDate} - ${stats.visitors} visiteurs, ${totalConsultations} idées, ${totalProcurations} procurations`,
                html: emailHtml
            })
        });

        if (!emailResponse.ok) {
            const errorText = await emailResponse.text();
            throw new Error(`Resend API error: ${emailResponse.status} - ${errorText}`);
        }

        console.log('Daily stats email sent successfully');

        return {
            statusCode: 200,
            body: JSON.stringify({ success: true, message: 'Daily stats email sent' })
        };

    } catch (error) {
        console.error('Error in daily-stats function:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message })
        };
    }
};
