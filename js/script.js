// ===================================
// YouTube Consent - RGPD Compliant
// ===================================
function loadYouTubeVideo(element) {
    const videoId = element.dataset.videoId;
    const videoTitle = element.dataset.videoTitle || 'Vidéo YouTube';
    const wrapper = element.parentElement;

    // Create and insert the iframe
    const iframe = document.createElement('iframe');
    iframe.src = `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1&autoplay=1`;
    iframe.title = videoTitle;
    iframe.frameBorder = '0';
    iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
    iframe.allowFullscreen = true;

    // Replace the consent overlay with the iframe
    wrapper.innerHTML = '';
    wrapper.appendChild(iframe);
}

// ===================================
// Hero Carousel - Auto-slide with indicators
// ===================================
const heroCarousel = document.getElementById('heroCarousel');
if (heroCarousel) {
    const slides = heroCarousel.querySelectorAll('.carousel-slide');
    const dots = heroCarousel.querySelectorAll('.carousel-dot');
    let currentSlide = 0;
    const slideInterval = 4000; // 4 seconds
    let autoSlideTimer;

    function goToSlide(index) {
        slides[currentSlide].classList.remove('active');
        dots[currentSlide].classList.remove('active');
        currentSlide = index;
        slides[currentSlide].classList.add('active');
        dots[currentSlide].classList.add('active');
    }

    function nextSlide() {
        goToSlide((currentSlide + 1) % slides.length);
    }

    // Click on dots to navigate
    dots.forEach((dot, index) => {
        dot.addEventListener('click', () => {
            clearInterval(autoSlideTimer);
            goToSlide(index);
            autoSlideTimer = setInterval(nextSlide, slideInterval);
        });
    });

    // Start auto-slide
    autoSlideTimer = setInterval(nextSlide, slideInterval);
}

// ===================================
// Mobile Navigation Toggle
// ===================================
const navToggle = document.getElementById('navToggle');
const navMenu = document.getElementById('navMenu');
const navLinks = document.querySelectorAll('.nav-link');

if (navToggle) {
    navToggle.addEventListener('click', () => {
        navMenu.classList.toggle('active');

        // Animate hamburger
        const spans = navToggle.querySelectorAll('span');
        spans[0].style.transform = navMenu.classList.contains('active')
            ? 'rotate(-45deg) translate(-5px, 6px)'
            : 'none';
        spans[1].style.opacity = navMenu.classList.contains('active') ? '0' : '1';
        spans[2].style.transform = navMenu.classList.contains('active')
            ? 'rotate(45deg) translate(-5px, -6px)'
            : 'none';
    });

    // Close mobile menu when clicking on a link
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            navMenu.classList.remove('active');
            const spans = navToggle.querySelectorAll('span');
            spans[0].style.transform = 'none';
            spans[1].style.opacity = '1';
            spans[2].style.transform = 'none';
        });
    });
}

// ===================================
// Sticky Header on Scroll
// ===================================
const header = document.getElementById('header');
let lastScroll = 0;

window.addEventListener('scroll', () => {
    const currentScroll = window.pageYOffset;

    if (currentScroll > 100) {
        header.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.15)';
    } else {
        header.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.1)';
    }

    lastScroll = currentScroll;
});

// ===================================
// Smooth Scroll with Offset
// ===================================
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));

        if (target) {
            const headerHeight = header.offsetHeight;
            const targetPosition = target.offsetTop - headerHeight;

            window.scrollTo({
                top: targetPosition,
                behavior: 'smooth'
            });
        }
    });
});

// ===================================
// Gallery Lightbox
// ===================================
const lightbox = document.getElementById('lightbox');
const lightboxImage = document.getElementById('lightboxImage');
const lightboxClose = document.getElementById('lightboxClose');
const lightboxPrev = document.getElementById('lightboxPrev');
const lightboxNext = document.getElementById('lightboxNext');

let currentImageIndex = 0;
let galleryImages = [];

