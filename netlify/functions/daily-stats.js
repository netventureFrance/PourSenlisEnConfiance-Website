// Daily Stats Email - Runs at 3 AM CET via Netlify Scheduled Function
// Fetches Plausible analytics and sends email summary

const PLAUSIBLE_API_KEY = process.env.PLAUSIBLE_API_KEY;
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const SITE_ID = 'poursenlisenconfiance.fr';

exports.handler = async (event, context) => {
    console.log('Daily stats function triggered');

    if (!PLAUSIBLE_API_KEY || !RESEND_API_KEY) {
        console.error('Missing API keys');
        return { statusCode: 500, body: 'Missing API keys' };
    }

    try {
        // Get yesterday's date
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const dateStr = yesterday.toISOString().split('T')[0];

        // Fetch aggregate stats for yesterday
        const statsResponse = await fetch(
            `https://plausible.io/api/v1/stats/aggregate?site_id=${SITE_ID}&period=day&date=${dateStr}&metrics=visitors,pageviews,bounce_rate,visit_duration`,
            {
                headers: {
                    'Authorization': `Bearer ${PLAUSIBLE_API_KEY}`
                }
            }
        );

        if (!statsResponse.ok) {
            throw new Error(`Plausible API error: ${statsResponse.status}`);
        }

        const stats = await statsResponse.json();
        console.log('Stats fetched:', stats);

        // Fetch top pages
        const pagesResponse = await fetch(
            `https://plausible.io/api/v1/stats/breakdown?site_id=${SITE_ID}&period=day&date=${dateStr}&property=event:page&limit=5`,
            {
                headers: {
                    'Authorization': `Bearer ${PLAUSIBLE_API_KEY}`
                }
            }
        );

        const pagesData = await pagesResponse.json();
        const topPages = pagesData.results || [];

        // Fetch top sources
        const sourcesResponse = await fetch(
            `https://plausible.io/api/v1/stats/breakdown?site_id=${SITE_ID}&period=day&date=${dateStr}&property=visit:source&limit=5`,
            {
                headers: {
                    'Authorization': `Bearer ${PLAUSIBLE_API_KEY}`
                }
            }
        );

        const sourcesData = await sourcesResponse.json();
        const topSources = sourcesData.results || [];

        // Format date in French
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        const formattedDate = yesterday.toLocaleDateString('fr-FR', options);

        // Format visit duration
        const duration = stats.results.visit_duration?.value || 0;
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
                .section h3 { color: #0d3d5c; margin: 0 0 15px; font-size: 16px; border-bottom: 2px solid #6cb13e; padding-bottom: 8px; }
                .list-item { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
                .list-item:last-child { border-bottom: none; }
                .list-name { color: #333; }
                .list-value { font-weight: bold; color: #0d3d5c; }
                .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 13px; color: #6c757d; }
                .footer a { color: #3d9dd9; text-decoration: none; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>📊 Statistiques du site</h1>
                    <p>${formattedDate}</p>
                </div>
                <div class="content">
                    <div class="stats-grid">
                        <div class="stat-card">
                            <div class="stat-value">${stats.results.visitors?.value || 0}</div>
                            <div class="stat-label">Visiteurs uniques</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-value">${stats.results.pageviews?.value || 0}</div>
                            <div class="stat-label">Pages vues</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-value">${stats.results.bounce_rate?.value || 0}%</div>
                            <div class="stat-label">Taux de rebond</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-value">${durationStr}</div>
                            <div class="stat-label">Durée moyenne</div>
                        </div>
                    </div>

                    ${topPages.length > 0 ? `
                    <div class="section">
                        <h3>📄 Pages les plus visitées</h3>
                        ${topPages.map(page => `
                            <div class="list-item">
                                <span class="list-name">${page.page === '/' ? 'Accueil' : page.page}</span>
                                <span class="list-value">${page.visitors} visiteurs</span>
                            </div>
                        `).join('')}
                    </div>
                    ` : ''}

                    ${topSources.length > 0 ? `
                    <div class="section">
                        <h3>🔗 Sources de trafic</h3>
                        ${topSources.map(source => `
                            <div class="list-item">
                                <span class="list-name">${source.source || 'Direct'}</span>
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
                subject: `📊 Stats du ${formattedDate} - ${stats.results.visitors?.value || 0} visiteurs`,
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
