// GitHub Backup Manager - Free Cloud Storage
class GitHubBackup {
    constructor() {
        this.owner = 'your-github-username'; // Replace with your GitHub username
        this.repo = 'evidence-backup'; // Repository name for backups
        this.token = null; // Will be set by user
        this.apiUrl = 'https://api.github.com';
    }

    // Set GitHub token (user needs to provide this)
    setToken(token) {
        this.token = token;
        localStorage.setItem('github_token', token);
    }

    getToken() {
        if (!this.token) {
            this.token = localStorage.getItem('github_token');
        }
        return this.token;
    }

    // Create backup repository if it doesn't exist
    async createBackupRepo() {
        try {
            const token = this.getToken();
            if (!token) {
                throw new Error('GitHub token not set');
            }

            const response = await fetch(`${this.apiUrl}/user/repos`, {
                method: 'POST',
                headers: {
                    'Authorization': `token ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: this.repo,
                    description: 'Evidence Management System Backup',
                    private: true,
                    auto_init: true
                })
            });

            if (response.status === 201) {
                console.log('Backup repository created successfully');
                return true;
            } else if (response.status === 422) {
                console.log('Repository already exists');
                return true;
            } else {
                throw new Error('Failed to create repository');
            }
        } catch (error) {
            console.error('Error creating backup repo:', error);
            return false;
        }
    }

    // Upload backup to GitHub
    async uploadBackup(data, filename) {
        try {
            const token = this.getToken();
            if (!token) {
                throw new Error('GitHub token not set');
            }

            const content = btoa(unescape(encodeURIComponent(data)));
            const timestamp = new Date().toISOString();
            
            const response = await fetch(`${this.apiUrl}/repos/${this.owner}/${this.repo}/contents/${filename}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `token ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    message: `Backup created on ${timestamp}`,
                    content: content,
                    branch: 'main'
                })
            });

            if (response.ok) {
                console.log('Backup uploaded successfully');
                return true;
            } else {
                throw new Error('Failed to upload backup');
            }
        } catch (error) {
            console.error('Error uploading backup:', error);
            return false;
        }
    }

    // Download backup from GitHub
    async downloadBackup(filename) {
        try {
            const token = this.getToken();
            if (!token) {
                throw new Error('GitHub token not set');
            }

            const response = await fetch(`${this.apiUrl}/repos/${this.owner}/${this.repo}/contents/${filename}`, {
                headers: {
                    'Authorization': `token ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                const content = atob(data.content);
                return content;
            } else {
                throw new Error('Failed to download backup');
            }
        } catch (error) {
            console.error('Error downloading backup:', error);
            return null;
        }
    }

    // List all backups
    async listBackups() {
        try {
            const token = this.getToken();
            if (!token) {
                throw new Error('GitHub token not set');
            }

            const response = await fetch(`${this.apiUrl}/repos/${this.owner}/${this.repo}/contents/`, {
                headers: {
                    'Authorization': `token ${token}`
                }
            });

            if (response.ok) {
                const files = await response.json();
                return files.filter(file => file.name.endsWith('.json'));
            } else {
                throw new Error('Failed to list backups');
            }
        } catch (error) {
            console.error('Error listing backups:', error);
            return [];
        }
    }

    // Auto backup (daily)
    async scheduleAutoBackup() {
        const lastBackup = localStorage.getItem('last_backup');
        const now = Date.now();
        const oneDay = 24 * 60 * 60 * 1000;

        if (!lastBackup || (now - parseInt(lastBackup)) > oneDay) {
            await this.performBackup();
            localStorage.setItem('last_backup', now.toString());
        }
    }

    async performBackup() {
        try {
            const exportData = await storage.exportData();
            const filename = `backup_${new Date().toISOString().split('T')[0]}.json`;
            
            const success = await this.uploadBackup(exportData, filename);
            if (success) {
                showAlert('Backup completed successfully', 'success');
            } else {
                showAlert('Backup failed', 'error');
            }
        } catch (error) {
            console.error('Backup error:', error);
            showAlert('Backup error: ' + error.message, 'error');
        }
    }
}

// Initialize GitHub backup
const githubBackup = new GitHubBackup();