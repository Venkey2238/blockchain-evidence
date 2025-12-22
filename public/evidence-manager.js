// Evidence Management Functions
class EvidenceManager {
    constructor() {
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        // Evidence submission form
        const evidenceForm = document.getElementById('evidenceForm');
        if (evidenceForm) {
            evidenceForm.addEventListener('submit', this.handleEvidenceSubmission.bind(this));
        }

        // File input handler
        const fileInput = document.getElementById('evidenceFile');
        if (fileInput) {
            fileInput.addEventListener('change', this.handleFileSelection.bind(this));
        }

        // Load existing evidence
        this.loadEvidence();
    }

    async handleEvidenceSubmission(event) {
        event.preventDefault();
        
        try {
            showLoading(true);
            
            const formData = new FormData(event.target);
            const fileInput = document.getElementById('evidenceFile');
            const file = fileInput.files[0];
            
            if (!file) {
                showAlert('Please select a file to upload', 'error');
                showLoading(false);
                return;
            }

            // Convert file to base64
            const fileData = await storage.fileToBase64(file);
            const hash = await storage.generateHash(fileData);
            
            const evidenceData = {
                caseId: formData.get('caseId') || 'CASE-' + Date.now(),
                title: formData.get('title'),
                description: formData.get('description'),
                type: formData.get('type'),
                fileData: fileData,
                fileName: file.name,
                fileSize: file.size,
                hash: hash,
                submittedBy: userAccount
            };

            const evidenceId = await storage.saveEvidence(evidenceData);
            
            showLoading(false);
            showAlert('Evidence submitted successfully!', 'success');
            
            // Reset form
            event.target.reset();
            
            // Reload evidence list
            this.loadEvidence();
            
        } catch (error) {
            showLoading(false);
            console.error('Evidence submission error:', error);
            showAlert('Failed to submit evidence: ' + error.message, 'error');
        }
    }

    async handleFileSelection(event) {
        const file = event.target.files[0];
        if (file) {
            const fileInfo = document.getElementById('fileInfo');
            if (fileInfo) {
                fileInfo.innerHTML = `
                    <div class="file-preview">
                        <p><strong>File:</strong> ${file.name}</p>
                        <p><strong>Size:</strong> ${this.formatFileSize(file.size)}</p>
                        <p><strong>Type:</strong> ${file.type}</p>
                    </div>
                `;
            }
        }
    }

    async loadEvidence() {
        try {
            const evidenceList = await storage.getAllEvidence();
            const container = document.getElementById('evidenceList');
            
            if (!container) return;
            
            if (evidenceList.length === 0) {
                container.innerHTML = '<p class="text-muted">No evidence submitted yet.</p>';
                return;
            }

            container.innerHTML = evidenceList.map(evidence => `
                <div class="evidence-card card">
                    <div class="card-body">
                        <h5>${evidence.title}</h5>
                        <p class="text-muted">${evidence.description}</p>
                        <div class="evidence-meta">
                            <span class="badge badge-${this.getStatusClass(evidence.status)}">${evidence.status}</span>
                            <small class="text-muted">Case: ${evidence.caseId}</small>
                            <small class="text-muted">Submitted: ${new Date(evidence.timestamp).toLocaleDateString()}</small>
                        </div>
                        <div class="evidence-actions mt-3">
                            <button class="btn btn-sm btn-outline" onclick="evidenceManager.viewEvidence(${evidence.id})">View</button>
                            <button class="btn btn-sm btn-outline" onclick="evidenceManager.downloadEvidence(${evidence.id})">Download</button>
                        </div>
                    </div>
                </div>
            `).join('');
            
        } catch (error) {
            console.error('Error loading evidence:', error);
        }
    }

    async viewEvidence(evidenceId) {
        try {
            const evidence = await storage.getEvidence(evidenceId);
            if (!evidence) {
                showAlert('Evidence not found', 'error');
                return;
            }

            // Create modal to display evidence details
            const modal = document.createElement('div');
            modal.className = 'modal active';
            modal.innerHTML = `
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>Evidence Details</h3>
                        <button class="modal-close" onclick="this.closest('.modal').remove()">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div class="evidence-details">
                            <p><strong>Title:</strong> ${evidence.title}</p>
                            <p><strong>Description:</strong> ${evidence.description}</p>
                            <p><strong>Case ID:</strong> ${evidence.caseId}</p>
                            <p><strong>Type:</strong> ${evidence.type}</p>
                            <p><strong>File:</strong> ${evidence.fileName}</p>
                            <p><strong>Size:</strong> ${this.formatFileSize(evidence.fileSize)}</p>
                            <p><strong>Hash:</strong> <code>${evidence.hash}</code></p>
                            <p><strong>Submitted By:</strong> ${evidence.submittedBy}</p>
                            <p><strong>Timestamp:</strong> ${new Date(evidence.timestamp).toLocaleString()}</p>
                            <p><strong>Status:</strong> <span class="badge badge-${this.getStatusClass(evidence.status)}">${evidence.status}</span></p>
                        </div>
                        <div class="chain-of-custody">
                            <h4>Chain of Custody</h4>
                            ${evidence.chainOfCustody.map(entry => `
                                <div class="custody-entry">
                                    <strong>${entry.action}</strong> by ${entry.by} on ${new Date(entry.timestamp).toLocaleString()}
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
            
        } catch (error) {
            console.error('Error viewing evidence:', error);
            showAlert('Error loading evidence details', 'error');
        }
    }

    async downloadEvidence(evidenceId) {
        try {
            const evidence = await storage.getEvidence(evidenceId);
            if (!evidence) {
                showAlert('Evidence not found', 'error');
                return;
            }

            // Convert base64 back to blob and download
            const blob = storage.base64ToBlob(evidence.fileData, 'application/octet-stream');
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = evidence.fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            // Log download activity
            await storage.logActivity(userAccount, 'EVIDENCE_DOWNLOADED', `Downloaded evidence: ${evidence.title}`);
            
        } catch (error) {
            console.error('Error downloading evidence:', error);
            showAlert('Error downloading evidence', 'error');
        }
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    getStatusClass(status) {
        const statusClasses = {
            'pending': 'warning',
            'approved': 'success',
            'rejected': 'danger',
            'under_review': 'info'
        };
        return statusClasses[status] || 'secondary';
    }
}

// Initialize evidence manager
const evidenceManager = new EvidenceManager();