// Modern Evidence Management System - Optimized
let web3, userAccount;

const roleNames = {
    0: 'None', 1: 'Public Viewer', 2: 'Investigator', 3: 'Forensic Analyst',
    4: 'Legal Professional', 5: 'Court Official', 6: 'Evidence Manager',
    7: 'Auditor', 8: 'Administrator'
};

const roleDashboards = {
    1: 'dashboard-public-viewer.html', 2: 'dashboard-public-viewer.html',
    3: 'dashboard-public-viewer.html', 4: 'dashboard-public-viewer.html',
    5: 'dashboard-public-viewer.html', 6: 'dashboard-public-viewer.html',
    7: 'dashboard-public-viewer.html', 8: 'dashboard-public-viewer.html'
};

// Optimized DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}

async function initializeApp() {
    try {
        // Cache DOM elements
        const connectBtn = document.getElementById('connectWallet');
        const regForm = document.getElementById('registrationForm');
        const dashBtn = document.getElementById('goToDashboard');
        
        if (connectBtn) connectBtn.addEventListener('click', connectWallet);
        if (regForm) regForm.addEventListener('submit', handleRegistration);
        if (dashBtn) dashBtn.addEventListener('click', goToDashboard);

        // Check for existing connection
        if (window.ethereum) {
            const accounts = await window.ethereum.request({ method: 'eth_accounts' }).catch(() => []);
            if (accounts.length > 0) {
                await connectWallet();
            }
        }
    } catch (error) {
        console.error('App initialization error:', error);
    }
}

async function connectWallet() {
    try {
        showLoading(true);
        
        if (config.DEMO_MODE) {
            userAccount = '0x1234567890123456789012345678901234567890';
            updateWalletUI();
            await checkRegistrationStatus();
            showLoading(false);
            return;
        }
        
        if (!window.ethereum) {
            showAlert('MetaMask not detected. Please install MetaMask.', 'error');
            showLoading(false);
            return;
        }
        
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        if (accounts.length === 0) {
            showAlert('No accounts found. Please unlock MetaMask.', 'error');
            showLoading(false);
            return;
        }
        
        userAccount = accounts[0];
        web3 = new Web3(window.ethereum);
        updateWalletUI();
        await checkRegistrationStatus();
        showLoading(false);
    } catch (error) {
        showLoading(false);
        console.error('Wallet connection error:', error);
        showAlert('Failed to connect wallet: ' + error.message, 'error');
    }
}

function updateWalletUI() {
    const walletAddr = document.getElementById('walletAddress');
    const walletStatus = document.getElementById('walletStatus');
    const connectBtn = document.getElementById('connectWallet');
    
    if (walletAddr) walletAddr.textContent = userAccount;
    if (walletStatus) walletStatus.classList.remove('hidden');
    if (connectBtn) {
        connectBtn.textContent = config.DEMO_MODE ? 'Connected (Demo)' : 'Connected';
        connectBtn.disabled = true;
    }
}

async function checkRegistrationStatus() {
    try {
        if (!userAccount) {
            showAlert('Please connect your wallet first.', 'error');
            return;
        }
        
        // Check IndexedDB first, then localStorage as fallback
        let userInfo = await storage.getUser(userAccount);
        
        if (!userInfo) {
            // Fallback to localStorage
            const savedUser = localStorage.getItem('evidUser_' + userAccount);
            if (savedUser) {
                userInfo = JSON.parse(savedUser);
                // Migrate to IndexedDB
                userInfo.walletAddress = userAccount;
                await storage.saveUser(userInfo);
            }
        }
        
        if (userInfo) {
            updateUserUI(userInfo);
            toggleSections('alreadyRegistered');
            // Log login activity
            await storage.logActivity(userAccount, 'USER_LOGIN', 'User logged in');
            return;
        }
        
        toggleSections('registration');
    } catch (error) {
        console.error('Registration check error:', error);
        showAlert('Error checking registration: ' + error.message, 'error');
        toggleSections('registration');
    }
}

function updateUserUI(userInfo) {
    const elements = {
        userName: document.getElementById('userName'),
        userRoleName: document.getElementById('userRoleName'),
        userDepartment: document.getElementById('userDepartment')
    };
    
    if (elements.userName) elements.userName.textContent = userInfo.fullName;
    if (elements.userRoleName) {
        elements.userRoleName.textContent = roleNames[userInfo.role];
        elements.userRoleName.className = `badge badge-${getRoleClass(userInfo.role)}`;
    }
    if (elements.userDepartment) elements.userDepartment.textContent = userInfo.department || 'Public';
}

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
        
        // Save to localStorage (backward compatibility)
        localStorage.setItem('evidUser_' + userAccount, JSON.stringify(formData));
        
        // Save to IndexedDB for persistent storage
        formData.walletAddress = userAccount;
        await storage.saveUser(formData);
        
        showLoading(false);
        showAlert('Registration successful! Redirecting to dashboard...', 'success');
        
        setTimeout(() => {
            const dashboardUrl = roleDashboards[formData.role] || 'dashboard-public-viewer.html';
            window.location.href = dashboardUrl;
        }, 2000);
        
    } catch (error) {
        showLoading(false);
        console.error('Registration error:', error);
        showAlert('Registration failed: ' + error.message, 'error');
    }
}

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
        department: role === 1 ? 'Public' : document.getElementById('department')?.value,
        badgeNumber: role === 1 ? '' : document.getElementById('badgeNumber')?.value,
        jurisdiction: role === 1 ? 'Public' : document.getElementById('jurisdiction')?.value,
        registrationDate: Date.now(),
        isRegistered: true,
        isActive: true
    };
}

async function goToDashboard() {
    try {
        const savedUser = localStorage.getItem('evidUser_' + userAccount);
        if (savedUser) {
            const userInfo = JSON.parse(savedUser);
            const dashboardUrl = roleDashboards[userInfo.role] || 'dashboard-public-viewer.html';
            window.location.href = dashboardUrl;
        } else {
            showAlert('User data not found. Please register again.', 'error');
        }
    } catch (error) {
        console.error('Dashboard navigation error:', error);
        showAlert('Error navigating to dashboard: ' + error.message, 'error');
    }
}

function getRoleClass(role) {
    const roleClasses = {
        1: 'public', 2: 'investigator', 3: 'forensic', 4: 'legal',
        5: 'court', 6: 'manager', 7: 'auditor', 8: 'admin'
    };
    return roleClasses[role] || 'public';
}

function showLoading(show) {
    const modal = document.getElementById('loadingModal');
    if (modal) modal.classList.toggle('active', show);
}

function showAlert(message, type) {
    // Remove existing alerts
    document.querySelectorAll('.alert').forEach(alert => alert.remove());
    
    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    alert.innerHTML = message;
    
    const container = document.querySelector('.container');
    if (container) {
        container.insertBefore(alert, container.firstChild);
        setTimeout(() => alert.remove(), 5000);
    }
}

// Ethereum event listeners
if (window.ethereum) {
    window.ethereum.on('accountsChanged', () => location.reload());
    window.ethereum.on('chainChanged', () => location.reload());
}