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

// Initialize app
document.addEventListener('DOMContentLoaded', initializeApp);

/**
 * Initialize the application by setting up event handlers and auto-connecting MetaMask
 * Sets up application event handlers, initializes the hamburger menu, and attempts to auto-connect MetaMask if available.
 * Attaches click/submit handlers for wallet connection, registration submission, and dashboard navigation, 
 * initializes the hamburger menu UI, and, when a web3 provider exists, tries to restore an existing MetaMask connection.
 * @async
 * @function initializeApp
 * @returns {Promise<void>} Promise that resolves when initialization is complete
 */
async function initializeApp() {
    const connectBtn = document.getElementById('connectWallet');
    const regForm = document.getElementById('registrationForm');
    const dashBtn = document.getElementById('goToDashboard');

    if (connectBtn) connectBtn.addEventListener('click', connectWallet);
    if (regForm) regForm.addEventListener('submit', handleRegistration);
    if (dashBtn) dashBtn.addEventListener('click', goToDashboard);

    // Initialize hamburger menu
    initializeHamburgerMenu();

    // Auto-connect if MetaMask is available
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

/**
 * Initialize the hamburger menu functionality for mobile navigation
 * Sets up the hamburger menu toggle and closes the menu when a navigation link is clicked.
 * If elements with IDs "menuToggle" or "navMenu" are not present, the function does nothing.
 * @function initializeHamburgerMenu
 * @returns {void}
 */
function initializeHamburgerMenu() {
    const menuToggle = document.getElementById('menuToggle');
    const navMenu = document.getElementById('navMenu');

    if (menuToggle && navMenu) {
        menuToggle.addEventListener('click', () => {
            navMenu.classList.toggle('active');
        });

        // Close menu when link is clicked
        const navLinks = navMenu.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            link.addEventListener('click', () => {
                navMenu.classList.remove('active');
            });
        });
    }
}
/**
 * Connect to the user's Ethereum wallet (MetaMask) or use demo mode
 * Connects to the user's Ethereum wallet (MetaMask) or uses a demo address when MetaMask is unavailable, 
 * then updates application state and UI. Attempts to request accounts from window.ethereum; on success, 
 * sets the global `userAccount`, updates the wallet UI, and checks the user's registration status. 
 * If no provider is present, assigns a fixed demo address, updates UI, and checks registration. 
 * Shows loading and error alerts as needed and records analytics events when `trackUserAction` is available.
 * @async
 * @function connectWallet
 * @returns {Promise<void>} Promise that resolves when wallet connection is complete
 */
