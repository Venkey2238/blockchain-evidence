/**
 * Global Header Manager
 * Injects a consistent navbar across all pages
 */

class HeaderManager {
    constructor() {
        this.init();
    }

    init() {
        // Load CSS
        this.loadStyles();

        // Render Navbar
        this.render();

        // Attach events
        this.attachEventListeners();
    }

    loadStyles() {
        if (!document.querySelector('link[href="header.css"]')) {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = 'header.css';
            document.head.appendChild(link);
        }
    }

    render() {
        // Prevent duplicate headers
        if (document.querySelector('.header-nav')) return;

        const headerHTML = `
        <header class="header-nav">
            <div class="navbar-container">
                <a href="index.html" class="nav-brand">
                    <img src="logo-32x32.png" alt="EVID-DGC Logo" class="brand-logo">
                    <span style="font-weight: 800; color: #d32f2f; font-size: 1.5rem;">EVID-DGC</span>
                </a>
                
                <button class="menu-toggle" id="menuToggle" aria-label="Toggle navigation menu">
                    <i data-lucide="menu"></i>
                </button>

                <nav class="nav-menu" id="navMenu">
                    <a href="index.html#home" class="nav-link">
                        <i data-lucide="home"></i>
                        <span>Home</span>
                    </a>
                    <a href="index.html#how-it-works" class="nav-link">
                        <i data-lucide="workflow"></i>
                        <span>How It Works</span>
                    </a>
                    <a href="index.html#documentation" class="nav-link">
                        <i data-lucide="book-open"></i>
                        <span>Documentation</span>
                    </a>
                    <a href="index.html#faq" class="nav-link">
                        <i data-lucide="help-circle"></i>
                        <span>Q&A</span>
                    </a>
                    <a href="index.html#contact" class="nav-link">
                        <i data-lucide="phone"></i>
                        <span>Contact</span>
                    </a>
                    <a href="https://github.com/Gooichand/blockchain-evidence" target="_blank" class="nav-link external-link" rel="noopener noreferrer">
                        <i data-lucide="github"></i>
                        <span>GitHub</span>
                    </a>
                    <a href="index.html#login-options" class="nav-login-btn">
                        <i data-lucide="log-in"></i>
                        <span>Login</span>
                    </a>
                </nav>
            </div>
        </header>
        <noscript>
            <div style="padding: 1rem; text-align: center; background: #fff3f3; color: #d32f2f; font-weight: bold;">
                JavaScript is required for the full experience. <a href="index.html">View Site Map</a>
            </div>
        </noscript>
        `;

        // Insert or replace placeholder
        const placeholder = document.getElementById('header-placeholder');
        if (placeholder) {
            placeholder.outerHTML = headerHTML;
        } else {
            document.body.insertAdjacentHTML('afterbegin', headerHTML);
        }

        // Initialize Lucide icons if available
        this.updateIcons();
    }

    updateIcons() {
        if (typeof lucide !== 'undefined') {
            try {
                lucide.createIcons();
            } catch (err) {
                console.warn('Lucide icon creation failed:', err);
            }
        } else {
            console.warn('Lucide icons not loaded');
        }
    }

    attachEventListeners() {
        const toggleBtn = document.getElementById('menuToggle');
        const navMenu = document.getElementById('navMenu');

        if (toggleBtn && navMenu) {
            // ✅ Idempotency guard to prevent duplicate listeners
            if (toggleBtn.dataset.menuListenersAttached === 'true') {
                return;
            }
            toggleBtn.dataset.menuListenersAttached = 'true';

            toggleBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                navMenu.classList.toggle('active');

                // Update icon
                const icon = toggleBtn.querySelector('i');
                if (icon) {
                    const isOpening = navMenu.classList.contains('active');
                    icon.setAttribute('data-lucide', isOpening ? 'x' : 'menu');
                    this.updateIcons();
                }
            });

            // Close menu when clicking outside
            document.addEventListener('click', (e) => {
                if (navMenu.classList.contains('active') && !navMenu.contains(e.target)) {
                    navMenu.classList.remove('active');
                    const icon = toggleBtn.querySelector('i');
                    if (icon) {
                        icon.setAttribute('data-lucide', 'menu');
                        this.updateIcons();
                    }
                }
            });

            // Close menu when clicking a link
            navMenu.querySelectorAll('.nav-link, .nav-login-btn').forEach(link => {
                link.addEventListener('click', () => {
                    navMenu.classList.remove('active');
                    const icon = toggleBtn.querySelector('i');
                    if (icon) {
                        icon.setAttribute('data-lucide', 'menu');
                        this.updateIcons();
                    }
                });
            });
        }
    }
}

// Initialize header
document.addEventListener('DOMContentLoaded', () => {
    window.headerManager = new HeaderManager();
});