// Initialize gallery
function initGallery() {
    const galleryItems = document.querySelectorAll('.gallery-item img');
    galleryImages = Array.from(galleryItems);

    galleryItems.forEach((img, index) => {
        img.parentElement.addEventListener('click', () => {
            openLightbox(index);
        });
    });
}

function openLightbox(index) {
    currentImageIndex = index;
    lightboxImage.src = galleryImages[index].src;
    lightboxImage.alt = galleryImages[index].alt;
    lightbox.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeLightbox() {
    lightbox.classList.remove('active');
    document.body.style.overflow = 'auto';
}

function showPrevImage() {
    currentImageIndex = (currentImageIndex - 1 + galleryImages.length) % galleryImages.length;
    lightboxImage.src = galleryImages[currentImageIndex].src;
    lightboxImage.alt = galleryImages[currentImageIndex].alt;
}

function showNextImage() {
    currentImageIndex = (currentImageIndex + 1) % galleryImages.length;
    lightboxImage.src = galleryImages[currentImageIndex].src;
    lightboxImage.alt = galleryImages[currentImageIndex].alt;
}

// Only initialize lightbox if elements exist
if (lightbox && lightboxClose && lightboxPrev && lightboxNext) {
    lightboxClose.addEventListener('click', closeLightbox);
    lightboxPrev.addEventListener('click', showPrevImage);
    lightboxNext.addEventListener('click', showNextImage);

    // Close lightbox on background click
    lightbox.addEventListener('click', (e) => {
        if (e.target === lightbox) {
            closeLightbox();
        }
    });

    // Keyboard navigation for lightbox
    document.addEventListener('keydown', (e) => {
        if (!lightbox.classList.contains('active')) return;

        if (e.key === 'Escape') closeLightbox();
        if (e.key === 'ArrowLeft') showPrevImage();
        if (e.key === 'ArrowRight') showNextImage();
    });
}

// Initialize gallery on load
initGallery();

// ===================================
// Lazy Loading Images
// ===================================
if ('IntersectionObserver' in window) {
    const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.src = img.dataset.src || img.src;
                img.classList.add('loaded');
                observer.unobserve(img);
            }
        });
    });

    document.querySelectorAll('img[loading="lazy"]').forEach(img => {
        imageObserver.observe(img);
    });
}

// ===================================
// Scroll Reveal Animation
// ===================================
const revealElements = document.querySelectorAll(
    '.program-card, .document-card, .gallery-item, .team-member'
);

const revealOnScroll = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '0';
            entry.target.style.transform = 'translateY(20px)';
            entry.target.style.transition = 'all 0.6s ease';

            setTimeout(() => {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }, 100);
        }
    });
}, {
    threshold: 0.1
});

revealElements.forEach(el => revealOnScroll.observe(el));


// ===================================
// Active Navigation Link on Scroll
// ===================================
const sections = document.querySelectorAll('section[id]');

function highlightNavigation() {
    const scrollY = window.pageYOffset;

    sections.forEach(section => {
        const sectionHeight = section.offsetHeight;
        const sectionTop = section.offsetTop - 100;
        const sectionId = section.getAttribute('id');
        const navLink = document.querySelector(`.nav-link[href="#${sectionId}"]`);

        if (scrollY > sectionTop && scrollY <= sectionTop + sectionHeight) {
            navLink?.classList.add('active');
        } else {
            navLink?.classList.remove('active');
        }
    });
}

window.addEventListener('scroll', highlightNavigation);

// ===================================
// Video Section - No additional JS needed
// ===================================
// YouTube iframe handles playback natively

// ===================================
// QR Code Generation (placeholder)
// ===================================
// Note: In production, you would generate this server-side or use a QR code library
// For now, we'll use a placeholder or an API service

