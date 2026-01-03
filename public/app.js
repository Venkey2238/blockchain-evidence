/**
 * Clean Evidence Management System - Enhanced with Admin Management
 * @fileoverview Main application logic for EVID-DGC blockchain evidence management system
 * @author EVID-DGC Team
 * @version 1.0.0
 */

/* global trackUserAction, trackEvent */

/**
 * Current user's wallet account address
 * @type {string|null}
 */
let userAccount;

/**
 * Mapping of role numbers to human-readable role names
 * @type {Object<number, string>}
 */
const roleNames = {
    1: 'Public Viewer', 2: 'Investigator', 3: 'Forensic Analyst',
    4: 'Legal Professional', 5: 'Court Official', 6: 'Evidence Manager',
    7: 'Auditor', 8: 'Administrator'
};

/**
 * Mapping of role numbers to database role strings
 * @type {Object<number, string>}
 */
const roleMapping = {
    1: 'public_viewer', 2: 'investigator', 3: 'forensic_analyst',
    4: 'legal_professional', 5: 'court_official', 6: 'evidence_manager',
    7: 'auditor', 8: 'admin'
};

/* =======================
   🔥 NAVBAR HELPERS (ADDED)
======================= */
function truncateWallet(address) {
    if (!address) return '0x****...****';
    return address.slice(0, 6) + '...' + address.slice(-4);
}

function initializeNavbar() {
    const roleEl = document.getElementById('userRole');
    const walletEl = document.getElementById('userWallet');
    const logoutBtn = document.getElementById('logoutBtn');

    if (walletEl && userAccount) {
        walletEl.textContent = truncateWallet(userAccount);
    }

    if (roleEl && userAccount) {
        const savedUser = localStorage.getItem('evidUser_' + userAccount);
        if (savedUser) {
            const userInfo = JSON.parse(savedUser);
            const role = userInfo.role;
            roleEl.textContent =
                typeof role === 'number'
                    ? roleNames[role]
                    : role.replace('_', ' ').toUpperCase();
        }
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }
}

// Initialize app
document.addEventListener('DOMContentLoaded', initializeApp);
document.addEventListener('DOMContentLoaded', initializeNavbar);

/**
 * Initialize application
 */
async function initializeApp() {
    const connectBtn = document.getElementById('connectWallet');
    const regForm = document.getElementById('registrationForm');
    const dashBtn = document.getElementById('goToDashboard');

    if (connectBtn) connectBtn.addEventListener('click', connectWallet);
    if (regForm) regForm.addEventListener('submit', handleRegistration);
    if (dashBtn) dashBtn.addEventListener('click', goToDashboard);

    initializeHamburgerMenu();

    if (window.ethereum) {
        try {
            const accounts = await window.ethereum.request({ method: 'eth_accounts' });
            if (accounts.length > 0) {
                await connectWallet();
            }
        } catch (error) {
            console.log('MetaMask not connected');
        }
    }
}

// Initialize hamburger menu
function initializeHamburgerMenu() {
    const menuToggle = document.getElementById('menuToggle');
    const navMenu = document.getElementById('navMenu');

    if (menuToggle && navMenu) {
        menuToggle.addEventListener('click', () => {
            navMenu.classList.toggle('active');
        });

        const navLinks = navMenu.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            link.addEventListener('click', () => {
                navMenu.classList.remove('active');
            });
        });
    }
}

async function connectWallet() {
    try {
        // Show loader
        const loader = document.getElementById('loader');
        const loaderMessage = document.getElementById('loaderMessage');
        if (loader) loader.classList.remove('hidden');
        if (loaderMessage) loaderMessage.classList.remove('hidden');

        showLoading(true);

        if (!window.ethereum) {
            userAccount = '0x1234567890123456789012345678901234567890';

            // Artificial delay to show loader in demo mode
            await new Promise(resolve => setTimeout(resolve, 1500));

            updateWalletUI();
            await checkRegistrationStatus();
            showLoading(false);

            // Hide loader
            if (loader) loader.classList.add('hidden');
            if (loaderMessage) loaderMessage.classList.add('hidden');
            return;
        }

        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        userAccount = accounts[0];
        updateWalletUI();
        await checkRegistrationStatus();
        showLoading(false);

        // Hide loader
        if (loader) loader.classList.add('hidden');
        if (loaderMessage) loaderMessage.classList.add('hidden');
    } catch (error) {
        showLoading(false);
        showAlert('Wallet connection failed', 'error');
    }
}

/**
 * Update the wallet UI elements after successful connection
 * Updates the wallet address display, shows wallet status section, and disables connect button
 * @function updateWalletUI
 * @returns {void}
 */
function updateWalletUI() {
    const walletAddr = document.getElementById('walletAddress');
    const walletStatus = document.getElementById('walletStatus');
    const connectBtn = document.getElementById('connectWallet');

    if (walletAddr) walletAddr.textContent = userAccount;
    if (walletStatus) walletStatus.classList.remove('hidden');
    if (connectBtn) {
        connectBtn.textContent = 'Connected';
        connectBtn.disabled = true;
    }
}

async function checkRegistrationStatus() {
    const savedUser = localStorage.getItem('evidUser_' + userAccount);
    if (savedUser) {
        toggleSections('alreadyRegistered');
    } else {
        toggleSections('registration');
    }
}

function toggleSections(active) {
    ['wallet', 'registration', 'alreadyRegistered'].forEach(id => {
        document.getElementById(id + 'Section')?.classList.toggle('hidden', id !== active);
    });
}

async function handleRegistration(event) {
    event.preventDefault();
    const role = parseInt(document.getElementById('userRole')?.value);
    const fullName = document.getElementById('fullName')?.value;

    const userData = {
        fullName,
        role,
        isRegistered: true
    };

    localStorage.setItem('evidUser_' + userAccount, JSON.stringify(userData));
    localStorage.setItem('currentUser', userAccount);

    showAlert('Registration successful!', 'success');
    setTimeout(() => window.location.href = 'dashboard.html', 1500);
}

async function goToDashboard() {
    window.location.href = 'dashboard.html';
}

// 🔴 EXISTING LOGOUT (REUSED)
function logout() {
    localStorage.clear();
    userAccount = null;
    window.location.replace('index.html');
}

function showLoading(show) {
    document.getElementById('loadingModal')?.classList.toggle('active', show);
}

/**
 * Display alert message to user
 * Creates and displays a temporary alert message with specified type and styling
 * @function showAlert
 * @param {string} message - The message to display
 * @param {string} type - The alert type ('success', 'error', 'info')
 * @returns {void}
 */
function showAlert(message, type) {
    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    alert.innerHTML = message;
    document.body.appendChild(alert);
    setTimeout(() => alert.remove(), 4000);
}

if (window.ethereum) {
    window.ethereum.on('accountsChanged', () => location.reload());
    window.ethereum.on('chainChanged', () => location.reload());
}