async function connectWallet() {
    try {
        // Show loader
        const loader = document.getElementById('loader');
        const loaderMessage = document.getElementById('loaderMessage');
        if (loader) loader.classList.remove('hidden');
        if (loaderMessage) loaderMessage.classList.remove('hidden');

        showLoading(true);

        // Track wallet connection attempt (safe check)
        if (typeof trackUserAction === 'function') {
            trackUserAction('wallet_connect_attempt', 'authentication');
        }

        // Demo mode for testing without MetaMask
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
        if (accounts.length === 0) {
            showAlert('No accounts found. Please unlock MetaMask.', 'error');
            showLoading(false);

            // Hide loader
            if (loader) loader.classList.add('hidden');
            if (loaderMessage) loaderMessage.classList.add('hidden');
            return;
        }

        userAccount = accounts[0];
        updateWalletUI();
        await checkRegistrationStatus();

        // Track successful wallet connection (safe check)
        if (typeof trackUserAction === 'function') {
            trackUserAction('wallet_connected', 'authentication');
        }

        showLoading(false);

        // Hide loader
        if (loader) loader.classList.add('hidden');
        if (loaderMessage) loaderMessage.classList.add('hidden');
    } catch (error) {
        showLoading(false);

        // Hide loader
        const loader = document.getElementById('loader');
        const loaderMessage = document.getElementById('loaderMessage');
        if (loader) loader.classList.add('hidden');
        if (loaderMessage) loaderMessage.classList.add('hidden');

        console.error('Wallet connection error:', error);
        showAlert('Failed to connect wallet: ' + error.message, 'error');

        // Track wallet connection failure (safe check)
        if (typeof trackUserAction === 'function') {
            trackUserAction('wallet_connect_failed', 'authentication');
        }
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

/**
 * Check if the current wallet is registered and update UI accordingly
 * Verify whether the currently connected wallet address is registered and update the UI to reflect the result.
 * Checks the primary database (via `window.storage.getUser`) when available, falls back to `localStorage` for backward
 * compatibility, and updates the interface accordingly:
 * - If the account is inactive, shows an error and logs the user out.
 * - If the account is an admin, configures the admin UI and shows the "already registered" section.
 * - If the account is a regular registered user, configures the user UI and shows the "already registered" section.
 * - If no record is found, displays the registration form.
 * On unexpected errors, shows an error alert and displays the registration form.
 * @async
 * @function checkRegistrationStatus
 * @returns {Promise<void>} Promise that resolves when registration check is complete
 */
async function checkRegistrationStatus() {
    try {
        if (!userAccount) {
            showAlert('Please connect your wallet first.', 'error');
            return;
        }

        // Check database for user first (primary source) - safe check
        let userInfo = null;
        if (typeof window.storage !== 'undefined' && window.storage) {
            try {
                userInfo = await window.storage.getUser(userAccount);
            } catch (error) {
                console.log('Database not available, checking localStorage');
            }
        }

        // If user found in database
        if (userInfo) {
            // Check if user is inactive
            if (!userInfo.is_active) {
                showAlert('Your account has been deactivated. Contact administrator.', 'error');
                logout();
                return;
            }

            // Check if user is admin - show options instead of auto-redirect
            if (userInfo.role === 'admin') {
                updateAdminUI(userInfo);
                toggleSections('alreadyRegistered');
                return;
            }

            // Regular user - show dashboard access
            updateUserUI(userInfo);
            toggleSections('alreadyRegistered');
            return;
        }

        // Fallback to localStorage for existing users (backward compatibility)
        const savedUser = localStorage.getItem('evidUser_' + userAccount);
        if (savedUser) {
            const localUserInfo = JSON.parse(savedUser);

            // Check if it's an admin in localStorage - show options instead of auto-redirect
            if (localUserInfo.role === 8 || localUserInfo.role === 'admin') {
                updateAdminUI(localUserInfo);
                toggleSections('alreadyRegistered');
                return;
            }

            updateUserUI(localUserInfo);
            toggleSections('alreadyRegistered');
            return;
        }

        // New wallet - show registration form
        toggleSections('registration');

    } catch (error) {
        console.error('Registration check error:', error);
        showAlert('Error checking registration. Please try again.', 'error');
        // On error, show registration form
        toggleSections('registration');
    }
}

/**
 * Update UI for regular user display
 * Updates the user interface elements with regular user information
 * @function updateUserUI
 * @param {Object} userInfo - User information object
 * @param {string} userInfo.fullName - User's full name
 * @param {string} userInfo.full_name - Alternative full name property
 * @param {number|string} userInfo.role - User's role identifier
 * @param {string} userInfo.department - User's department
 * @returns {void}
 */
function updateUserUI(userInfo) {
    const userName = document.getElementById('userName');
    const userRoleName = document.getElementById('userRoleName');
    const userDepartment = document.getElementById('userDepartment');

    if (userName) userName.textContent = userInfo.fullName || userInfo.full_name;
    if (userRoleName) {
        const role = userInfo.role;
        userRoleName.textContent = roleNames[role];
        userRoleName.className = `badge badge-${getRoleClass(role)}`;
    }
    if (userDepartment) userDepartment.textContent = userInfo.department || 'Public';
}

/**
 * Update UI for admin user display
 * Updates the user interface elements with admin user information and modifies dashboard button
 * @function updateAdminUI
 * @param {Object} userInfo - Admin user information object
 * @param {string} userInfo.fullName - Admin's full name
 * @param {string} userInfo.full_name - Alternative full name property
 * @returns {void}
 */
function updateAdminUI(userInfo) {
    const userName = document.getElementById('userName');
    const userRoleName = document.getElementById('userRoleName');
    const userDepartment = document.getElementById('userDepartment');
    const dashBtn = document.getElementById('goToDashboard');

    if (userName) userName.textContent = userInfo.fullName || userInfo.full_name;
    if (userRoleName) {
        userRoleName.textContent = '👑 Administrator';
        userRoleName.className = 'badge badge-admin';
    }
    if (userDepartment) userDepartment.textContent = 'System Administration';

    // Change dashboard button to admin dashboard
    if (dashBtn) {
        dashBtn.textContent = '👑 Go to Admin Dashboard';
        dashBtn.onclick = goToAdminDashboard;
    }
}

/**
 * Toggle visibility of different UI sections
 * Shows the specified section and hides all others
 * @function toggleSections
 * @param {string} activeSection - The section to show ('wallet', 'registration', 'alreadyRegistered')
 * @returns {void}
 */
function toggleSections(activeSection) {
    const sections = {
        wallet: document.getElementById('walletSection'),
        registration: document.getElementById('registrationSection'),
        alreadyRegistered: document.getElementById('alreadyRegisteredSection')
    };

    Object.keys(sections).forEach(key => {
        if (sections[key]) {
            sections[key].classList.toggle('hidden', key !== activeSection);
        }
    });
}

/**
 * Handle user registration form submission
 * Handle the registration form submission: validate input, persist the new user's data, track the registration event, and redirect to the dashboard on success.
 * Prevents administrator self-registration, requires a connected wallet, saves the prepared user record to localStorage (always) and to window.storage when available, shows loading/alert UI for status, and attempts to track the registration via analytics when available.
 * @async
 * @function handleRegistration
 * @param {Event} event - The form submit event
 * @returns {Promise<void>} Promise that resolves when registration is complete
 */
async function handleRegistration(event) {
    event.preventDefault();

    try {
        showLoading(true);

        if (!userAccount) {
            showAlert('Please connect your wallet first.', 'error');
            showLoading(false);
            return;
        }

        const formData = getFormData();
        if (!formData) {
            showLoading(false);
            return;
        }

        // Prevent admin role self-registration
        if (formData.role === 8 || formData.role === 'admin') {
            showAlert('Administrator role cannot be self-registered. Contact an existing administrator.', 'error');
            showLoading(false);
            return;
        }

        // Convert role number to string for database
        const dbRole = roleMapping[formData.role];

        // Save to localStorage (always works)
        localStorage.setItem('evidUser_' + userAccount, JSON.stringify(formData));
        localStorage.setItem('currentUser', userAccount);

        // Try to save to database if available - safe check
        if (typeof window.storage !== 'undefined' && window.storage) {
            try {
                const userData = {
                    walletAddress: userAccount,
                    fullName: formData.fullName,
                    role: dbRole,
                    department: formData.department,
                    jurisdiction: formData.jurisdiction,
                    badgeNumber: formData.badgeNumber,
                    accountType: 'real',
                    createdBy: 'self'
                };
                await window.storage.saveUser(userData);
                console.log('User saved to database');
            } catch (error) {
                console.log('Database save failed, using localStorage only');
            }
        }

        // Track successful registration (safe check)
        if (typeof trackEvent === 'function') {
            trackEvent('user_registration', {
                event_category: 'registration',
                role_type: dbRole,
                user_type: 'new_user',
                department: formData.department
            });
        }

        showLoading(false);
        showAlert('Registration successful! Redirecting to dashboard...', 'success');

        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 2000);

    } catch (error) {
        showLoading(false);
        console.error('Registration error:', error);
        showAlert('Registration failed: ' + error.message, 'error');
    }
}

/**
 * Extract and validate form data from registration form
 * Retrieves form data and validates required fields
 * @function getFormData
 * @returns {Object|null} Form data object or null if validation fails
 * @returns {string} returns.fullName - User's full name
 * @returns {number} returns.role - User's role number
 * @returns {string} returns.department - User's department
 * @returns {string} returns.badgeNumber - User's badge number
 * @returns {string} returns.jurisdiction - User's jurisdiction
 * @returns {number} returns.registrationDate - Registration timestamp
 * @returns {boolean} returns.isRegistered - Registration status
 * @returns {boolean} returns.isActive - Active status
 */
function getFormData() {
    const fullName = document.getElementById('fullName')?.value;
    const role = parseInt(document.getElementById('userRole')?.value);

    if (!fullName || !role) {
        showAlert('Please fill in all required fields and select a role.', 'error');
        return null;
    }

    return {
        fullName,
        role,
        department: role === 1 ? 'Public' : document.getElementById('department')?.value || 'Unknown',
        badgeNumber: role === 1 ? '' : document.getElementById('badgeNumber')?.value || '',
        jurisdiction: role === 1 ? 'Public' : document.getElementById('jurisdiction')?.value || 'Unknown',
        registrationDate: Date.now(),
        isRegistered: true,
        isActive: true
    };
}

/**
 * Navigate to appropriate dashboard based on user role
 * Determines user role and redirects to the appropriate dashboard page
 * @async
 * @function goToDashboard
 * @returns {Promise<void>} Promise that resolves when navigation is complete
 */
async function goToDashboard() {
    localStorage.setItem('currentUser', userAccount);

    // Get user role to redirect to appropriate dashboard
    try {
        const userResponse = await fetch(`/api/user/${userAccount}`);
        const userData = await userResponse.json();

        if (userData.user) {
            const role = userData.user.role;
            switch (role) {
                case 'investigator':
                    window.location.href = 'dashboard-investigator.html';
                    break;
                case 'forensic_analyst':
                    window.location.href = 'dashboard-analyst.html';
                    break;
                case 'legal_professional':
                    window.location.href = 'dashboard-legal.html';
                    break;
                case 'court_official':
                    window.location.href = 'dashboard-court.html';
                    break;
                case 'evidence_manager':
                    window.location.href = 'dashboard-manager.html';
                    break;
                case 'auditor':
                    window.location.href = 'dashboard-auditor.html';
                    break;
                case 'admin':
                    window.location.href = 'admin.html';
                    break;
                case 'public_viewer':
                    window.location.href = 'dashboard-public.html';
                    break;
                default:
                    window.location.href = 'dashboard.html'; // Fallback
            }
        } else {
            window.location.href = 'dashboard.html'; // Fallback
        }
    } catch (error) {
        console.error('Error determining dashboard:', error);
        window.location.href = 'dashboard.html'; // Fallback
    }
}

/**
 * Navigate to admin dashboard
 * Sets current user in localStorage and redirects to admin dashboard
 * @async
 * @function goToAdminDashboard
 * @returns {Promise<void>} Promise that resolves when navigation is complete
 */
async function goToAdminDashboard() {
    localStorage.setItem('currentUser', userAccount);
    window.location.href = 'admin.html';
}

/**
 * Get the CSS class name associated with a numeric role identifier.
 * @param {number} role - Numeric role identifier (e.g., 1 for public, 8 for admin).
 * @returns {string} The corresponding CSS role class name; `'public'` if the role is unrecognized.
 */
function getRoleClass(role) {
    const roleClasses = {
        1: 'public', 2: 'investigator', 3: 'forensic', 4: 'legal',
        5: 'court', 6: 'manager', 7: 'auditor', 8: 'admin'
    };
    return roleClasses[role] || 'public';
}

/**
 * Logs the current user out and restores the application to its initial unauthenticated state.
 *
 * Clears all stored client data, resets the in-memory wallet state and the connect button UI, shows only the wallet section, and navigates to index.html to reload the app.
 */
// eslint-disable-next-line no-unused-vars
function logout() {
    // Clear all stored data
    localStorage.clear();

    // Reset UI
    userAccount = null;
    const connectBtn = document.getElementById('connectWallet');
    if (connectBtn) {
        connectBtn.textContent = '🚀 Connect MetaMask Wallet';
        connectBtn.disabled = false;
    }

    // Hide all sections except wallet
    toggleSections('wallet');
    document.getElementById('walletStatus')?.classList.add('hidden');

    // Force page reload to ensure clean state
    window.location.replace('index.html');
}

/**
 * Disconnects the currently connected wallet and restores the app to its initial connect state.
 *
 * Clears stored wallet state, resets the connect button to an enabled "Connect MetaMask Wallet" state,
 * hides registration and status sections, shows the wallet connect section, and displays a success alert.
 */
// eslint-disable-next-line no-unused-vars
function disconnectWallet() {
    // Clear wallet connection
    userAccount = null;
    localStorage.clear();

    // Reset connect button
    const connectBtn = document.getElementById('connectWallet');
    if (connectBtn) {
        connectBtn.textContent = '🚀 Connect MetaMask Wallet';
        connectBtn.disabled = false;
    }

    // Hide wallet status and show connect section
    document.getElementById('walletStatus')?.classList.add('hidden');
    document.getElementById('registrationSection')?.classList.add('hidden');
    document.getElementById('alreadyRegisteredSection')?.classList.add('hidden');
    document.getElementById('walletSection')?.classList.remove('hidden');

    showAlert('Wallet disconnected. You can now connect a different account.', 'success');
}

/**
 * Show or hide loading modal
 * Controls the visibility of the loading modal overlay
 * @function showLoading
 * @param {boolean} show - Whether to show (true) or hide (false) the loading modal
 * @returns {void}
 */
function showLoading(show) {
    const modal = document.getElementById('loadingModal');
    if (modal) modal.classList.toggle('active', show);
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
    // Remove existing alerts
    document.querySelectorAll('.alert').forEach(alert => alert.remove());

    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    alert.innerHTML = message;
    alert.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 1000;
        padding: 12px 20px;
        border-radius: 8px;
        color: white;
        font-weight: 500;
        max-width: 400px;
        background: ${type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : '#17a2b8'};
    `;

    document.body.appendChild(alert);
    setTimeout(() => alert.remove(), 5000);
}

// Role selection functionality
document.addEventListener('DOMContentLoaded', function () {
    const roleCards = document.querySelectorAll('.role-card');
    const userRoleInput = document.getElementById('userRole');
    const professionalFields = document.getElementById('professionalFields');

    roleCards.forEach(card => {
        card.addEventListener('click', function () {
            // Remove selected class from all cards
            roleCards.forEach(c => c.classList.remove('selected'));

            // Add selected class to clicked card
            this.classList.add('selected');

            // Set the role value
            const role = this.dataset.role;
            if (userRoleInput) userRoleInput.value = role;

            // Track role selection (safe check)
            if (typeof trackUserAction === 'function') {
                trackUserAction('role_selected', 'registration');
            }
            if (typeof trackEvent === 'function') {
                trackEvent('role_selection', {
                    event_category: 'registration',
                    role_type: roleNames[parseInt(role)] || 'Unknown',
                    role_id: role
                });
            }

            // Show/hide professional fields
            if (professionalFields) {
                if (role === '1') { // Public Viewer
                    professionalFields.classList.remove('show');
                    document.getElementById('badgeNumber').required = false;
                    document.getElementById('department').required = false;
                    document.getElementById('jurisdiction').required = false;
                } else {
                    professionalFields.classList.add('show');
                    document.getElementById('badgeNumber').required = true;
                    document.getElementById('department').required = true;
                    document.getElementById('jurisdiction').required = true;
                }
            }
        });
    });
});

// Ethereum event listeners
if (window.ethereum) {
    window.ethereum.on('accountsChanged', () => location.reload());
    window.ethereum.on('chainChanged', () => location.reload());
}