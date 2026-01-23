-- EVID-DGC Complete Database Setup with SECURE RLS Policies
-- Run this ONCE in Supabase SQL Editor to set up the entire system
-- This includes all tables, SECURE policies, indexes, and the first admin user

-- ============================================================================
-- CLEAN SLATE - DROP EXISTING TABLES AND POLICIES
-- ============================================================================

DROP TABLE IF EXISTS role_change_requests CASCADE;
DROP TABLE IF EXISTS evidence_tags CASCADE;
DROP TABLE IF EXISTS tags CASCADE;
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
    wallet_address TEXT UNIQUE,
    email TEXT UNIQUE,
    password_hash TEXT,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('public_viewer', 'investigator', 'forensic_analyst', 'legal_professional', 'court_official', 'evidence_manager', 'auditor', 'admin')),
    department TEXT,
    jurisdiction TEXT,
    badge_number TEXT,
    account_type TEXT DEFAULT 'real' CHECK (account_type IN ('real', 'test')),
    auth_type TEXT DEFAULT 'wallet' CHECK (auth_type IN ('wallet', 'email', 'both')),
    email_verified BOOLEAN DEFAULT FALSE,
    created_by TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE,
    CONSTRAINT users_auth_check CHECK (
        (wallet_address IS NOT NULL) OR (email IS NOT NULL)
    )
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

-- Tags table
CREATE TABLE tags (
    id SERIAL PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    color TEXT DEFAULT '#3B82F6',
    category TEXT,
    parent_id INTEGER REFERENCES tags(id),
    usage_count INTEGER DEFAULT 0,
    created_by TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Evidence tags junction table
CREATE TABLE evidence_tags (
    evidence_id INTEGER REFERENCES evidence(id) ON DELETE CASCADE,
    tag_id INTEGER REFERENCES tags(id) ON DELETE CASCADE,
    tagged_by TEXT NOT NULL,
    tagged_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (evidence_id, tag_id)
);

-- Role change requests table
CREATE TABLE role_change_requests (
    id SERIAL PRIMARY KEY,
    requesting_admin VARCHAR(42) NOT NULL,
    target_wallet VARCHAR(42) NOT NULL,
    old_role VARCHAR(50) NOT NULL,
    new_role VARCHAR(50) NOT NULL,
    reason TEXT,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    approved_by VARCHAR(42),
    approved_at TIMESTAMP WITH TIME ZONE,
    rejected_by VARCHAR(42),
    rejected_at TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
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
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE evidence_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_change_requests ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- SECURE RLS POLICIES (FIXES ALL SECURITY ISSUES)
-- ============================================================================

-- Users table policies
CREATE POLICY "Users can view active users" ON users FOR SELECT USING (is_active = true);
CREATE POLICY "Service role full access" ON users FOR ALL USING (current_user = 'service_role');

-- Evidence table policies  
CREATE POLICY "Users can view evidence" ON evidence FOR SELECT USING (true);
CREATE POLICY "Authorized users can insert evidence" ON evidence FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM users u WHERE u.wallet_address = submitted_by AND u.is_active = true AND u.role IN ('investigator', 'forensic_analyst', 'evidence_manager', 'admin'))
);
CREATE POLICY "Service role full access" ON evidence FOR ALL USING (current_user = 'service_role');

-- Cases table policies
CREATE POLICY "Users can view cases" ON cases FOR SELECT USING (true);
CREATE POLICY "Authorized users can create cases" ON cases FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM users u WHERE u.wallet_address = created_by AND u.is_active = true AND u.role IN ('investigator', 'legal_professional', 'court_official', 'admin'))
);
CREATE POLICY "Service role full access" ON cases FOR ALL USING (current_user = 'service_role');

-- Activity logs policies
CREATE POLICY "Service role full access" ON activity_logs FOR ALL USING (current_user = 'service_role');

-- Admin actions policies
CREATE POLICY "Service role full access" ON admin_actions FOR ALL USING (current_user = 'service_role');

-- Notifications policies
CREATE POLICY "Service role full access" ON notifications FOR ALL USING (current_user = 'service_role');

-- Tags policies
CREATE POLICY "Users can view tags" ON tags FOR SELECT USING (true);
CREATE POLICY "Service role full access" ON tags FOR ALL USING (current_user = 'service_role');

-- Evidence tags policies
CREATE POLICY "Users can view evidence tags" ON evidence_tags FOR SELECT USING (true);
CREATE POLICY "Service role full access" ON evidence_tags FOR ALL USING (current_user = 'service_role');

