/**
 * Google Analytics Configuration and Tracking
 * @fileoverview Google Analytics integration for EVID-DGC application
 * @author EVID-DGC Team
 * @version 1.0.0
 */

/**
 * Google Analytics Measurement ID
 * @type {string}
 * @constant
 */
const GA_MEASUREMENT_ID = 'G-KEYDE0ZH4Z'; // Your actual GA4 Measurement ID

/**
 * Initialize Google Analytics tracking
 * Loads the Google Analytics script and configures gtag for event tracking
 * @function initializeAnalytics
 * @returns {void}
 */
function initializeAnalytics() {
    // Load Google Analytics script
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
    document.head.appendChild(script);

    // Initialize gtag
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', GA_MEASUREMENT_ID);

    // Make gtag globally available
    window.gtag = gtag;
}

/**
 * Track custom events in Google Analytics
 * Sends custom event data to Google Analytics if gtag is available
 * @function trackEvent
 * @param {string} eventName - Name of the event to track
 * @param {Object} [parameters={}] - Additional parameters for the event
 * @returns {void}
 */
function trackEvent(eventName, parameters = {}) {
    if (window.gtag) {
        gtag('event', eventName, parameters);
    }
}

/**
 * Track page views in Google Analytics
 * Sends page view data to Google Analytics with current page information
 * @function trackPageView
 * @param {string} pageName - Name of the page being viewed
 * @returns {void}
 */
function trackPageView(pageName) {
    if (window.gtag) {
        gtag('event', 'page_view', {
            page_title: pageName,
            page_location: window.location.href
        });
    }
}

/**
 * Track user actions in Google Analytics
 * Sends user interaction events to Google Analytics with contextual information
 * @function trackUserAction
 * @param {string} action - The action performed by the user
 * @param {string} [category='user_interaction'] - Category of the user action
 * @returns {void}
 */
function trackUserAction(action, category = 'user_interaction') {
    trackEvent(action, {
        event_category: category,
        event_label: window.location.pathname
    });
}

// Initialize analytics when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeAnalytics);