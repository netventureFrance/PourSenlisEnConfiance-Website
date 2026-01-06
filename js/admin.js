// Admin Dashboard JavaScript
(function() {
    'use strict';

    // State
    let currentType = 'Mandant';
    let allRecords = [];
    let currentRecord = null;
    let matches = [];

    // DOM Elements
    const adminUserName = document.getElementById('adminUserName');
    const logoutBtn = document.getElementById('logoutBtn');
    const refreshBtn = document.getElementById('refreshBtn');
    const tabs = document.querySelectorAll('.admin-tab');
    const detailPanel = document.getElementById('detailPanel');
    const detailOverlay = document.getElementById('detailOverlay');
    const closePanel = document.getElementById('closePanel');
    const loadingOverlay = document.getElementById('loadingOverlay');

    // Auth Check
    function checkAuth() {
        const token = localStorage.getItem('adminToken');
        const user = localStorage.getItem('adminUser');

        if (!token || !user) {
            window.location.href = '/admin/';
            return false;
        }

        // Verify token
        fetch('/.netlify/functions/auth-verify', {
            headers: { 'Authorization': `Bearer ${token}` }
        })
        .then(res => res.json())
        .then(data => {
            if (!data.valid) {
                localStorage.removeItem('adminToken');
                localStorage.removeItem('adminUser');
                window.location.href = '/admin/';
            }
        })
        .catch(() => {
            // Token invalid or network error - still allow if we have a token
            console.warn('Could not verify token');
        });

        // Display user name
        try {
            const userData = JSON.parse(user);
            adminUserName.textContent = userData.nom || userData.email;
        } catch (e) {
            adminUserName.textContent = 'Admin';
        }

        return true;
    }

    // API Helper
    async function apiCall(endpoint, options = {}) {
        const token = localStorage.getItem('adminToken');
        const defaultHeaders = {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        };

        const response = await fetch(endpoint, {
            ...options,
            headers: { ...defaultHeaders, ...options.headers }
        });

        if (response.status === 401) {
            localStorage.removeItem('adminToken');
            localStorage.removeItem('adminUser');
            window.location.href = '/admin/';
            throw new Error('Session expirée');
        }

        return response.json();
    }

    // Show/Hide Loading
    function showLoading() {
        loadingOverlay.classList.add('visible');
    }

    function hideLoading() {
        loadingOverlay.classList.remove('visible');
    }

    // Toast Notifications
    function showToast(message, type = 'info') {
        const container = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        container.appendChild(toast);

        setTimeout(() => toast.classList.add('visible'), 10);
        setTimeout(() => {
            toast.classList.remove('visible');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    // Fetch Data
    async function fetchData() {
        showLoading();

        try {
            // Fetch all procurations and matches in parallel
            const [procData, matchData] = await Promise.all([
                apiCall('/.netlify/functions/admin-procurations'),
                apiCall('/.netlify/functions/admin-match')
            ]);

            if (procData.success) {
                allRecords = procData.records;
            }

            if (matchData.success) {
                matches = matchData.matches;
            }

            updateCounts();
            renderCards();
        } catch (error) {
            console.error('Fetch error:', error);
            showToast('Erreur lors du chargement des données', 'error');
        } finally {
            hideLoading();
        }
    }

    // Update Tab Counts
    function updateCounts() {
        const mandants = allRecords.filter(r => r.type === 'Mandant');
        const mandataires = allRecords.filter(r => r.type === 'Mandataire');

        document.getElementById('mandantCount').textContent = mandants.length;
        document.getElementById('mandataireCount').textContent = mandataires.length;
    }

    // Render Cards
    function renderCards() {
        const filtered = allRecords.filter(r => r.type === currentType);

        const waiting = filtered.filter(r => r.statut === 'En attente');
        const proposed = filtered.filter(r => r.statut === 'Proposé');
        const confirmed = filtered.filter(r => r.statut === 'Confirmé');

        document.getElementById('countWaiting').textContent = waiting.length;
        document.getElementById('countProposed').textContent = proposed.length;
        document.getElementById('countConfirmed').textContent = confirmed.length;

        document.getElementById('cardsWaiting').innerHTML = waiting.map(createCardHTML).join('');
        document.getElementById('cardsProposed').innerHTML = proposed.map(createCardHTML).join('');
        document.getElementById('cardsConfirmed').innerHTML = confirmed.map(createCardHTML).join('');

        // Add click handlers
        document.querySelectorAll('.admin-card').forEach(card => {
            card.addEventListener('click', () => openDetail(card.dataset.id));
        });
    }

    // Create Card HTML
    function createCardHTML(record) {
        const date = record.date ? new Date(record.date).toLocaleDateString('fr-FR') : '';
        const bureauShort = record.bureau ? record.bureau.replace('Bureau n°', 'B').split(' - ')[0] : '';

        return `
            <div class="admin-card type-${record.type.toLowerCase()}" data-id="${record.id}">
                <div class="card-header">
                    <span class="card-name">${escapeHtml(record.nom)}</span>
                </div>
                <div class="card-body">
                    <div class="card-info"><strong>${bureauShort}</strong> - ${escapeHtml(record.quartier || '')}</div>
                    <div class="card-tours">${escapeHtml(record.tours || '')}</div>
                </div>
                <div class="card-footer">
                    <span class="card-date">${date}</span>
                </div>
            </div>
        `;
    }

    // Escape HTML
    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Escape for HTML attributes (prevents XSS in onclick handlers)
    function escapeAttr(text) {
        if (!text) return '';
        return text
            .replace(/&/g, '&amp;')
            .replace(/'/g, '&#39;')
            .replace(/"/g, '&quot;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }

    // Open Detail Panel
    function openDetail(recordId) {
        const record = allRecords.find(r => r.id === recordId);
        if (!record) return;

        currentRecord = record;

        // Fill in details
        document.getElementById('detailName').textContent = record.nom;
        document.getElementById('detailType').textContent = record.type;
        document.getElementById('detailType').className = `detail-type type-${record.type.toLowerCase()}`;

        document.getElementById('detailEmail').textContent = record.email;
        document.getElementById('detailEmail').href = `mailto:${record.email}`;

        document.getElementById('detailPhone').textContent = record.phone;
        document.getElementById('detailPhone').href = `tel:${record.phone}`;

        document.getElementById('detailBureau').textContent = record.bureau;
        document.getElementById('detailQuartier').textContent = record.quartier;
        document.getElementById('detailTours').textContent = record.tours;

        if (record.dateNaissance) {
            document.getElementById('detailDateNaissanceRow').style.display = 'flex';
            document.getElementById('detailDateNaissance').textContent = new Date(record.dateNaissance).toLocaleDateString('fr-FR');
        } else {
            document.getElementById('detailDateNaissanceRow').style.display = 'none';
        }

        document.getElementById('detailDate').textContent = record.date ? new Date(record.date).toLocaleDateString('fr-FR', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        }) : '';

        if (record.message) {
            document.getElementById('detailMessageSection').style.display = 'block';
            document.getElementById('detailMessage').textContent = record.message;
        } else {
            document.getElementById('detailMessageSection').style.display = 'none';
        }

        // Load match suggestions
        loadMatchSuggestions(record);

        // Show panel
        detailPanel.classList.add('open');
        detailOverlay.classList.add('visible');
        document.body.style.overflow = 'hidden';
    }

    // Close Detail Panel
    function closeDetail() {
        detailPanel.classList.remove('open');
        detailOverlay.classList.remove('visible');
        document.body.style.overflow = '';
        currentRecord = null;
    }

    // Load Match Suggestions
    function loadMatchSuggestions(record) {
        const suggestionsContainer = document.getElementById('matchSuggestions');
        const currentMatchSection = document.getElementById('currentMatchSection');

        // Check if already matched
        const existingMatch = matches.find(m =>
            (record.type === 'Mandant' && m.mandantId === record.id) ||
            (record.type === 'Mandataire' && m.mandataireId === record.id)
        );

        if (existingMatch && existingMatch.status !== 'Annulé') {
            // Show current match info
            const matchedId = record.type === 'Mandant' ? existingMatch.mandataireId : existingMatch.mandantId;
            const matchedRecord = allRecords.find(r => r.id === matchedId);

            if (matchedRecord) {
                currentMatchSection.style.display = 'block';
                document.getElementById('currentMatchInfo').innerHTML = `
                    <div class="current-match-card">
                        <div class="match-status status-${existingMatch.status.toLowerCase().replace('é', 'e')}">${existingMatch.status}</div>
                        <div class="match-partner">
                            <strong>${escapeHtml(matchedRecord.nom)}</strong>
                            <p>${escapeHtml(matchedRecord.email)}</p>
                            <p>${escapeHtml(matchedRecord.phone)}</p>
                        </div>
                        <div class="match-meta">
                            Matché par ${escapeHtml(existingMatch.matchedBy)} le ${new Date(existingMatch.matchedAt).toLocaleDateString('fr-FR')}
                        </div>
                        ${existingMatch.status === 'Proposé' ? `
                            <div class="match-actions">
                                <button class="btn btn-small btn-success" onclick="updateMatchStatus('${escapeAttr(existingMatch.id)}', 'Confirmé')">Confirmer</button>
                                <button class="btn btn-small btn-danger" onclick="updateMatchStatus('${escapeAttr(existingMatch.id)}', 'Annulé')">Annuler</button>
                            </div>
                        ` : ''}
                    </div>
                `;
            }

            // Hide suggestions for matched records
            document.getElementById('matchSection').style.display = 'none';
            return;
        }

        currentMatchSection.style.display = 'none';
        document.getElementById('matchSection').style.display = 'block';

        // Find potential matches (opposite type)
        const oppositeType = record.type === 'Mandant' ? 'Mandataire' : 'Mandant';
        let potentialMatches = allRecords.filter(r =>
            r.type === oppositeType &&
            r.statut === 'En attente' &&
            hasOverlappingTours(record.tours, r.tours)
        );

        // Score and sort matches
        potentialMatches = potentialMatches.map(r => ({
            ...r,
            score: calculateScore(record, r),
            matchType: getMatchType(record, r)
        })).sort((a, b) => b.score - a.score);

        if (potentialMatches.length === 0) {
            suggestionsContainer.innerHTML = `
                <div class="no-matches">
                    Aucun ${oppositeType.toLowerCase()} disponible pour le moment.
                </div>
            `;
            return;
        }

        suggestionsContainer.innerHTML = potentialMatches.slice(0, 10).map(match => `
            <div class="match-suggestion ${escapeAttr(match.matchType)}">
                <div class="match-info">
                    <div class="match-badge ${escapeAttr(match.matchType)}">
                        ${match.matchType === 'same-bureau' ? 'Même bureau' :
                          match.matchType === 'same-quartier' ? 'Même quartier' : 'Compatible'}
                    </div>
                    <strong>${escapeHtml(match.nom)}</strong>
                    <span class="match-detail">${escapeHtml(match.bureau)}</span>
                    <span class="match-detail">${escapeHtml(match.quartier)}</span>
                    <span class="match-detail">${escapeHtml(match.tours)}</span>
                </div>
                <button class="match-btn" onclick="createMatch('${escapeAttr(record.id)}', '${escapeAttr(match.id)}')">
                    Matcher
                </button>
            </div>
        `).join('');
    }

    // Check if tours overlap
    function hasOverlappingTours(tours1, tours2) {
        if (!tours1 || !tours2) return true; // Assume overlap if missing
        const t1 = tours1.toLowerCase();
        const t2 = tours2.toLowerCase();
        const has1stTour = t => t.includes('1er') || t.includes('15 mars');
        const has2ndTour = t => t.includes('2e') || t.includes('22 mars');
        return (has1stTour(t1) && has1stTour(t2)) || (has2ndTour(t1) && has2ndTour(t2));
    }

    // Calculate match score
    function calculateScore(a, b) {
        let score = 0;
        if (a.bureau && b.bureau && a.bureau.toLowerCase() === b.bureau.toLowerCase()) score += 100;
        if (a.quartier && b.quartier && a.quartier === b.quartier) score += 50;
        if (hasOverlappingTours(a.tours, b.tours)) score += 10;
        return score;
    }

    // Get match type
    function getMatchType(a, b) {
        if (a.bureau && b.bureau && a.bureau.toLowerCase() === b.bureau.toLowerCase()) return 'same-bureau';
        if (a.quartier && b.quartier && a.quartier === b.quartier) return 'same-quartier';
        return 'other';
    }

    // Create Match (global function)
    window.createMatch = async function(id1, id2) {
        const record1 = allRecords.find(r => r.id === id1);
        const record2 = allRecords.find(r => r.id === id2);

        if (!record1 || !record2) return;

        const mandantId = record1.type === 'Mandant' ? id1 : id2;
        const mandataireId = record1.type === 'Mandataire' ? id1 : id2;

        if (!confirm(`Créer un match entre:\n- ${record1.nom}\n- ${record2.nom}\n\nUn email sera envoyé aux deux parties.`)) {
            return;
        }

        showLoading();

        try {
            const result = await apiCall('/.netlify/functions/admin-match', {
                method: 'POST',
                body: JSON.stringify({ mandantId, mandataireId })
            });

            if (result.success) {
                showToast('Match créé avec succès !', 'success');
                closeDetail();
                await fetchData();
            } else {
                showToast(result.error || 'Erreur lors de la création du match', 'error');
            }
        } catch (error) {
            console.error('Match creation error:', error);
            showToast('Erreur lors de la création du match', 'error');
        } finally {
            hideLoading();
        }
    };

    // Update Match Status (global function)
    window.updateMatchStatus = async function(matchId, status) {
        if (!confirm(`Changer le statut du match en "${status}" ?`)) {
            return;
        }

        showLoading();

        try {
            const result = await apiCall('/.netlify/functions/admin-match', {
                method: 'PATCH',
                body: JSON.stringify({ matchId, status })
            });

            if (result.success) {
                showToast(`Match ${status.toLowerCase()}`, 'success');
                closeDetail();
                await fetchData();
            } else {
                showToast(result.error || 'Erreur lors de la mise à jour', 'error');
            }
        } catch (error) {
            console.error('Match update error:', error);
            showToast('Erreur lors de la mise à jour', 'error');
        } finally {
            hideLoading();
        }
    };

    // Tab Switching
    function switchTab(type) {
        currentType = type;
        tabs.forEach(tab => {
            tab.classList.toggle('active', tab.dataset.type === type);
        });
        renderCards();
    }

    // Logout
    function logout() {
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminUser');
        window.location.href = '/admin/';
    }

    // Event Listeners
    function setupEventListeners() {
        // Tabs
        tabs.forEach(tab => {
            tab.addEventListener('click', () => switchTab(tab.dataset.type));
        });

        // Close panel
        closePanel.addEventListener('click', closeDetail);
        detailOverlay.addEventListener('click', closeDetail);

        // Escape key to close
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') closeDetail();
        });

        // Refresh
        refreshBtn.addEventListener('click', fetchData);

        // Logout
        logoutBtn.addEventListener('click', logout);
    }

    // Initialize
    function init() {
        if (!checkAuth()) return;
        setupEventListeners();
        fetchData();
    }

    // Start
    init();
})();