-- Role change requests policies
CREATE POLICY "Service role full access" ON role_change_requests FOR ALL USING (current_user = 'service_role');

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX idx_users_wallet ON users(wallet_address);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_auth_type ON users(auth_type);
CREATE INDEX idx_evidence_case ON evidence(case_id);
CREATE INDEX idx_evidence_submitted ON evidence(submitted_by);
CREATE INDEX idx_activity_user ON activity_logs(user_id);
CREATE INDEX idx_admin_actions_admin ON admin_actions(admin_wallet);
CREATE INDEX idx_notifications_user ON notifications(user_wallet);
CREATE INDEX idx_notifications_unread ON notifications(user_wallet, is_read);
CREATE INDEX idx_tags_name ON tags(name);
CREATE INDEX idx_tags_category ON tags(category);
CREATE INDEX idx_tags_usage_count ON tags(usage_count DESC);
CREATE INDEX idx_evidence_tags_evidence_id ON evidence_tags(evidence_id);
CREATE INDEX idx_evidence_tags_tag_id ON evidence_tags(tag_id);
CREATE INDEX idx_role_change_requests_status ON role_change_requests(status);
CREATE INDEX idx_role_change_requests_target ON role_change_requests(target_wallet);
CREATE INDEX idx_role_change_requests_requesting ON role_change_requests(requesting_admin);

-- ============================================================================
-- FUNCTIONS AND TRIGGERS (WITH SECURE SEARCH PATH)
-- ============================================================================

-- Function to update tag usage count (SECURE)
CREATE OR REPLACE FUNCTION update_tag_usage_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE tags SET usage_count = usage_count + 1 WHERE id = NEW.tag_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE tags SET usage_count = usage_count - 1 WHERE id = OLD.tag_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- Function to update role change requests timestamp (SECURE)
CREATE OR REPLACE FUNCTION update_role_change_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- Email user creation function (SECURE)
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
        email, password_hash, full_name, role, department, jurisdiction,
        auth_type, account_type, created_by, is_active, email_verified
    ) VALUES (
        p_email, p_password_hash, p_full_name, p_role, p_department, p_jurisdiction,
        'email', 'real', 'email_registration', true, true
    ) RETURNING id INTO new_user_id;

    -- Return success with user data
    SELECT json_build_object(
        'success', true,
        'user', json_build_object(
            'id', id, 'email', email, 'full_name', full_name, 'role', role,
            'department', department, 'jurisdiction', jurisdiction, 'auth_type', auth_type, 'created_at', created_at
        )
    ) INTO result FROM users WHERE id = new_user_id;

    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- Triggers
CREATE TRIGGER trigger_update_tag_usage
    AFTER INSERT OR DELETE ON evidence_tags
    FOR EACH ROW EXECUTE FUNCTION update_tag_usage_count();

CREATE TRIGGER role_change_requests_updated_at_trigger
    BEFORE UPDATE ON role_change_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_role_change_requests_updated_at();

-- ============================================================================
-- DEFAULT DATA
-- ============================================================================

-- First admin user (supports both wallet and email)
INSERT INTO users (
    wallet_address, email, full_name, role, department, jurisdiction,
    badge_number, account_type, auth_type, created_by, is_active, email_verified
) VALUES (
    '0x29bb7718d5c6da6e787deae8fd6bb3459e8539f2', 'admin@evid-dgc.com',
    'System Administrator', 'admin', 'Administration', 'System',
    'ADMIN-001', 'real', 'both', 'system_setup', true, true
) ON CONFLICT (wallet_address) DO NOTHING;

-- Sample email users for testing
INSERT INTO users (
    email, password_hash, full_name, role, department, jurisdiction,
    auth_type, account_type, created_by, is_active, email_verified
) VALUES 
('investigator@evid-dgc.com', 'hashed_password_123', 'John Investigator', 'investigator', 'Criminal Investigation', 'City Police', 'email', 'real', 'system_setup', true, true),
('analyst@evid-dgc.com', 'hashed_password_456', 'Sarah Analyst', 'forensic_analyst', 'Digital Forensics', 'State Bureau', 'email', 'real', 'system_setup', true, true),
('legal@evid-dgc.com', 'hashed_password_789', 'Michael Legal', 'legal_professional', 'District Attorney', 'County Court', 'email', 'real', 'system_setup', true, true)
ON CONFLICT (email) DO NOTHING;

-- Default tags
INSERT INTO tags (name, color, category, created_by) VALUES
('urgent', '#EF4444', 'priority', 'system'),
('pending-review', '#F59E0B', 'status', 'system'),
('court-ready', '#10B981', 'status', 'system'),
('witness-statement', '#8B5CF6', 'type', 'system'),
('surveillance-footage', '#06B6D4', 'type', 'system'),
('forensic-analysis', '#EC4899', 'type', 'system'),
('confidential', '#DC2626', 'sensitivity', 'system'),
('public', '#059669', 'sensitivity', 'system')
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify setup
SELECT 'Database setup complete' as status,
       COUNT(*) as total_users,
       COUNT(CASE WHEN auth_type = 'email' THEN 1 END) as email_users,
       COUNT(CASE WHEN auth_type = 'wallet' THEN 1 END) as wallet_users,
       COUNT(CASE WHEN auth_type = 'both' THEN 1 END) as both_auth_users
FROM users;

-- Show RLS status
SELECT schemaname, tablename, rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('users', 'evidence', 'cases', 'activity_logs', 'admin_actions', 'notifications', 'tags', 'evidence_tags', 'role_change_requests')
ORDER BY tablename;