function generateQRCode() {
    const qrCodeImg = document.getElementById('qrCode');
    if (qrCodeImg) {
        const siteUrl = encodeURIComponent(window.location.origin);
        // Using a free QR code API
        qrCodeImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${siteUrl}`;
    }
}

// Generate QR code when page loads
window.addEventListener('load', generateQRCode);

// ===================================
// Performance: Preload Critical Resources
// ===================================
window.addEventListener('load', () => {
    // Preload hero image if exists
    const heroSection = document.querySelector('.hero');
    if (heroSection) {
        const heroImage = new Image();
        heroImage.src = '../images/PSEC.png';
    }
});

// ===================================
// Accessibility: Skip to Main Content
// ===================================
const skipLink = document.createElement('a');
skipLink.href = '#accueil';
skipLink.className = 'skip-link';
skipLink.textContent = 'Aller au contenu principal';
skipLink.style.cssText = `
    position: absolute;
    top: -40px;
    left: 0;
    background: var(--accent-green);
    color: white;
    padding: 8px;
    text-decoration: none;
    z-index: 100;
`;
skipLink.addEventListener('focus', () => {
    skipLink.style.top = '0';
});
skipLink.addEventListener('blur', () => {
    skipLink.style.top = '-40px';
});
document.body.insertBefore(skipLink, document.body.firstChild);

// ===================================
// Consultation Citoyenne - Interactive Map
// ===================================
function generateConsultSecurityQuestion() {
    const questionEl = document.getElementById('consultSecurityQuestion');
    const expectedEl = document.getElementById('consultExpectedAnswer');

    if (questionEl && expectedEl) {
        const num1 = Math.floor(Math.random() * 10) + 1;
        const num2 = Math.floor(Math.random() * 10) + 1;
        const operations = [
            { symbol: '+', calc: (a, b) => a + b },
            { symbol: '-', calc: (a, b) => a - b },
            { symbol: '×', calc: (a, b) => a * b }
        ];

        const adjustedNum1 = Math.max(num1, num2);
        const adjustedNum2 = Math.min(num1, num2);

        const op = operations[Math.floor(Math.random() * operations.length)];
        const answer = op.symbol === '-'
            ? op.calc(adjustedNum1, adjustedNum2)
            : op.calc(num1, num2);

        const displayNum1 = op.symbol === '-' ? adjustedNum1 : num1;
        const displayNum2 = op.symbol === '-' ? adjustedNum2 : num2;

        questionEl.textContent = `${displayNum1} ${op.symbol} ${displayNum2} = ?`;
        expectedEl.value = answer;
    }
}

function initConsultationMap() {
    const quartiersMap = document.querySelectorAll('.quartier');
    const quartierDetail = document.getElementById('quartierDetail');
    const consultationFormContainer = document.getElementById('consultationFormContainer');
    const selectedQuartierTitle = document.getElementById('selectedQuartierTitle');
    const selectedQuartierDesc = document.getElementById('selectedQuartierDesc');
    const consultQuartier = document.getElementById('consultQuartier');
    const consultationForm = document.getElementById('consultationForm');
    const consultationMessage = document.getElementById('consultationMessage');

    // Generate security question on load
    generateConsultSecurityQuestion();

    // Tooltip element
    const tooltip = document.getElementById('quartierTooltip');

    if (quartiersMap.length > 0) {
        quartiersMap.forEach(quartier => {
            // Click handler
            quartier.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();

                // Remove active class from all
                quartiersMap.forEach(q => q.classList.remove('active'));
                // Add active to clicked
                this.classList.add('active');

                // Get data
                const quartierName = this.getAttribute('data-quartier');
                const quartierInfo = this.getAttribute('data-info');

                // Show form
                if (quartierDetail) quartierDetail.style.display = 'none';
                if (consultationFormContainer) {
                    consultationFormContainer.style.display = 'block';
                    if (selectedQuartierTitle) selectedQuartierTitle.textContent = quartierName;
                    if (selectedQuartierDesc) selectedQuartierDesc.textContent = quartierInfo;
                    if (consultQuartier) consultQuartier.value = quartierName;
                }
            });

            // Hover tooltip handlers
            quartier.addEventListener('mouseenter', function() {
                const quartierName = this.getAttribute('data-quartier');
                if (tooltip) {
                    tooltip.textContent = quartierName;
                    tooltip.classList.add('visible');
                }
            });

            quartier.addEventListener('mouseleave', function() {
                if (tooltip) {
                    tooltip.textContent = 'Survolez un quartier';
                    tooltip.classList.remove('visible');
                }
            });
        });
    }

    // Handle consultation form submission
    if (consultationForm) {
        consultationForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            // Check honeypot
            const honeypot = consultationForm.querySelector('[name="bot-field-consult"]');
            if (honeypot && honeypot.value) {
                return false;
            }

            const formData = {
                quartier: consultQuartier ? consultQuartier.value : '',
                nom: document.getElementById('consultNom').value.trim(),
                email: document.getElementById('consultEmail').value.trim(),
                phone: document.getElementById('consultPhone') ? document.getElementById('consultPhone').value.trim() : '',
                statut: document.getElementById('consultStatut').value,
                age: document.getElementById('consultAge').value,
                idee: document.getElementById('consultIdee').value.trim(),
                message: document.getElementById('consultMessage') ? document.getElementById('consultMessage').value.trim() : '',
                newsletter: document.getElementById('consultNewsletter').checked,
                gdpr: document.getElementById('consultGdpr').checked,
                securityAnswer: document.getElementById('consultSecurityAnswer').value.trim(),
                expectedAnswer: parseInt(document.getElementById('consultExpectedAnswer').value)
            };

            // Validate required fields
            if (!formData.nom || !formData.email || !formData.statut || !formData.age || !formData.idee) {
                showConsultationMessage('Veuillez remplir tous les champs obligatoires.', 'error');
                return;
            }

            // Validate email
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(formData.email)) {
                showConsultationMessage('Veuillez entrer une adresse email valide.', 'error');
                return;
            }

            // Check GDPR
            if (!formData.gdpr) {
                showConsultationMessage('Vous devez accepter la politique de confidentialité.', 'error');
                return;
            }

            // Check security answer
            if (!formData.securityAnswer || parseInt(formData.securityAnswer) !== formData.expectedAnswer) {
                showConsultationMessage('La réponse à la vérification est incorrecte.', 'error');
                generateConsultSecurityQuestion();
                document.getElementById('consultSecurityAnswer').value = '';
                return;
            }

            const submitBtn = consultationForm.querySelector('button[type="submit"]');
            const originalText = submitBtn.textContent;
            submitBtn.disabled = true;
            submitBtn.textContent = 'Envoi en cours...';

            try {
                // Send to Netlify Function
                const response = await fetch('/.netlify/functions/submit-consultation', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(formData)
                });

                const result = await response.json();

                if (response.ok && result.success) {
                    showConsultationMessage('Merci ! Votre idée a été enregistrée.', 'success');
                    consultationForm.reset();
                    generateConsultSecurityQuestion();
                } else {
                    showConsultationMessage('Une erreur est survenue. Veuillez réessayer.', 'error');
                }
            } catch (error) {
                console.error('Consultation error:', error);
                showConsultationMessage('Erreur de connexion. Veuillez réessayer.', 'error');
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;
            }
        });
    }

    function showConsultationMessage(message, type) {
        if (consultationMessage) {
            consultationMessage.textContent = message;
            consultationMessage.className = `form-message ${type}`;

            if (type === 'error') {
                setTimeout(() => {
                    consultationMessage.className = 'form-message';
                }, 5000);
            }
        }
    }
}

// Initialize consultation map
initConsultationMap();

// ===================================
// Christmas Carousel for Programme Overlay
// ===================================
function initChristmasCarousel() {
    const slides = document.querySelectorAll('.christmas-slide');
    if (slides.length === 0) return;

    let currentSlide = 0;
    const slideInterval = 4000; // 4 seconds

    function nextSlide() {
        const prevSlide = currentSlide;
        currentSlide = (currentSlide + 1) % slides.length;
        // Add active to new slide first (crossfade)
        slides[currentSlide].classList.add('active');
        // Then remove from previous slide
        slides[prevSlide].classList.remove('active');
    }

    // Start the carousel
    setInterval(nextSlide, slideInterval);
}

// Initialize Christmas carousel when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initChristmasCarousel);
} else {
    initChristmasCarousel();
}

// ===================================
// Chatbot Functionality
// ===================================
function initChatbot() {
    const chatInput = document.getElementById('chatInput');
    const chatSend = document.getElementById('chatSend');
    const chatMessages = document.getElementById('chatMessages');
    const typingIndicator = document.getElementById('typingIndicator');
    const suggestedQuestions = document.getElementById('suggestedQuestions');

    // Don't run if chatbot elements don't exist
    if (!chatInput || !chatSend || !chatMessages) return;

    // Conversation history for context
    let conversationHistory = [];

    // Send message function
    async function sendMessage(message) {
        if (!message || message.trim().length === 0) return;

        // Add user message to UI
        appendMessage(message, true);

        // Clear input and disable
        chatInput.value = '';
        chatInput.disabled = true;
        chatSend.disabled = true;

        // Hide suggested questions after first message
        if (suggestedQuestions) {
            suggestedQuestions.style.display = 'none';
        }

        // Show typing indicator
        if (typingIndicator) {
            typingIndicator.style.display = 'block';
            scrollToBottom();
        }

        try {
            // Add to history
            conversationHistory.push({ role: 'user', content: message });

            // Call the API
            const response = await fetch('/.netlify/functions/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    message: message,
                    history: conversationHistory.slice(-10) // Last 10 messages for context
                })
            });

            const result = await response.json();

            if (response.ok && result.success) {
                // Add bot response to UI
                appendMessage(result.response, false);

                // Add to history
                conversationHistory.push({ role: 'assistant', content: result.response });
            } else {
                appendMessage('Désolé, une erreur est survenue. Veuillez réessayer.', false);
            }
        } catch (error) {
            console.error('Chat error:', error);
            appendMessage('Désolé, je n\'ai pas pu me connecter au serveur. Veuillez réessayer.', false);
        } finally {
            // Hide typing indicator
            if (typingIndicator) {
                typingIndicator.style.display = 'none';
            }

            // Re-enable input
            chatInput.disabled = false;
            chatSend.disabled = false;
            chatInput.focus();
        }
    }

    // Append message to chat
    function appendMessage(content, isUser) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${isUser ? 'message-user' : 'message-bot'}`;

        // Avatar
        const avatarDiv = document.createElement('div');
        avatarDiv.className = 'message-avatar';

        if (isUser) {
            avatarDiv.innerHTML = '<span>V</span>'; // V for Vous
        } else {
            avatarDiv.innerHTML = '<img src="images/PSEC.png" alt="Assistant">';
        }

        // Content
        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';

        // Parse the content - convert newlines to paragraphs
        const paragraphs = content.split('\n\n').filter(p => p.trim());
        if (paragraphs.length > 1) {
            paragraphs.forEach(p => {
                const pElement = document.createElement('p');
                pElement.innerHTML = formatText(p);
                contentDiv.appendChild(pElement);
            });
        } else {
            // Single paragraph or simple text
            const lines = content.split('\n').filter(l => l.trim());
            lines.forEach(line => {
                const pElement = document.createElement('p');
                pElement.innerHTML = formatText(line);
                contentDiv.appendChild(pElement);
            });
        }

        messageDiv.appendChild(avatarDiv);
        messageDiv.appendChild(contentDiv);

        // Insert before typing indicator if it exists, otherwise append
        if (typingIndicator && typingIndicator.parentNode === chatMessages) {
            chatMessages.insertBefore(messageDiv, typingIndicator);
        } else {
            chatMessages.appendChild(messageDiv);
        }

        scrollToBottom();
    }

    // Format text (bold, etc.)
    function formatText(text) {
        // Convert **bold** to <strong>
        text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
        // Convert *italic* to <em>
        text = text.replace(/\*([^*]+)\*/g, '<em>$1</em>');
        // Convert bullet points
        text = text.replace(/^[-•]\s*/gm, '• ');
        return text;
    }

    // Scroll to bottom of messages
    function scrollToBottom() {
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    // Event listeners
    chatSend.addEventListener('click', () => {
        sendMessage(chatInput.value);
    });

    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage(chatInput.value);
        }
    });

    // Suggested questions
    if (suggestedQuestions) {
        const suggestedBtns = suggestedQuestions.querySelectorAll('.suggested-btn');
        suggestedBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const question = btn.getAttribute('data-question');
                if (question) {
                    sendMessage(question);
                }
            });
        });
    }
}

