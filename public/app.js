// Simplified Evidence Management System
let web3, userAccount;

const roleNames = {
    1: 'Public Viewer', 2: 'Investigator', 3: 'Forensic Analyst',
    4: 'Legal Professional', 5: 'Court Official', 6: 'Evidence Manager',
    7: 'Auditor', 8: 'Administrator'
};

// Initialize app
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}

async function initializeApp() {
    try {
        const connectBtn = document.getElementById('connectWallet');
        const regForm = document.getElementById('registrationForm');
        const dashBtn = document.getElementById('goToDashboard');
        
        if (connectBtn) connectBtn.addEventListener('click', connectWallet);
        if (regForm) regForm.addEventListener('submit', handleRegistration);
        if (dashBtn) dashBtn.addEventListener('click', goToDashboard);

        // Auto-connect if MetaMask is available
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
        
        // Demo mode for testing
        if (!window.ethereum) {
            userAccount = '0x1234567890123456789012345678901234567890';
            updateWalletUI();
            await checkRegistrationStatus();
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
        connectBtn.textContent = 'Connected';
        connectBtn.disabled = true;
    }
}

async function checkRegistrationStatus() {
    try {
        if (!userAccount) {
            showAlert('Please connect your wallet first.', 'error');
            return;
        }
        
        // Check database first
        let userInfo = await storage.getUser(userAccount);
        
        // Fallback to localStorage
        if (!userInfo) {
            const savedUser = localStorage.getItem('evidUser_' + userAccount);
            if (savedUser) {
                userInfo = JSON.parse(savedUser);
            }
        }
        
        if (userInfo) {
            updateUserUI(userInfo);
            toggleSections('alreadyRegistered');
            return;
        }
        
        toggleSections('registration');
    } catch (error) {
        console.error('Registration check error:', error);
        showAlert('Error checking registration. Please try again.', 'error');
        toggleSections('registration');
    }
}

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
        
        // Save to localStorage for immediate access
        localStorage.setItem('evidUser_' + userAccount, JSON.stringify(formData));
        
        // Save to database
        formData.walletAddress = userAccount;
        const saved = await storage.saveUser(formData);
        
        // Set current user
        localStorage.setItem('currentUser', userAccount);
        
        showLoading(false);
        
        if (saved) {
            showAlert('Registration successful! Redirecting to dashboard...', 'success');
        } else {
            showAlert('Registration saved locally. Database sync will retry later.', 'info');
        }
        
        setTimeout(() => {
            window.location.href = 'dashboard.html';
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
        department: role === 1 ? 'Public' : document.getElementById('department')?.value || 'Unknown',
        badgeNumber: role === 1 ? '' : document.getElementById('badgeNumber')?.value || '',
        jurisdiction: role === 1 ? 'Public' : document.getElementById('jurisdiction')?.value || 'Unknown',
        registrationDate: Date.now(),
        isRegistered: true,
        isActive: true
    };
}

async function goToDashboard() {
    try {
        localStorage.setItem('currentUser', userAccount);
        window.location.href = 'dashboard.html';
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

// Ethereum event listeners
if (window.ethereum) {
    window.ethereum.on('accountsChanged', () => location.reload());
    window.ethereum.on('chainChanged', () => location.reload());
}