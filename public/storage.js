/**
 * Enhanced Storage with Admin Management & Test Accounts
 * @fileoverview Database storage layer for EVID-DGC application with Supabase integration
 * @author EVID-DGC Team
 * @version 1.0.0
 */

/**
 * Storage class for managing database operations
 * Handles user management, evidence storage, and admin operations with Supabase backend
 * @class Storage
 */
class Storage {
    /**
     * Initialize Storage instance with Supabase configuration
     * Sets up API URL and authentication headers for database operations
     * @constructor
     */
    constructor() {
        this.apiUrl = `${config.SUPABASE_URL}/rest/v1`;
        this.headers = {
            'Content-Type': 'application/json',
            'apikey': config.SUPABASE_KEY,
            'Authorization': `Bearer ${config.SUPABASE_KEY}`
        };
    }

    /**
     * Save user data to database with validation and security checks
     * Enhanced User Management with Security - validates role, prevents admin self-registration,
     * and saves user data to Supabase database with fallback to localStorage
     * @async
     * @method saveUser
     * @param {Object} userData - User data object
     * @param {string} userData.walletAddress - User's wallet address
     * @param {string} userData.fullName - User's full name
     * @param {string} userData.role - User's role (must be valid role)
     * @param {string} [userData.department] - User's department
     * @param {string} [userData.jurisdiction] - User's jurisdiction
     * @param {string} [userData.badgeNumber] - User's badge number
     * @param {string} [userData.accountType='real'] - Account type (real/test)
     * @param {string} [userData.createdBy='self'] - Who created this account
     * @returns {Promise<boolean>} True if successful, false if failed (allows localStorage fallback)
     * @throws {Error} If role is invalid or admin self-registration attempted
     */
    async saveUser(userData) {
        try {
            // Validate role
            const allowedRoles = ['public_viewer', 'investigator', 'forensic_analyst', 'legal_professional', 'court_official', 'evidence_manager', 'auditor', 'admin'];
            if (!allowedRoles.includes(userData.role)) {
                throw new Error('Invalid role specified');
            }

            // Prevent self-registration as admin (only if createdBy is 'self')
            if (userData.role === 'admin' && userData.createdBy === 'self') {
                throw new Error('Administrator role cannot be self-registered');
            }

            const response = await fetch(`${this.apiUrl}/users`, {
                method: 'POST',
                headers: this.headers,
                body: JSON.stringify({
                    wallet_address: userData.walletAddress,
                    full_name: userData.fullName,
                    role: userData.role,
                    department: userData.department || 'Public',
                    jurisdiction: userData.jurisdiction || 'Public',
                    badge_number: userData.badgeNumber || '',
                    account_type: userData.accountType || 'real',
                    created_by: userData.createdBy || 'self',
                    is_active: true
                })
            });
            
            if (response.ok) {
                console.log('User saved to database successfully');
                return true;
            } else {
                const error = await response.json();
                console.error('Database save failed:', error);
                return false; // Allow fallback to localStorage
            }
        } catch (error) {
            console.error('Database connection error:', error);
            return false; // Allow fallback to localStorage
        }
    }

    /**
     * Retrieve user data from database by wallet address
     * Fetches user information from Supabase database for active users only
     * @async
     * @method getUser
     * @param {string} walletAddress - The wallet address to search for
     * @returns {Promise<Object|null>} User object if found, null if not found or error
     */
    async getUser(walletAddress) {
        try {
            const response = await fetch(`${this.apiUrl}/users?wallet_address=eq.${walletAddress}&is_active=eq.true`, {
                headers: this.headers
            });
            
            if (response.ok) {
                const users = await response.json();
                if (users.length > 0) {
                    console.log('User found in database');
                    return users[0];
                }
            }
            
            console.log('User not found in database');
            return null;
        } catch (error) {
            console.error('Database connection error:', error);
            return null;
        }
    }