// Initialize chatbot when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initChatbot);
} else {
    initChatbot();
}

// ===================================
// Procuration Page - Tabs and Forms
// ===================================
function initProcurationPage() {
    const tabs = document.querySelectorAll('.procuration-tab');
    const mandantForm = document.getElementById('mandant-form');
    const mandataireForm = document.getElementById('mandataire-form');

    if (!tabs.length || !mandantForm || !mandataireForm) return;

    // Tab switching
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Update tab active state
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            // Show/hide forms
            const tabType = tab.getAttribute('data-tab');
            if (tabType === 'mandant') {
                mandantForm.style.display = 'block';
                mandataireForm.style.display = 'none';
            } else {
                mandantForm.style.display = 'none';
                mandataireForm.style.display = 'block';
            }
        });
    });

    // Generate security questions for both forms
    generateProcurationSecurityQuestion('mandant');
    generateProcurationSecurityQuestion('mandataire');

    // Initialize form handlers
    initProcurationForm('mandant');
    initProcurationForm('mandataire');
}

// Generate security question for procuration forms
function generateProcurationSecurityQuestion(type) {
    const questionEl = document.getElementById(`${type}SecurityQuestion`);
    const expectedEl = document.getElementById(`${type}ExpectedAnswer`);

    if (questionEl && expectedEl) {
        const num1 = Math.floor(Math.random() * 10) + 1;
        const num2 = Math.floor(Math.random() * 10) + 1;
        const operations = [
            { symbol: '+', calc: (a, b) => a + b },
            { symbol: '-', calc: (a, b) => a - b },
            { symbol: '×', calc: (a, b) => a * b }
        ];

        const adjustedNum1 = Math.max(num1, num2);
        const adjustedNum2 = Math.min(num1, num2);

        const op = operations[Math.floor(Math.random() * operations.length)];
        const answer = op.symbol === '-'
            ? op.calc(adjustedNum1, adjustedNum2)
            : op.calc(num1, num2);

        const displayNum1 = op.symbol === '-' ? adjustedNum1 : num1;
        const displayNum2 = op.symbol === '-' ? adjustedNum2 : num2;

        questionEl.textContent = `${displayNum1} ${op.symbol} ${displayNum2} = ?`;
        expectedEl.value = answer;
    }
}

