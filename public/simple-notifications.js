// Simple Notification System
class SimpleNotifications {
    constructor() {
        this.notifications = [];
        this.unreadCount = 0;
        this.init();
    }

    init() {
        this.createBell();
        this.addStyles();
    }

    createBell() {
        // Wait for page to load
        setTimeout(() => {
            const navItems = document.querySelector('.nav-items');
            if (navItems) {
                const bellHTML = `
                    <div class="notification-bell-container">
                        <button class="notification-bell" onclick="window.simpleNotifications.toggleDropdown()">
                            🔔
                            <span class="notification-count" id="notificationCount" style="display: none;">0</span>
                        </button>
                        <div class="notification-dropdown" id="notificationDropdown" style="display: none;">
                            <div class="notification-header">
                                <h4>Notifications</h4>
                                <button onclick="window.simpleNotifications.markAllRead()">Mark all read</button>
                            </div>
                            <div class="notification-list" id="notificationList">
                                <div class="no-notifications">No notifications</div>
                            </div>
                        </div>
                    </div>
                `;
                navItems.insertAdjacentHTML('beforeend', bellHTML);
            }
        }, 1000);
    }

    addStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .notification-bell-container {
                position: relative;
                display: inline-block;
                margin-left: 10px;
            }
            .notification-bell {
                background: none;
                border: none;
                font-size: 18px;
                cursor: pointer;
                position: relative;
                padding: 5px;
            }
            .notification-count {
                position: absolute;
                top: -5px;
                right: -5px;
                background: red;
                color: white;
                border-radius: 50%;
                width: 18px;
                height: 18px;
                font-size: 10px;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            .notification-dropdown {
                position: absolute;
                top: 100%;
                right: 0;
                background: white;
                border: 1px solid #ddd;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                width: 300px;
                z-index: 1000;
            }
            .notification-header {
                padding: 10px;
                border-bottom: 1px solid #eee;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            .notification-header h4 {
                margin: 0;
            }
            .notification-header button {
                background: none;
                border: none;
                color: #007bff;
                cursor: pointer;
                font-size: 12px;
            }
            .notification-list {
                max-height: 200px;
                overflow-y: auto;
            }
            .notification-item {
                padding: 10px;
                border-bottom: 1px solid #f0f0f0;
                cursor: pointer;
            }
            .notification-item:hover {
                background: #f8f9fa;
            }
            .notification-item.unread {
                background: #e3f2fd;
                border-left: 3px solid #2196f3;
            }
            .no-notifications {
                padding: 20px;
                text-align: center;
                color: #666;
                font-size: 14px;
            }
            .toast {
                position: fixed;
                top: 20px;
                right: 20px;
                background: #28a745;
                color: white;
                padding: 15px;
                border-radius: 5px;
                z-index: 10000;
                animation: slideIn 0.3s ease;
            }
            @keyframes slideIn {
                from { transform: translateX(100%); }
                to { transform: translateX(0); }
            }
        `;
        document.head.appendChild(style);
    }

    addNotification(title, message, type = 'system') {
        const notification = {
            id: Date.now(),
            title,
            message,
            type,
            isRead: false,
            timestamp: new Date()
        };
        
        this.notifications.unshift(notification);
        this.unreadCount++;
        this.updateUI();
        this.showToast(title, message);
    }

    updateUI() {
        const countEl = document.getElementById('notificationCount');
        const listEl = document.getElementById('notificationList');
        
        if (countEl) {
            if (this.unreadCount > 0) {
                countEl.textContent = this.unreadCount;
                countEl.style.display = 'flex';
            } else {
                countEl.style.display = 'none';
            }
        }
        
        if (listEl) {
            if (this.notifications.length === 0) {
                listEl.innerHTML = '<div class="no-notifications">No notifications</div>';
            } else {
                listEl.innerHTML = this.notifications.map(n => `
                    <div class="notification-item ${!n.isRead ? 'unread' : ''}" onclick="window.simpleNotifications.markRead(${n.id})">
                        <div style="font-weight: bold; font-size: 14px;">${n.title}</div>
                        <div style="font-size: 12px; color: #666;">${n.message}</div>
                        <div style="font-size: 10px; color: #999;">${this.formatTime(n.timestamp)}</div>
                    </div>
                `).join('');
            }
        }
    }

    toggleDropdown() {
        const dropdown = document.getElementById('notificationDropdown');
        if (dropdown) {
            dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
        }
    }

    markRead(id) {
        const notification = this.notifications.find(n => n.id === id);
        if (notification && !notification.isRead) {
            notification.isRead = true;
            this.unreadCount--;
            this.updateUI();
        }
    }

    markAllRead() {
        this.notifications.forEach(n => n.isRead = true);
        this.unreadCount = 0;
        this.updateUI();
    }

    showToast(title, message) {
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.innerHTML = `<strong>${title}</strong><br>${message}`;
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.remove();
        }, 4000);
    }

    formatTime(date) {
        const now = new Date();
        const diff = now - date;
        
        if (diff < 60000) return 'Just now';
        if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
        return date.toLocaleDateString();
    }
}

// Initialize
window.simpleNotifications = new SimpleNotifications();

// Add test notification after 3 seconds
setTimeout(() => {
    window.simpleNotifications.addNotification(
        'Welcome!', 
        'Notification system is working!', 
        'system'
    );
}, 3000);

// Close dropdown when clicking outside
document.addEventListener('click', (e) => {
    if (!e.target.closest('.notification-bell-container')) {
        const dropdown = document.getElementById('notificationDropdown');
        if (dropdown) dropdown.style.display = 'none';
    }
});