    /**
     * Create a regular user account (Admin-Only operation)
     * Allows administrators to create regular user accounts with validation and security checks
     * @async
     * @method createRegularUser
     * @param {string} adminWallet - Wallet address of the requesting administrator
     * @param {Object} userData - User data for the new account
     * @param {string} userData.walletAddress - New user's wallet address (must be valid format)
     * @param {string} userData.fullName - New user's full name
     * @param {string} userData.role - New user's role (cannot be admin)
     * @param {string} [userData.department='General'] - New user's department
     * @param {string} [userData.jurisdiction='General'] - New user's jurisdiction
     * @param {string} [userData.badgeNumber=''] - New user's badge number
     * @returns {Promise<boolean>} True if user created successfully
     * @throws {Error} If unauthorized, invalid role, invalid wallet format, or wallet already exists
     */
    async createRegularUser(adminWallet, userData) {
        try {
            // Verify the requesting user is actually an admin
            const requestingUser = await this.getUser(adminWallet);
            if (!requestingUser || requestingUser.role !== 'admin' || !requestingUser.is_active) {
                throw new Error('Unauthorized: Only active administrators can create user accounts');
            }

            // Validate role (cannot be admin)
            const allowedRoles = ['public_viewer', 'investigator', 'forensic_analyst', 'legal_professional', 'court_official', 'evidence_manager', 'auditor'];
            if (!allowedRoles.includes(userData.role)) {
                throw new Error('Invalid role specified for regular user');
            }

            // Validate wallet address format
            if (!userData.walletAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
                throw new Error('Invalid wallet address format');
            }

            // Check if wallet already exists
            const existingUser = await this.getUser(userData.walletAddress);
            if (existingUser) {
                throw new Error('Wallet address already registered');
            }

            const response = await fetch(`${this.apiUrl}/users`, {
                method: 'POST',
                headers: this.headers,
                body: JSON.stringify({
                    wallet_address: userData.walletAddress,
                    full_name: userData.fullName,
                    role: userData.role,
                    department: userData.department || 'General',
                    jurisdiction: userData.jurisdiction || 'General',
                    badge_number: userData.badgeNumber || '',
                    account_type: 'real',
                    created_by: adminWallet,
                    is_active: true
                })
            });

            if (response.ok) {
                await this.logAdminAction(adminWallet, 'create_user', userData.walletAddress, {
                    user_name: userData.fullName,
                    user_role: userData.role,
                    department: userData.department
                });
                return true;
            } else {
                const error = await response.json();
                throw new Error(error.message || 'Failed to create user');
            }
        } catch (error) {
            console.error('Error creating user:', error);
            throw error;
        }
    }

    /**
     * Get all users from database (Admin function)
     * Retrieves all user records ordered by creation date (newest first)
     * @async
     * @method getAllUsers
     * @returns {Promise<Array>} Array of user objects, empty array if error
     */
    async getAllUsers() {
        try {
            const response = await fetch(`${this.apiUrl}/users?order=created_at.desc`, {
                headers: this.headers
            });
            return response.ok ? await response.json() : [];
        } catch (error) {
            console.error('Error getting all users:', error);
            return [];
        }
    }

    async createRegularUser(adminWallet, userData) {
        try {
            const response = await fetch(`${this.apiUrl}/users`, {
                method: 'POST',
                headers: this.headers,
                body: JSON.stringify({
                    wallet_address: userData.walletAddress,
                    full_name: userData.fullName,
                    role: userData.role,
                    department: userData.department || 'General',
                    jurisdiction: userData.jurisdiction || 'General',
                    badge_number: userData.badgeNumber || '',
                    account_type: 'real',
                    created_by: adminWallet,
                    is_active: true
                })
            });

            if (response.ok) {
                await this.logAdminAction(adminWallet, 'create_user', userData.walletAddress, {
                    user_name: userData.fullName,
                    role: userData.role
                });
                return true;
            }
            return false;
        } catch (error) {
            console.error('Error creating user:', error);
            throw error;
        }
    }

