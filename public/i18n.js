// Simple i18n implementation for EVID-DGC
class I18n {
    constructor() {
        this.currentLanguage = localStorage.getItem('language') || 'en';
        this.translations = {};
        this.loadTranslations();
    }

    async loadTranslations() {
        try {
            const response = await fetch(`/locales/${this.currentLanguage}.json`);
            this.translations = await response.json();
            this.updateUI();
        } catch (error) {
            console.error('Error loading translations:', error);
            // Fallback to English
            if (this.currentLanguage !== 'en') {
                this.currentLanguage = 'en';
                await this.loadTranslations();
            }
        }
    }

    t(key, params = {}) {
        const keys = key.split('.');
        let value = this.translations;
        
        for (const k of keys) {
            value = value?.[k];
        }
        
        if (!value) {
            console.warn(`Translation missing for key: ${key}`);
            return key;
        }
        
        // Replace parameters
        let result = value;
        Object.keys(params).forEach(param => {
            result = result.replace(`{{${param}}}`, params[param]);
        });
        
        return result;
    }

    async setLanguage(lang) {
        if (lang === this.currentLanguage) return;
        
        this.currentLanguage = lang;
        localStorage.setItem('language', lang);
        await this.loadTranslations();
        
        // Dispatch language change event
        window.dispatchEvent(new CustomEvent('languageChanged', { detail: { language: lang } }));
    }

    getCurrentLanguage() {
        return this.currentLanguage;
    }

    updateUI() {
        // Update all elements with data-i18n attribute
        document.querySelectorAll('[data-i18n]').forEach(element => {
            const key = element.getAttribute('data-i18n');
            const translation = this.t(key);
            
            if (element.tagName === 'INPUT' && (element.type === 'submit' || element.type === 'button')) {
                element.value = translation;
            } else if (element.tagName === 'INPUT' && element.placeholder !== undefined) {
                element.placeholder = translation;
            } else {
                element.textContent = translation;
            }
        });

        // Update page title if it has data-i18n
        const titleElement = document.querySelector('title[data-i18n]');
        if (titleElement) {
            const key = titleElement.getAttribute('data-i18n');
            document.title = this.t(key);
        }

        // Update document direction for RTL languages
        document.dir = this.isRTL() ? 'rtl' : 'ltr';
    }

    isRTL() {
        const rtlLanguages = ['ar', 'he', 'fa', 'ur'];
        return rtlLanguages.includes(this.currentLanguage);
    }

    formatDate(date, options = {}) {
        const locale = this.getLocale();
        return new Intl.DateTimeFormat(locale, options).format(new Date(date));
    }

    formatNumber(number, options = {}) {
        const locale = this.getLocale();
        return new Intl.NumberFormat(locale, options).format(number);
    }

    getLocale() {
        const localeMap = {
            'en': 'en-US',
            'hi': 'hi-IN',
            'mr': 'mr-IN',
            'gu': 'gu-IN',
            'ta': 'ta-IN',
            'bn': 'bn-IN'
        };
        return localeMap[this.currentLanguage] || 'en-US';
    }
}

// Initialize i18n
const i18n = new I18n();

// Language switcher component
function createLanguageSwitcher() {
    const languages = [
        { code: 'en', name: 'English', flag: '🇺🇸' },
        { code: 'hi', name: 'हिंदी', flag: '🇮🇳' }
    ];

    const switcher = document.createElement('div');
    switcher.className = 'language-switcher';
    switcher.innerHTML = `
        <select id="languageSelect" onchange="changeLanguage(this.value)">
            ${languages.map(lang => 
                `<option value="${lang.code}" ${lang.code === i18n.getCurrentLanguage() ? 'selected' : ''}>
                    ${lang.flag} ${lang.name}
                </option>`
            ).join('')}
        </select>
    `;

    return switcher;
}

// Change language function
async function changeLanguage(lang) {
    await i18n.setLanguage(lang);
    showNotification(i18n.t('messages.language_changed'), 'success');
}

// Add language switcher to header
document.addEventListener('DOMContentLoaded', () => {
    const header = document.querySelector('header') || document.querySelector('.header');
    if (header) {
        const switcher = createLanguageSwitcher();
        header.appendChild(switcher);
    }
});

// Listen for language changes
window.addEventListener('languageChanged', (event) => {
    console.log('Language changed to:', event.detail.language);
});

// Export for use in other files
window.i18n = i18n;
window.t = (key, params) => i18n.t(key, params);