// Initialize procuration form submission
function initProcurationForm(type) {
    const formId = type === 'mandant' ? 'procurationMandantForm' : 'procurationMandataireForm';
    const form = document.getElementById(formId);
    const messageId = type === 'mandant' ? 'mandantMessage' : 'mandataireFormMessage';
    const messageEl = document.getElementById(messageId);

    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Check honeypot
        const honeypot = form.querySelector('[name="bot-field"]');
        if (honeypot && honeypot.value) {
            return false;
        }

        // Collect form data
        const prefix = type === 'mandant' ? 'mandant' : 'mandataire';

        // Handle "autre" bureau de vote
        let bureauValue = document.getElementById(`${prefix}Bureau`).value;
        if (bureauValue === 'autre') {
            bureauValue = document.getElementById(`${prefix}BureauAutre`).value.trim();
        }

        // Additional fields for mandataire
        let nom, civilite = '', nomNaissance = '', prenoms = '';
        const dateNaissance = type === 'mandataire' ? document.getElementById('mandataireDateNaissance')?.value : '';
        const numeroElecteur = type === 'mandataire' ? document.getElementById('mandataireNumeroElecteur')?.value.trim() : '';

        if (type === 'mandataire') {
            // Get civilité and name fields for mandataire
            civilite = form.querySelector('[name="civilite"]:checked')?.value || '';
            nomNaissance = document.getElementById('mandataireNomNaissance').value.trim().toUpperCase();
            prenoms = document.getElementById('mandatairePrenoms').value.trim();
            // Combine for display name
            nom = `${prenoms} ${nomNaissance}`;
        } else {
            nom = document.getElementById(`${prefix}Nom`).value.trim();
        }

        const formData = {
            type: type === 'mandant' ? 'Mandant' : 'Mandataire',
            nom: nom,
            civilite: civilite,
            nomNaissance: nomNaissance,
            prenoms: prenoms,
            email: document.getElementById(`${prefix}Email`).value.trim(),
            phone: document.getElementById(`${prefix}Phone`).value.trim(),
            dateNaissance: dateNaissance,
            numeroElecteur: numeroElecteur,
            bureau: bureauValue,
            quartier: document.getElementById(`${prefix}Quartier`).value,
            tour1: form.querySelector('[name="tour1"]').checked ? form.querySelector('[name="tour1"]').value : '',
            tour2: form.querySelector('[name="tour2"]').checked ? form.querySelector('[name="tour2"]').value : '',
            message: document.getElementById(`${prefix}Message`).value.trim(),
            gdpr: document.getElementById(`${prefix}Gdpr`).checked,
            securityAnswer: document.getElementById(`${prefix}SecurityAnswer`).value.trim(),
            expectedAnswer: parseInt(document.getElementById(`${prefix}ExpectedAnswer`).value)
        };

        // Validation
        if (!formData.nom || !formData.email || !formData.phone || !formData.bureau || !formData.quartier) {
            showProcurationMessage(messageEl, 'Veuillez remplir tous les champs obligatoires.', 'error');
            return;
        }

        // Validate date of birth for mandataire
        if (type === 'mandataire' && !formData.dateNaissance) {
            showProcurationMessage(messageEl, 'Veuillez indiquer votre date de naissance.', 'error');
            return;
        }

        // Validate email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.email)) {
            showProcurationMessage(messageEl, 'Veuillez entrer une adresse email valide.', 'error');
            return;
        }

        // Validate at least one tour
        if (!formData.tour1 && !formData.tour2) {
            showProcurationMessage(messageEl, 'Veuillez sélectionner au moins un tour.', 'error');
            return;
        }

        // Check GDPR
        if (!formData.gdpr) {
            showProcurationMessage(messageEl, 'Vous devez accepter la politique de confidentialité.', 'error');
            return;
        }

        // Check security answer
        if (!formData.securityAnswer || parseInt(formData.securityAnswer) !== formData.expectedAnswer) {
            showProcurationMessage(messageEl, 'La réponse à la vérification est incorrecte.', 'error');
            generateProcurationSecurityQuestion(type);
            document.getElementById(`${prefix}SecurityAnswer`).value = '';
            return;
        }

        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.textContent = 'Envoi en cours...';

        try {
            const response = await fetch('/.netlify/functions/submit-procuration', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            const result = await response.json();

            if (response.ok && result.success) {
                showProcurationMessage(messageEl, result.message, 'success');
                form.reset();
                generateProcurationSecurityQuestion(type);
            } else {
                showProcurationMessage(messageEl, result.error || 'Une erreur est survenue. Veuillez réessayer.', 'error');
            }
        } catch (error) {
            console.error('Procuration error:', error);
            showProcurationMessage(messageEl, 'Erreur de connexion. Veuillez réessayer.', 'error');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
        }
    });
}