    /**
     * Create a new administrator account (Admin-Only operation)
     * Allows existing administrators to create new admin accounts with limits and validation
     * @async
     * @method createAdminUser
     * @param {string} adminWallet - Wallet address of the requesting administrator
     * @param {Object} newAdminData - Data for the new administrator account
     * @param {string} newAdminData.walletAddress - New admin's wallet address (must be valid format)
     * @param {string} newAdminData.fullName - New admin's full name
     * @returns {Promise<boolean>} True if admin created successfully
     * @throws {Error} If unauthorized, admin limit reached, invalid wallet format, or wallet already exists
     */
    async createAdminUser(adminWallet, newAdminData) {
        try {
            // Verify the requesting user is actually an admin
            const requestingUser = await this.getUser(adminWallet);
            if (!requestingUser || requestingUser.role !== 'admin' || !requestingUser.is_active) {
                throw new Error('Unauthorized: Only active administrators can create admin accounts');
            }

            // Check if admin limit reached
            const admins = await this.getAdminCount();
            if (admins >= 10) {
                throw new Error('Maximum admin limit (10) reached');
            }

            // Validate wallet address format
            if (!newAdminData.walletAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
                throw new Error('Invalid wallet address format');
            }

            // Check if wallet already exists
            const existingUser = await this.getUser(newAdminData.walletAddress);
            if (existingUser) {
                throw new Error('Wallet address already registered');
            }

            const response = await fetch(`${this.apiUrl}/users`, {
                method: 'POST',
                headers: this.headers,
                body: JSON.stringify({
                    wallet_address: newAdminData.walletAddress,
                    full_name: newAdminData.fullName,
                    role: 'admin',
                    department: 'Administration',
                    jurisdiction: 'System',
                    account_type: 'real',
                    created_by: adminWallet,
                    is_active: true
                })
            });

            if (response.ok) {
                await this.logAdminAction(adminWallet, 'create_admin', newAdminData.walletAddress, {
                    admin_name: newAdminData.fullName
                });
                return true;
            } else {
                const error = await response.json();
                throw new Error(error.message || 'Failed to create admin user');
            }
        } catch (error) {
            console.error('Error creating admin:', error);
            throw error;
        }
    }

    async deleteUser(adminWallet, targetWallet) {
        try {
            // Verify the requesting user is actually an admin
            const requestingUser = await this.getUser(adminWallet);
            if (!requestingUser || requestingUser.role !== 'admin' || !requestingUser.is_active) {
                throw new Error('Unauthorized: Only active administrators can delete users');
            }

            // Prevent self-deletion
            if (adminWallet === targetWallet) {
                throw new Error('Administrators cannot delete their own account');
            }

            // Verify target user exists
            const targetUser = await this.getUser(targetWallet);
            if (!targetUser) {
                throw new Error('Target user not found');
            }

            // Perform soft delete
            const response = await fetch(`${this.apiUrl}/users?wallet_address=eq.${targetWallet}`, {
                method: 'PATCH',
                headers: this.headers,
                body: JSON.stringify({ 
                    is_active: false,
                    last_updated: new Date().toISOString()
                })
            });

            if (response.ok) {
                await this.logAdminAction(adminWallet, 'delete_user', targetWallet, {
                    action: 'soft_delete',
                    target_user_name: targetUser.full_name,
                    target_user_role: targetUser.role
                });
                return true;
            } else {
                const error = await response.json();
                throw new Error(error.message || 'Failed to delete user');
            }
        } catch (error) {
            console.error('Error deleting user:', error);
            throw error;
        }
    }

    async getAdminCount() {
        try {
            const response = await fetch(`${this.apiUrl}/users?role=eq.admin&is_active=eq.true&select=id`, {
                headers: this.headers
            });
            if (response.ok) {
                const admins = await response.json();
                return admins.length;
            }
            return 0;
        } catch (error) {
            console.error('Error getting admin count:', error);
            return 0;
        }
    }

    // Test Account Functions
    async createTestAccount(adminWallet, testData) {
        try {
            const testWallet = this.generateTestWallet();
            
            const response = await fetch(`${this.apiUrl}/users`, {
                method: 'POST',
                headers: this.headers,
                body: JSON.stringify({
                    wallet_address: testWallet,
                    full_name: testData.accountName,
                    role: testData.role,
                    department: 'Test Department',
                    jurisdiction: 'Test',
                    account_type: 'test',
                    created_by: adminWallet,
                    is_active: true
                })
            });

            if (response.ok) {
                await this.logAdminAction(adminWallet, 'create_test_account', testWallet, {
                    account_name: testData.accountName,
                    role: testData.role
                });
                return { success: true, testWallet, accountName: testData.accountName, role: testData.role };
            }
            return { success: false };
        } catch (error) {
            console.error('Error creating test account:', error);
            throw error;
        }
    }

    async getTestAccounts(adminWallet) {
        try {
            const response = await fetch(`${this.apiUrl}/users?account_type=eq.test&created_by=eq.${adminWallet}&is_active=eq.true&order=created_at.desc`, {
                headers: this.headers
            });
            return response.ok ? await response.json() : [];
        } catch (error) {
            console.error('Error getting test accounts:', error);
            return [];
        }
    }

    async deleteTestAccount(adminWallet, testWallet) {
        try {
            const response = await fetch(`${this.apiUrl}/users?wallet_address=eq.${testWallet}&account_type=eq.test`, {
                method: 'DELETE',
                headers: this.headers
            });

            if (response.ok) {
                await this.logAdminAction(adminWallet, 'delete_test_account', testWallet, {});
                return true;
            }
            return false;
        } catch (error) {
            console.error('Error deleting test account:', error);
            throw error;
        }
    }

