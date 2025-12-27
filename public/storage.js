// Minimal Storage & Evidence Manager
class Storage {
    constructor() {
        this.apiUrl = `${config.SUPABASE_URL}/rest/v1`;
        this.headers = {
            'Content-Type': 'application/json',
            'apikey': config.SUPABASE_KEY,
            'Authorization': `Bearer ${config.SUPABASE_KEY}`
        };
    }

    // User Management
    async saveUser(userData) {
        try {
            const response = await fetch(`${this.apiUrl}/users`, {
                method: 'POST',
                headers: this.headers,
                body: JSON.stringify({
                    wallet_address: userData.walletAddress,
                    full_name: userData.fullName,
                    role: userData.role,
                    department: userData.department || 'Public',
                    badge_number: userData.badgeNumber || '',
                    jurisdiction: userData.jurisdiction || 'Public',
                    registration_date: new Date().toISOString(),
                    is_active: true
                })
            });
            
            if (response.ok) {
                console.log('User saved to database successfully');
                return true;
            } else {
                console.error('Database save failed, using localStorage fallback');
                return false;
            }
        } catch (error) {
            console.error('Database connection error:', error);
            return false;
        }
    }

    async getUser(walletAddress) {
        try {
            const response = await fetch(`${this.apiUrl}/users?wallet_address=eq.${walletAddress}`, {
                headers: this.headers
            });
            
            if (response.ok) {
                const users = await response.json();
                if (users.length > 0) {
                    console.log('User found in database');
                    return users[0];
                }
            }
            
            console.log('User not found in database, checking localStorage');
            return null;
        } catch (error) {
            console.error('Database connection error:', error);
            return null;
        }
    }

    // Evidence Management
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

    // Activity Logging
    async logActivity(userId, action, details) {
        try {
            await fetch(`${this.apiUrl}/activity_logs`, {
                method: 'POST',
                headers: this.headers,
                body: JSON.stringify({
                    user_id: userId,
                    action: action,
                    details: details,
                    timestamp: new Date().toISOString(),
                    ip_address: 'unknown'
                })
            });
        } catch (error) {
            console.error('Log activity error:', error);
        }
    }

    // Utility Functions
    fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result);
            reader.onerror = error => reject(error);
        });
    }

    async generateHash(data) {
        const encoder = new TextEncoder();
        const dataBuffer = encoder.encode(data);
        const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    validateFile(file) {
        if (file.size > config.MAX_FILE_SIZE) {
            throw new Error('File size exceeds 50MB limit');
        }
        if (!config.ALLOWED_TYPES.some(type => file.type.startsWith(type.replace('*', '')))) {
            throw new Error('File type not allowed');
        }
        return true;
    }
}

// Initialize storage
window.storage = new Storage();