// Show procuration message
function showProcurationMessage(el, message, type) {
    if (el) {
        el.textContent = message;
        el.className = `form-message ${type}`;
        el.style.display = 'block';

        // Scroll to message
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

        if (type === 'error') {
            setTimeout(() => {
                el.style.display = 'none';
            }, 5000);
        }
    }
}

// Toggle "Autre" bureau de vote field
function toggleOtherBureau(selectEl, inputId) {
    const inputEl = document.getElementById(inputId);
    if (inputEl) {
        if (selectEl.value === 'autre') {
            inputEl.style.display = 'block';
            inputEl.required = true;
            inputEl.focus();
        } else {
            inputEl.style.display = 'none';
            inputEl.required = false;
            inputEl.value = '';
        }
    }
}

// Initialize procuration page when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initProcurationPage);
} else {
    initProcurationPage();
}

// ===================================
// Document Viewer Modal
// ===================================
const documentViewerOverlay = document.getElementById('documentViewerOverlay');
const documentViewerModal = document.getElementById('documentViewerModal');
const documentViewerTitle = document.getElementById('documentViewerTitle');
const documentViewerContent = document.getElementById('documentViewerContent');
const documentViewerDownload = document.getElementById('documentViewerDownload');
const documentViewerClose = document.getElementById('documentViewerClose');

