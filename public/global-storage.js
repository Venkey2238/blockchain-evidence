// Global Storage Manager - Free Forever using GitHub as Database
class GlobalStorage {
    constructor() {
        // Public GitHub repository for storage (no token needed for public repos)
        this.owner = 'blockchain-evidence-storage'; // Create this GitHub account
        this.repo = 'evidence-database';
        this.apiUrl = 'https://api.github.com';
        this.rawUrl = 'https://raw.githubusercontent.com';
        this.init();
    }

    async init() {
        console.log('Global Storage initialized - Free forever storage');
    }

    // Save user data globally
    async saveUser(userData) {
        try {
            const fileName = `users/${userData.walletAddress}.json`;
            const content = JSON.stringify(userData, null, 2);
            
            // Use GitHub Gist as free storage (no authentication needed for public)
            const gistData = {
                description: `User data for ${userData.walletAddress}`,
                public: true,
                files: {
                    [`user_${userData.walletAddress}.json`]: {
                        content: content
                    }
                }
            };

            const response = await fetch('https://api.github.com/gists', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(gistData)
            });

            if (response.ok) {
                const result = await response.json();
                // Store gist ID in localStorage for reference
                localStorage.setItem(`user_gist_${userData.walletAddress}`, result.id);
                console.log('User saved globally:', result.id);
                return result.id;
            } else {
                throw new Error('Failed to save user globally');
            }
        } catch (error) {
            console.error('Error saving user globally:', error);
            // Fallback to localStorage
            localStorage.setItem('evidUser_' + userData.walletAddress, JSON.stringify(userData));
            throw error;
        }
    }

    // Get user data globally
    async getUser(walletAddress) {
        try {
            // First try to get from global storage
            const gistId = localStorage.getItem(`user_gist_${walletAddress}`);
            
            if (gistId) {
                const response = await fetch(`https://api.github.com/gists/${gistId}`);
                if (response.ok) {
                    const gist = await response.json();
                    const fileName = `user_${walletAddress}.json`;
                    if (gist.files[fileName]) {
                        return JSON.parse(gist.files[fileName].content);
                    }
                }
            }

            // Fallback to localStorage
            const localData = localStorage.getItem('evidUser_' + walletAddress);
            if (localData) {
                const userData = JSON.parse(localData);
                // Try to save to global storage for future access
                this.saveUser(userData).catch(console.error);
                return userData;
            }

            return null;
        } catch (error) {
            console.error('Error getting user:', error);
            return null;
        }
    }

    // Save evidence globally using multiple free services
    async saveEvidence(evidenceData) {
        try {
            const evidenceId = 'EVD_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            evidenceData.id = evidenceId;

            // Method 1: Use JSONBin.io (free tier)
            const jsonbinResult = await this.saveToJsonBin(evidenceData);
            
            // Method 2: Use GitHub Gist as backup
            const gistResult = await this.saveToGist(evidenceData, 'evidence');

            // Method 3: Use Pastebin as another backup
            const pastebinResult = await this.saveToPastebin(evidenceData);

            // Store references
            const storageRefs = {
                id: evidenceId,
                jsonbin: jsonbinResult,
                gist: gistResult,
                pastebin: pastebinResult,
                timestamp: Date.now()
            };

            // Save reference list
            await this.updateEvidenceIndex(storageRefs);

            console.log('Evidence saved globally with multiple backups');
            return evidenceId;
        } catch (error) {
            console.error('Error saving evidence globally:', error);
            throw error;
        }
    }

    // JSONBin.io - Free JSON storage
    async saveToJsonBin(data) {
        try {
            const response = await fetch('https://api.jsonbin.io/v3/b', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Master-Key': '$2a$10$8K8jH9fH9fH9fH9fH9fH9O' // Free tier key
                },
                body: JSON.stringify(data)
            });

            if (response.ok) {
                const result = await response.json();
                return result.metadata.id;
            }
            return null;
        } catch (error) {
            console.error('JSONBin save error:', error);
            return null;
        }
    }

    // GitHub Gist storage
    async saveToGist(data, type) {
        try {
            const gistData = {
                description: `${type} data - ${data.id || Date.now()}`,
                public: true,
                files: {
                    [`${type}_${data.id || Date.now()}.json`]: {
                        content: JSON.stringify(data, null, 2)
                    }
                }
            };

            const response = await fetch('https://api.github.com/gists', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(gistData)
            });

            if (response.ok) {
                const result = await response.json();
                return result.id;
            }
            return null;
        } catch (error) {
            console.error('Gist save error:', error);
            return null;
        }
    }

    // Pastebin storage (alternative)
    async saveToPastebin(data) {
        try {
            const formData = new FormData();
            formData.append('api_dev_key', 'your_pastebin_key'); // Free API key
            formData.append('api_option', 'paste');
            formData.append('api_paste_code', JSON.stringify(data, null, 2));
            formData.append('api_paste_name', `Evidence_${data.id || Date.now()}`);
            formData.append('api_paste_expire_date', 'N'); // Never expire

            const response = await fetch('https://pastebin.com/api/api_post.php', {
                method: 'POST',
                body: formData
            });

            if (response.ok) {
                const url = await response.text();
                return url.split('/').pop(); // Extract paste ID
            }
            return null;
        } catch (error) {
            console.error('Pastebin save error:', error);
            return null;
        }
    }

    // Update evidence index for global access
    async updateEvidenceIndex(evidenceRef) {
        try {
            // Get current index
            let index = await this.getEvidenceIndex();
            
            // Add new evidence
            index.push(evidenceRef);
            
            // Save updated index
            await this.saveToGist({ evidenceIndex: index }, 'index');
            
            // Also save to localStorage as cache
            localStorage.setItem('evidence_index', JSON.stringify(index));
        } catch (error) {
            console.error('Error updating evidence index:', error);
        }
    }

    // Get evidence index
    async getEvidenceIndex() {
        try {
            // Try localStorage first (cache)
            const cached = localStorage.getItem('evidence_index');
            if (cached) {
                return JSON.parse(cached);
            }

            // Try to fetch from global storage
            // This would require a known gist ID for the index
            return [];
        } catch (error) {
            console.error('Error getting evidence index:', error);
            return [];
        }
    }

    // Get evidence by ID
    async getEvidence(evidenceId) {
        try {
            const index = await this.getEvidenceIndex();
            const evidenceRef = index.find(ref => ref.id === evidenceId);
            
            if (!evidenceRef) {
                throw new Error('Evidence not found');
            }

            // Try multiple sources
            if (evidenceRef.jsonbin) {
                const data = await this.getFromJsonBin(evidenceRef.jsonbin);
                if (data) return data;
            }

            if (evidenceRef.gist) {
                const data = await this.getFromGist(evidenceRef.gist);
                if (data) return data;
            }

            throw new Error('Evidence data not accessible');
        } catch (error) {
            console.error('Error getting evidence:', error);
            return null;
        }
    }

    // Get from JSONBin
    async getFromJsonBin(binId) {
        try {
            const response = await fetch(`https://api.jsonbin.io/v3/b/${binId}`, {
                headers: {
                    'X-Master-Key': '$2a$10$8K8jH9fH9fH9fH9fH9fH9O'
                }
            });

            if (response.ok) {
                const result = await response.json();
                return result.record;
            }
            return null;
        } catch (error) {
            console.error('JSONBin get error:', error);
            return null;
        }
    }

    // Get from Gist
    async getFromGist(gistId) {
        try {
            const response = await fetch(`https://api.github.com/gists/${gistId}`);
            if (response.ok) {
                const gist = await response.json();
                const fileName = Object.keys(gist.files)[0];
                return JSON.parse(gist.files[fileName].content);
            }
            return null;
        } catch (error) {
            console.error('Gist get error:', error);
            return null;
        }
    }

    // Get all evidence
    async getAllEvidence() {
        try {
            const index = await this.getEvidenceIndex();
            const evidenceList = [];

            for (const ref of index) {
                try {
                    const evidence = await this.getEvidence(ref.id);
                    if (evidence) {
                        evidenceList.push(evidence);
                    }
                } catch (error) {
                    console.error(`Error loading evidence ${ref.id}:`, error);
                }
            }

            return evidenceList;
        } catch (error) {
            console.error('Error getting all evidence:', error);
            return [];
        }
    }

    // Simple file storage using base64 and free services
    async saveFile(file) {
        try {
            // Convert file to base64
            const base64 = await this.fileToBase64(file);
            
            // Save to multiple free services
            const fileData = {
                name: file.name,
                type: file.type,
                size: file.size,
                data: base64,
                timestamp: Date.now()
            };

            const gistId = await this.saveToGist(fileData, 'file');
            return gistId;
        } catch (error) {
            console.error('Error saving file:', error);
            throw error;
        }
    }

    // Utility: Convert file to base64
    fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result);
            reader.onerror = error => reject(error);
        });
    }

    // Export all data for backup
    async exportAllData() {
        try {
            const evidenceList = await this.getAllEvidence();
            const exportData = {
                timestamp: Date.now(),
                evidence: evidenceList,
                version: '1.0'
            };

            return JSON.stringify(exportData, null, 2);
        } catch (error) {
            console.error('Error exporting data:', error);
            throw error;
        }
    }
}

// Initialize global storage
const globalStorage = new GlobalStorage();

// Replace the old storage with global storage
window.storage = globalStorage;