    generateTestWallet() {
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substring(2, 8);
        return `0xtest${timestamp}${random}`.toLowerCase();
    }

    // Admin Action Logging
    async logAdminAction(adminWallet, actionType, targetWallet, details) {
        try {
            await fetch(`${this.apiUrl}/admin_actions`, {
                method: 'POST',
                headers: this.headers,
                body: JSON.stringify({
                    admin_wallet: adminWallet,
                    action_type: actionType,
                    target_wallet: targetWallet,
                    details: details
                })
            });
        } catch (error) {
            console.error('Error logging admin action:', error);
        }
    }

    // Evidence Management (existing functions)
    async saveEvidence(evidenceData) {
        try {
            const response = await fetch(`${this.apiUrl}/evidence`, {
                method: 'POST',
                headers: this.headers,
                body: JSON.stringify({
                    case_id: evidenceData.caseId,
                    title: evidenceData.title,
                    description: evidenceData.description,
                    type: evidenceData.type,
                    file_data: evidenceData.fileData,
                    file_name: evidenceData.fileName,
                    file_size: evidenceData.fileSize,
                    hash: evidenceData.hash,
                    submitted_by: evidenceData.submittedBy,
                    timestamp: new Date().toISOString(),
                    status: 'pending'
                })
            });
            if (response.ok) {
                const result = await response.json();
                return result[0]?.id;
            }
            throw new Error('Failed to save evidence');
        } catch (error) {
            console.error('Save evidence error:', error);
            throw error;
        }
    }

    async getAllEvidence() {
        try {
            const response = await fetch(`${this.apiUrl}/evidence?order=timestamp.desc`, {
                headers: this.headers
            });
            return response.ok ? await response.json() : [];
        } catch (error) {
            console.error('Get evidence error:', error);
            return [];
        }
    }

    async getEvidence(id) {
        try {
            const response = await fetch(`${this.apiUrl}/evidence?id=eq.${id}`, {
                headers: this.headers
            });
            if (response.ok) {
                const evidence = await response.json();
                return evidence.length > 0 ? evidence[0] : null;
            }
            return null;
        } catch (error) {
            console.error('Get evidence error:', error);
            return null;
        }
    }

    // System Overview Functions
    async getAllCases() {
        try {
            const response = await fetch(`${this.apiUrl}/cases?order=created_date.desc`, {
                headers: this.headers
            });
            return response.ok ? await response.json() : [];
        } catch (error) {
            console.error('Error getting cases:', error);
            return [];
        }
    }

    async getRecentActivity(limit = 10) {
        try {
            const response = await fetch(`${this.apiUrl}/activity_logs?order=timestamp.desc&limit=${limit}`, {
                headers: this.headers
            });
            return response.ok ? await response.json() : [];
        } catch (error) {
            console.error('Error getting recent activity:', error);
            return [];
        }
    }

    /**
     * Convert file to Base64 encoded string
     * Utility function to convert File objects to Base64 for storage
     * @method fileToBase64
     * @param {File} file - File object to convert
     * @returns {Promise<string>} Base64 encoded string representation of the file
     */
    fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result);
            reader.onerror = error => reject(error);
        });
    }

    /**
     * Generate SHA-256 hash of data
     * Creates a cryptographic hash of the provided data for integrity verification
     * @async
     * @method generateHash
     * @param {string} data - Data to hash
     * @returns {Promise<string>} Hexadecimal string representation of the hash
     */
    async generateHash(data) {
        const encoder = new TextEncoder();
        const dataBuffer = encoder.encode(data);
        const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    /**
     * Validate uploaded file against size and type restrictions
     * Checks file size and MIME type against configured limits
     * @method validateFile
     * @param {File} file - File object to validate
     * @returns {boolean} True if file is valid
     * @throws {Error} If file exceeds size limit or has invalid type
     */
    validateFile(file) {
        if (file.size > config.MAX_FILE_SIZE) {
            throw new Error('File size exceeds 50MB limit');
        }
        if (!config.ALLOWED_TYPES.some(type => file.type.startsWith(type.replace(/\*$/, '')))) {
            throw new Error('File type not allowed');
        }
        return true;
    }
}

/**
 * Global storage instance
 * Initialize and expose the Storage class instance for application use
 * @type {Storage}
 * @global
 */
window.storage = new Storage();