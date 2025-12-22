// Storage Manager - Free Persistent Storage Solution
class StorageManager {
    constructor() {
        this.dbName = 'EvidenceDB';
        this.dbVersion = 1;
        this.db = null;
        this.init();
    }

    async init() {
        try {
            this.db = await this.openDB();
            console.log('Storage initialized successfully');
        } catch (error) {
            console.error('Storage initialization failed:', error);
        }
    }

    openDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);
            
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                // Users store
                if (!db.objectStoreNames.contains('users')) {
                    const userStore = db.createObjectStore('users', { keyPath: 'walletAddress' });
                    userStore.createIndex('role', 'role', { unique: false });
                    userStore.createIndex('department', 'department', { unique: false });
                }
                
                // Evidence store
                if (!db.objectStoreNames.contains('evidence')) {
                    const evidenceStore = db.createObjectStore('evidence', { keyPath: 'id', autoIncrement: true });
                    evidenceStore.createIndex('caseId', 'caseId', { unique: false });
                    evidenceStore.createIndex('submittedBy', 'submittedBy', { unique: false });
                    evidenceStore.createIndex('timestamp', 'timestamp', { unique: false });
                    evidenceStore.createIndex('status', 'status', { unique: false });
                }
                
                // Cases store
                if (!db.objectStoreNames.contains('cases')) {
                    const caseStore = db.createObjectStore('cases', { keyPath: 'id', autoIncrement: true });
                    caseStore.createIndex('createdBy', 'createdBy', { unique: false });
                    caseStore.createIndex('status', 'status', { unique: false });
                    caseStore.createIndex('priority', 'priority', { unique: false });
                }
                
                // Activity logs store
                if (!db.objectStoreNames.contains('logs')) {
                    const logStore = db.createObjectStore('logs', { keyPath: 'id', autoIncrement: true });
                    logStore.createIndex('userId', 'userId', { unique: false });
                    logStore.createIndex('action', 'action', { unique: false });
                    logStore.createIndex('timestamp', 'timestamp', { unique: false });
                }
            };
        });
    }

    // User Management
    async saveUser(userData) {
        try {
            const transaction = this.db.transaction(['users'], 'readwrite');
            const store = transaction.objectStore('users');
            
            const userRecord = {
                walletAddress: userData.walletAddress,
                fullName: userData.fullName,
                role: userData.role,
                department: userData.department,
                badgeNumber: userData.badgeNumber,
                jurisdiction: userData.jurisdiction,
                registrationDate: userData.registrationDate || Date.now(),
                lastLogin: Date.now(),
                isActive: true
            };
            
            await store.put(userRecord);
            await this.logActivity(userData.walletAddress, 'USER_REGISTERED', 'User registered successfully');
            return userRecord;
        } catch (error) {
            console.error('Error saving user:', error);
            throw error;
        }
    }

    async getUser(walletAddress) {
        try {
            const transaction = this.db.transaction(['users'], 'readonly');
            const store = transaction.objectStore('users');
            return await store.get(walletAddress);
        } catch (error) {
            console.error('Error getting user:', error);
            return null;
        }
    }

    // Evidence Management
    async saveEvidence(evidenceData) {
        try {
            const transaction = this.db.transaction(['evidence'], 'readwrite');
            const store = transaction.objectStore('evidence');
            
            const evidenceRecord = {
                caseId: evidenceData.caseId,
                title: evidenceData.title,
                description: evidenceData.description,
                type: evidenceData.type,
                fileData: evidenceData.fileData, // Base64 encoded file
                fileName: evidenceData.fileName,
                fileSize: evidenceData.fileSize,
                hash: evidenceData.hash,
                submittedBy: evidenceData.submittedBy,
                timestamp: Date.now(),
                status: 'pending',
                chainOfCustody: [{
                    action: 'submitted',
                    by: evidenceData.submittedBy,
                    timestamp: Date.now()
                }]
            };
            
            const result = await store.add(evidenceRecord);
            await this.logActivity(evidenceData.submittedBy, 'EVIDENCE_SUBMITTED', `Evidence submitted: ${evidenceData.title}`);
            return result;
        } catch (error) {
            console.error('Error saving evidence:', error);
            throw error;
        }
    }

    async getEvidence(evidenceId) {
        try {
            const transaction = this.db.transaction(['evidence'], 'readonly');
            const store = transaction.objectStore('evidence');
            return await store.get(evidenceId);
        } catch (error) {
            console.error('Error getting evidence:', error);
            return null;
        }
    }

    async getAllEvidence(caseId = null) {
        try {
            const transaction = this.db.transaction(['evidence'], 'readonly');
            const store = transaction.objectStore('evidence');
            
            if (caseId) {
                const index = store.index('caseId');
                return await index.getAll(caseId);
            }
            
            return await store.getAll();
        } catch (error) {
            console.error('Error getting all evidence:', error);
            return [];
        }
    }

    // Case Management
    async saveCase(caseData) {
        try {
            const transaction = this.db.transaction(['cases'], 'readwrite');
            const store = transaction.objectStore('cases');
            
            const caseRecord = {
                title: caseData.title,
                description: caseData.description,
                priority: caseData.priority,
                createdBy: caseData.createdBy,
                assignedTo: caseData.assignedTo,
                status: 'open',
                createdDate: Date.now(),
                lastModified: Date.now()
            };
            
            const result = await store.add(caseRecord);
            await this.logActivity(caseData.createdBy, 'CASE_CREATED', `Case created: ${caseData.title}`);
            return result;
        } catch (error) {
            console.error('Error saving case:', error);
            throw error;
        }
    }

    async getAllCases() {
        try {
            const transaction = this.db.transaction(['cases'], 'readonly');
            const store = transaction.objectStore('cases');
            return await store.getAll();
        } catch (error) {
            console.error('Error getting cases:', error);
            return [];
        }
    }

    // Activity Logging
    async logActivity(userId, action, details) {
        try {
            const transaction = this.db.transaction(['logs'], 'readwrite');
            const store = transaction.objectStore('logs');
            
            const logRecord = {
                userId: userId,
                action: action,
                details: details,
                timestamp: Date.now(),
                ipAddress: await this.getClientIP()
            };
            
            await store.add(logRecord);
        } catch (error) {
            console.error('Error logging activity:', error);
        }
    }

    async getActivityLogs(userId = null, limit = 100) {
        try {
            const transaction = this.db.transaction(['logs'], 'readonly');
            const store = transaction.objectStore('logs');
            
            if (userId) {
                const index = store.index('userId');
                return await index.getAll(userId);
            }
            
            const logs = await store.getAll();
            return logs.slice(-limit); // Get last N logs
        } catch (error) {
            console.error('Error getting activity logs:', error);
            return [];
        }
    }

    // Backup and Export
    async exportData() {
        try {
            const users = await this.getAllUsers();
            const evidence = await this.getAllEvidence();
            const cases = await this.getAllCases();
            const logs = await this.getActivityLogs();
            
            const exportData = {
                timestamp: Date.now(),
                users: users,
                evidence: evidence,
                cases: cases,
                logs: logs
            };
            
            return JSON.stringify(exportData, null, 2);
        } catch (error) {
            console.error('Error exporting data:', error);
            throw error;
        }
    }

    async importData(jsonData) {
        try {
            const data = JSON.parse(jsonData);
            
            // Import users
            if (data.users) {
                for (const user of data.users) {
                    await this.saveUser(user);
                }
            }
            
            // Import cases
            if (data.cases) {
                for (const caseItem of data.cases) {
                    await this.saveCase(caseItem);
                }
            }
            
            // Import evidence
            if (data.evidence) {
                for (const evidence of data.evidence) {
                    await this.saveEvidence(evidence);
                }
            }
            
            console.log('Data imported successfully');
        } catch (error) {
            console.error('Error importing data:', error);
            throw error;
        }
    }

    // Utility functions
    async getAllUsers() {
        try {
            const transaction = this.db.transaction(['users'], 'readonly');
            const store = transaction.objectStore('users');
            return await store.getAll();
        } catch (error) {
            console.error('Error getting all users:', error);
            return [];
        }
    }

    async getClientIP() {
        try {
            const response = await fetch('https://api.ipify.org?format=json');
            const data = await response.json();
            return data.ip;
        } catch (error) {
            return 'unknown';
        }
    }

    // File handling utilities
    fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result);
            reader.onerror = error => reject(error);
        });
    }

    base64ToBlob(base64, mimeType) {
        const byteCharacters = atob(base64.split(',')[1]);
        const byteNumbers = new Array(byteCharacters.length);
        
        for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        
        const byteArray = new Uint8Array(byteNumbers);
        return new Blob([byteArray], { type: mimeType });
    }

    // Generate hash for evidence integrity
    async generateHash(data) {
        const encoder = new TextEncoder();
        const dataBuffer = encoder.encode(data);
        const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }
}

// Initialize storage manager
const storage = new StorageManager();

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = StorageManager;
}