function openDocumentViewer(url, type, title) {
    if (!documentViewerModal) return;

    // Set title
    documentViewerTitle.textContent = title || 'Document';

    // Set download link
    documentViewerDownload.href = url;
    const filename = url.split('/').pop();
    documentViewerDownload.setAttribute('download', filename);

    // Clear previous content
    documentViewerContent.innerHTML = '';

    // Add content based on type
    if (type === 'pdf') {
        // Use object tag for better cross-browser PDF support
        const obj = document.createElement('object');
        obj.data = url;
        obj.type = 'application/pdf';
        obj.style.width = '100%';
        obj.style.height = '100%';

        // Fallback content if PDF can't be displayed
        const fallback = document.createElement('div');
        fallback.className = 'pdf-fallback';
        fallback.innerHTML = `
            <p>Impossible d'afficher le PDF dans votre navigateur.</p>
            <a href="${url}" target="_blank" class="btn btn-primary">Ouvrir dans un nouvel onglet</a>
        `;
        obj.appendChild(fallback);

        documentViewerContent.appendChild(obj);
    } else if (type === 'image') {
        const img = document.createElement('img');
        img.src = url;
        img.alt = title;
        documentViewerContent.appendChild(img);
    }

    // Show modal
    documentViewerOverlay.classList.add('visible');
    documentViewerModal.classList.add('visible');
    document.body.style.overflow = 'hidden';
}

function closeDocumentViewer() {
    if (!documentViewerModal) return;

    documentViewerOverlay.classList.remove('visible');
    documentViewerModal.classList.remove('visible');
    document.body.style.overflow = '';

    // Clear content after animation
    setTimeout(() => {
        documentViewerContent.innerHTML = '';
    }, 300);
}

// Event listeners for document viewer
if (documentViewerClose) {
    documentViewerClose.addEventListener('click', closeDocumentViewer);
}

if (documentViewerOverlay) {
    documentViewerOverlay.addEventListener('click', closeDocumentViewer);
}

// Close on Escape key
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && documentViewerModal && documentViewerModal.classList.contains('visible')) {
        closeDocumentViewer();
    }
});

// ===================================
// Console Easter Egg
// ===================================
console.log('%c🗳️ Pour Senlis en Confiance', 'font-size: 20px; font-weight: bold; color: #0d3d5c;');
console.log('%cÉlections Municipales 2026', 'font-size: 14px; color: #3d9dd9;');
console.log('%cSite développé avec ❤️ pour Pascale Loiseleur', 'font-size: 12px; color: #6cb13e;');
