// Firebase Free Database - Global Access
class FirebaseStorage {
    constructor() {
        // Firebase config (free tier - 1GB storage, 10GB/month transfer)
        this.firebaseConfig = {
            apiKey: "AIzaSyA5KA2m-dhDm7pZIIXHp4vgCt9waMAkpZo",
            authDomain: "evidence-database.firebaseapp.com",
            databaseURL: "https://evidence-database-default-rtdb.firebaseio.com",
            projectId: "evidence-database",
            storageBucket: "evidence-database.firebasestorage.app",
            messagingSenderId: "784311579434",
            appId: "1:784311579434:web:c4dfc118b9ae7fd6696453"
        };
        
        this.dbUrl = "https://evidence-database-default-rtdb.firebaseio.com";
        this.init();
    }

    async init() {
        console.log('Firebase Storage initialized - Free global database');
    }

    // Save user data
    async saveUser(userData) {
        try {
            const response = await fetch(`${this.dbUrl}/users/${userData.walletAddress}.json`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    ...userData,
                    lastUpdated: Date.now()
                })
            });

            if (response.ok) {
                console.log('User saved to global database');
                return true;
            } else {
                throw new Error('Failed to save user');
            }
        } catch (error) {
            console.error('Error saving user:', error);
            // Fallback to localStorage
            localStorage.setItem('evidUser_' + userData.walletAddress, JSON.stringify(userData));
            return false;
        }
    }

    // Get user data
    async getUser(walletAddress) {
        try {
            const response = await fetch(`${this.dbUrl}/users/${walletAddress}.json`);
            
            if (response.ok) {
                const userData = await response.json();
                if (userData) {
                    return userData;
                }
            }

            // Fallback to localStorage
            const localData = localStorage.getItem('evidUser_' + walletAddress);
            if (localData) {
                const userData = JSON.parse(localData);
                // Try to sync to global database
                this.saveUser(userData).catch(console.error);
                return userData;
            }

            return null;
        } catch (error) {
            console.error('Error getting user:', error);
            return null;
        }
    }

    // Save evidence
    async saveEvidence(evidenceData) {
        try {
            const evidenceId = 'EVD_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            evidenceData.id = evidenceId;
            evidenceData.timestamp = Date.now();

            const response = await fetch(`${this.dbUrl}/evidence/${evidenceId}.json`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(evidenceData)
            });

            if (response.ok) {
                // Also update evidence index
                await this.updateEvidenceIndex(evidenceId, evidenceData);
                console.log('Evidence saved to global database');
                return evidenceId;
            } else {
                throw new Error('Failed to save evidence');
            }
        } catch (error) {
            console.error('Error saving evidence:', error);
            throw error;
        }
    }

    // Update evidence index for quick access
    async updateEvidenceIndex(evidenceId, evidenceData) {
        try {
            const indexEntry = {
                id: evidenceId,
                title: evidenceData.title,
                caseId: evidenceData.caseId,
                type: evidenceData.type,
                submittedBy: evidenceData.submittedBy,
                timestamp: evidenceData.timestamp,
                status: evidenceData.status || 'pending'
            };

            await fetch(`${this.dbUrl}/evidence_index/${evidenceId}.json`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(indexEntry)
            });
        } catch (error) {
            console.error('Error updating evidence index:', error);
        }
    }

    // Get evidence by ID
    async getEvidence(evidenceId) {
        try {
            const response = await fetch(`${this.dbUrl}/evidence/${evidenceId}.json`);
            
            if (response.ok) {
                const evidence = await response.json();
                return evidence;
            }
            
            return null;
        } catch (error) {
            console.error('Error getting evidence:', error);
            return null;
        }
    }

    // Get all evidence
    async getAllEvidence() {
        try {
            const response = await fetch(`${this.dbUrl}/evidence_index.json`);
            
            if (response.ok) {
                const index = await response.json();
                if (index) {
                    return Object.values(index);
                }
            }
            
            return [];
        } catch (error) {
            console.error('Error getting all evidence:', error);
            return [];
        }
    }

    // Save case
    async saveCase(caseData) {
        try {
            const caseId = 'CASE_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            caseData.id = caseId;
            caseData.timestamp = Date.now();

            const response = await fetch(`${this.dbUrl}/cases/${caseId}.json`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(caseData)
            });

            if (response.ok) {
                console.log('Case saved to global database');
                return caseId;
            } else {
                throw new Error('Failed to save case');
            }
        } catch (error) {
            console.error('Error saving case:', error);
            throw error;
        }
    }

    // Get all cases
    async getAllCases() {
        try {
            const response = await fetch(`${this.dbUrl}/cases.json`);
            
            if (response.ok) {
                const cases = await response.json();
                if (cases) {
                    return Object.values(cases);
                }
            }
            
            return [];
        } catch (error) {
            console.error('Error getting cases:', error);
            return [];
        }
    }

    // Log activity
    async logActivity(userId, action, details) {
        try {
            const logId = Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            const logData = {
                id: logId,
                userId: userId,
                action: action,
                details: details,
                timestamp: Date.now(),
                ip: await this.getClientIP()
            };

            await fetch(`${this.dbUrl}/logs/${logId}.json`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(logData)
            });
        } catch (error) {
            console.error('Error logging activity:', error);
        }
    }

    // Get activity logs
    async getActivityLogs(userId = null, limit = 100) {
        try {
            const response = await fetch(`${this.dbUrl}/logs.json`);
            
            if (response.ok) {
                const logs = await response.json();
                if (logs) {
                    let logArray = Object.values(logs);
                    
                    if (userId) {
                        logArray = logArray.filter(log => log.userId === userId);
                    }
                    
                    return logArray.slice(-limit);
                }
            }
            
            return [];
        } catch (error) {
            console.error('Error getting activity logs:', error);
            return [];
        }
    }

    // Utility functions
    async getClientIP() {
        try {
            const response = await fetch('https://api.ipify.org?format=json');
            const data = await response.json();
            return data.ip;
        } catch (error) {
            return 'unknown';
        }
    }

    // File handling
    fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result);
            reader.onerror = error => reject(error);
        });
    }

    // Generate hash for integrity
    async generateHash(data) {
        const encoder = new TextEncoder();
        const dataBuffer = encoder.encode(data);
        const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    // Export all data
    async exportAllData() {
        try {
            const [users, evidence, cases, logs] = await Promise.all([
                fetch(`${this.dbUrl}/users.json`).then(r => r.json()),
                fetch(`${this.dbUrl}/evidence.json`).then(r => r.json()),
                fetch(`${this.dbUrl}/cases.json`).then(r => r.json()),
                fetch(`${this.dbUrl}/logs.json`).then(r => r.json())
            ]);

            const exportData = {
                timestamp: Date.now(),
                users: users || {},
                evidence: evidence || {},
                cases: cases || {},
                logs: logs || {}
            };

            return JSON.stringify(exportData, null, 2);
        } catch (error) {
            console.error('Error exporting data:', error);
            throw error;
        }
    }
}

// Initialize Firebase storage
const firebaseStorage = new FirebaseStorage();

// Use Firebase as the main storage
window.storage = firebaseStorage;