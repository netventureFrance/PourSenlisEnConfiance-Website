// ===================================
// Mobile Navigation Toggle
// ===================================
const navToggle = document.getElementById('navToggle');
const navMenu = document.getElementById('navMenu');
const navLinks = document.querySelectorAll('.nav-link');

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
// Form Validation and Enhancement
// ===================================
const contactForm = document.querySelector('.contact-form');

if (contactForm) {
    contactForm.addEventListener('submit', (e) => {
        // Form is handled by Netlify, but we can add custom validation
        const email = contactForm.querySelector('#email').value;
        const name = contactForm.querySelector('#name').value;
        const message = contactForm.querySelector('#message').value;

        if (!email || !name || !message) {
            e.preventDefault();
            alert('Veuillez remplir tous les champs obligatoires.');
            return false;
        }

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            e.preventDefault();
            alert('Veuillez entrer une adresse email valide.');
            return false;
        }
    });
}

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
// Video Player Enhancement
// ===================================
function initVideoAutoplay() {
    // Autoplay videos when they come into view
    const videoObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            const iframe = entry.target.querySelector('iframe');
            if (!iframe) return;

            if (entry.isIntersecting) {
                // Video is in viewport - ensure it's playing
                const src = iframe.src;
                if (!src.includes('autoplay=1')) {
                    // Add autoplay if not already present
                    iframe.src = src.includes('?')
                        ? src + '&autoplay=1'
                        : src + '?autoplay=1';
                }
            } else {
                // Video is out of viewport - pause by removing and re-adding without autoplay
                const src = iframe.src;
                if (src.includes('autoplay=1')) {
                    iframe.src = src.replace(/[&?]autoplay=1/, '');
                }
            }
        });
    }, {
        threshold: 0.5 // Trigger when 50% of the video is visible
    });

    // Observe all video items
    document.querySelectorAll('.video-item').forEach(video => {
        videoObserver.observe(video);
    });
}

// Initialize video autoplay on load
initVideoAutoplay();

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
// Console Easter Egg
// ===================================
console.log('%c🗳️ Pour Senlis en Confiance', 'font-size: 20px; font-weight: bold; color: #0d3d5c;');
console.log('%cÉlections Municipales 2026', 'font-size: 14px; color: #3d9dd9;');
console.log('%cSite développé avec ❤️ pour Pascale Loiseleur', 'font-size: 12px; color: #6cb13e;');
