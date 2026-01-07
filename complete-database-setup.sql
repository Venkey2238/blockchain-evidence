-- EVID-DGC Complete Database Setup
-- Run this ONCE in Supabase SQL Editor to set up the entire system
-- This includes all tables, policies, indexes, and the first admin user

-- ============================================================================
-- CLEAN SLATE - DROP EXISTING TABLES
-- ============================================================================

DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS admin_actions CASCADE;
DROP TABLE IF EXISTS activity_logs CASCADE;
DROP TABLE IF EXISTS evidence CASCADE;
DROP TABLE IF EXISTS cases CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- ============================================================================
-- TABLES CREATION
-- ============================================================================

-- Users table with role-based access
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    wallet_address TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('public_viewer', 'investigator', 'forensic_analyst', 'legal_professional', 'court_official', 'evidence_manager', 'auditor', 'admin')),
    department TEXT,
    jurisdiction TEXT,
    badge_number TEXT,
    account_type TEXT DEFAULT 'real' CHECK (account_type IN ('real', 'test')),
    created_by TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE
);

-- Evidence table
CREATE TABLE evidence (
    id SERIAL PRIMARY KEY,
    case_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    type TEXT NOT NULL,
    file_data TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    hash TEXT NOT NULL,
    submitted_by TEXT NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    status TEXT DEFAULT 'pending'
);

-- Cases table
CREATE TABLE cases (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    priority TEXT DEFAULT 'medium',
    created_by TEXT NOT NULL,
    status TEXT DEFAULT 'open',
    created_date TIMESTAMPTZ DEFAULT NOW()
);

-- Activity logs table
CREATE TABLE activity_logs (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    action TEXT NOT NULL,
    details TEXT,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    ip_address TEXT
);

-- Admin actions table
CREATE TABLE admin_actions (
    id SERIAL PRIMARY KEY,
    admin_wallet TEXT NOT NULL,
    action_type TEXT NOT NULL,
    target_wallet TEXT,
    details JSONB,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Notifications table
CREATE TABLE notifications (
    id SERIAL PRIMARY KEY,
    user_wallet TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('evidence_upload', 'evidence_verification', 'evidence_assignment', 'comment', 'mention', 'system', 'urgent')),
    data JSONB,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days')
);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Allow all operations" ON users;
DROP POLICY IF EXISTS "Allow all operations" ON evidence;
DROP POLICY IF EXISTS "Allow all operations" ON cases;
DROP POLICY IF EXISTS "Allow all operations" ON activity_logs;
DROP POLICY IF EXISTS "Allow all operations" ON admin_actions;
DROP POLICY IF EXISTS "Allow all operations" ON notifications;

CREATE POLICY "Allow all operations" ON users FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON evidence FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON cases FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON activity_logs FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON admin_actions FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON notifications FOR ALL USING (true);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX idx_users_wallet ON users(wallet_address);
CREATE INDEX idx_evidence_case ON evidence(case_id);
CREATE INDEX idx_evidence_submitted ON evidence(submitted_by);
CREATE INDEX idx_activity_user ON activity_logs(user_id);
CREATE INDEX idx_admin_actions_admin ON admin_actions(admin_wallet);
CREATE INDEX idx_notifications_user ON notifications(user_wallet);
CREATE INDEX idx_notifications_unread ON notifications(user_wallet, is_read);

-- ============================================================================
-- FIRST ADMIN USER SETUP
-- ============================================================================

INSERT INTO users (
    wallet_address,
    full_name,
    role,
    department,
    jurisdiction,
    badge_number,
    account_type,
    created_by,
    is_active
) VALUES (
    '0x29bb7718d5c6da6e787deae8fd6bb3459e8539f2',
    'System Administrator',
    'admin',
    'Administration',
    'System',
    'ADMIN-001',
    'real',
    'system_setup',
    true
) ON CONFLICT (wallet_address) DO NOTHING;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify admin was created
SELECT 
    wallet_address,
    full_name,
    role,
    created_at,
    is_active
FROM users 
WHERE role = 'admin' 
ORDER BY created_at;

-- Show admin count
SELECT COUNT(*) as admin_count 
FROM users 
WHERE role = 'admin' AND is_active = true;

-- Show all tables created
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('users', 'evidence', 'cases', 'activity_logs', 'admin_actions', 'notifications')
ORDER BY table_name;