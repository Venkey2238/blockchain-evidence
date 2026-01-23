-- EVID-DGC User Management Update for Email Authentication
-- Run this in Supabase SQL Editor to update user table for email auth support

-- ============================================================================
-- UPDATE USERS TABLE FOR EMAIL AUTHENTICATION
-- ============================================================================

-- Add email authentication columns to existing users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS email TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS password_hash TEXT,
ADD COLUMN IF NOT EXISTS auth_type TEXT DEFAULT 'wallet' CHECK (auth_type IN ('wallet', 'email', 'both')),
ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS verification_token TEXT,
ADD COLUMN IF NOT EXISTS reset_token TEXT,
ADD COLUMN IF NOT EXISTS reset_token_expires TIMESTAMPTZ;

-- Update wallet_address to allow NULL for email-only users
ALTER TABLE users ALTER COLUMN wallet_address DROP NOT NULL;

-- Add constraint to ensure either wallet or email is provided
ALTER TABLE users ADD CONSTRAINT users_auth_check 
CHECK (
    (wallet_address IS NOT NULL) OR 
    (email IS NOT NULL)
);

-- ============================================================================
-- UPDATE ROLE CONSTRAINTS TO MATCH APPLICATION
-- ============================================================================

-- Update role constraint to match your application's role system
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check 
CHECK (role IN ('public_viewer', 'investigator', 'forensic_analyst', 'legal_professional', 'court_official', 'evidence_manager', 'auditor', 'admin'));

-- ============================================================================
-- CREATE EMAIL AUTHENTICATION FUNCTIONS
-- ============================================================================

-- Function to create user with email
CREATE OR REPLACE FUNCTION create_email_user(
    p_email TEXT,
    p_password_hash TEXT,
    p_full_name TEXT,
    p_role TEXT,
    p_department TEXT DEFAULT 'General',
    p_jurisdiction TEXT DEFAULT 'General'
)
RETURNS JSON AS $$
DECLARE
    new_user_id INTEGER;
    result JSON;
BEGIN
    -- Validate role
    IF p_role NOT IN ('public_viewer', 'investigator', 'forensic_analyst', 'legal_professional', 'court_official', 'evidence_manager', 'auditor') THEN
        RETURN json_build_object('error', 'Invalid role for regular user');
    END IF;

    -- Check if email already exists
    IF EXISTS (SELECT 1 FROM users WHERE email = p_email) THEN
        RETURN json_build_object('error', 'Email already registered');
    END IF;

    -- Insert new user
    INSERT INTO users (
        email,
        password_hash,
        full_name,
        role,
        department,
        jurisdiction,
        auth_type,
        account_type,
        created_by,
        is_active
    ) VALUES (
        p_email,
        p_password_hash,
        p_full_name,
        p_role,
        p_department,
        p_jurisdiction,
        'email',
        'real',
        'email_registration',
        true
    ) RETURNING id INTO new_user_id;

    -- Return success with user data
    SELECT json_build_object(
        'success', true,
        'user', json_build_object(
            'id', id,
            'email', email,
            'full_name', full_name,
            'role', role,
            'department', department,
            'jurisdiction', jurisdiction,
            'auth_type', auth_type,
            'created_at', created_at
        )
    ) INTO result
    FROM users WHERE id = new_user_id;

    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to authenticate email user
CREATE OR REPLACE FUNCTION authenticate_email_user(
    p_email TEXT,
    p_password_hash TEXT
)
RETURNS JSON AS $$
DECLARE
    user_record RECORD;
    result JSON;
BEGIN
    -- Find user by email and password
    SELECT * INTO user_record
    FROM users 
    WHERE email = p_email 
    AND password_hash = p_password_hash 
    AND is_active = true;

    IF NOT FOUND THEN
        RETURN json_build_object('error', 'Invalid email or password');
    END IF;

    -- Update last login
    UPDATE users 
    SET last_updated = NOW() 
    WHERE id = user_record.id;

    -- Return user data
    SELECT json_build_object(
        'success', true,
        'user', json_build_object(
            'id', id,
            'email', email,
            'wallet_address', wallet_address,
            'full_name', full_name,
            'role', role,
            'department', department,
            'jurisdiction', jurisdiction,
            'badge_number', badge_number,
            'auth_type', auth_type,
            'created_at', created_at
        )
    ) INTO result
    FROM users WHERE id = user_record.id;

    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_auth_type ON users(auth_type);
CREATE INDEX IF NOT EXISTS idx_users_email_verified ON users(email_verified);

-- ============================================================================
-- UPDATE EXISTING ADMIN USER FOR TESTING
-- ============================================================================

-- Update the existing admin to support both wallet and email auth
UPDATE users 
SET 
    email = 'admin@evid-dgc.com',
    auth_type = 'both',
    email_verified = true
WHERE role = 'admin' 
AND wallet_address = '0x29bb7718d5c6da6e787deae8fd6bb3459e8539f2';

-- ============================================================================
-- CREATE SAMPLE EMAIL USERS FOR TESTING
-- ============================================================================

-- Insert sample users with email authentication
INSERT INTO users (
    email,
    password_hash,
    full_name,
    role,
    department,
    jurisdiction,
    auth_type,
    account_type,
    created_by,
    is_active,
    email_verified
) VALUES 
(
    'investigator@evid-dgc.com',
    'hashed_password_123', -- In production, use proper password hashing
    'John Investigator',
    'investigator',
    'Criminal Investigation',
    'City Police',
    'email',
    'real',
    'system_setup',
    true,
    true
),
(
    'analyst@evid-dgc.com',
    'hashed_password_456',
    'Sarah Analyst',
    'forensic_analyst',
    'Digital Forensics',
    'State Bureau',
    'email',
    'real',
    'system_setup',
    true,
    true
),
(
    'legal@evid-dgc.com',
    'hashed_password_789',
    'Michael Legal',
    'legal_professional',
    'District Attorney',
    'County Court',
    'email',
    'real',
    'system_setup',
    true,
    true
)
ON CONFLICT (email) DO NOTHING;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify the updates
SELECT 
    'Updated users table structure' as status,
    COUNT(*) as total_users,
    COUNT(CASE WHEN auth_type = 'email' THEN 1 END) as email_users,
    COUNT(CASE WHEN auth_type = 'wallet' THEN 1 END) as wallet_users,
    COUNT(CASE WHEN auth_type = 'both' THEN 1 END) as both_auth_users
FROM users;

-- Show sample users
SELECT 
    id,
    email,
    wallet_address,
    full_name,
    role,
    auth_type,
    email_verified,
    created_at
FROM users 
WHERE is_active = true
ORDER BY created_at DESC;

-- Test the email authentication function
SELECT create_email_user(
    'test@example.com',
    'test_password_hash',
    'Test User',
    'public_viewer',
    'Testing Department',
    'Test Jurisdiction'
);