/**
 * Application Configuration
 * @fileoverview Essential configuration settings for EVID-DGC application
 * @author EVID-DGC Team
 * @version 1.0.0
 */

/**
 * Application configuration object
 * Contains all essential configuration settings including database connections,
 * file upload limits, and network settings
 * @type {Object}
 * @property {string} SUPABASE_URL - Supabase database URL
 * @property {string} SUPABASE_KEY - Supabase anonymous key for API access
 * @property {number} MAX_FILE_SIZE - Maximum file upload size in bytes (50MB)
 * @property {string[]} ALLOWED_TYPES - Array of allowed MIME types for file uploads
 * @property {string} NETWORK_NAME - Name of the blockchain network
 * @property {boolean} DEMO_MODE - Whether the application is running in demo mode
 */
const config = {
    // Supabase Database (Use environment variables in production)
    SUPABASE_URL: (typeof process !== 'undefined' && process.env && process.env.SUPABASE_URL) || 'your_supabase_url_here',
    SUPABASE_KEY: (typeof process !== 'undefined' && process.env && process.env.SUPABASE_KEY) || 'your_supabase_anon_key_here',
    
    // File Upload Limits
    MAX_FILE_SIZE: 50 * 1024 * 1024, // 50MB
    ALLOWED_TYPES: ['image/*', 'video/*', 'audio/*', 'application/pdf', 'text/*'],
    
    // Network
    NETWORK_NAME: 'Sepolia Testnet',
    DEMO_MODE: false
};