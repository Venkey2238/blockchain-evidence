-- EVID-DGC Complete Database Setup with Role Change Approval
-- Run this ONCE in Supabase SQL Editor to set up the entire system
-- This includes all tables, policies, indexes, and the first admin user

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
-- POLICIES
-- ============================================================================

CREATE POLICY "Allow all operations" ON users FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON evidence FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON cases FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON activity_logs FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON admin_actions FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON notifications FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON tags FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON evidence_tags FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON role_change_requests FOR ALL USING (true);

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
CREATE INDEX idx_tags_name ON tags(name);
CREATE INDEX idx_tags_category ON tags(category);
CREATE INDEX idx_tags_usage_count ON tags(usage_count DESC);
CREATE INDEX idx_evidence_tags_evidence_id ON evidence_tags(evidence_id);
CREATE INDEX idx_evidence_tags_tag_id ON evidence_tags(tag_id);
CREATE INDEX idx_role_change_requests_status ON role_change_requests(status);
CREATE INDEX idx_role_change_requests_target ON role_change_requests(target_wallet);
CREATE INDEX idx_role_change_requests_requesting ON role_change_requests(requesting_admin);

-- ============================================================================
-- FUNCTIONS AND TRIGGERS
-- ============================================================================

-- Function to update tag usage count
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
$$ LANGUAGE plpgsql;

-- Function to update role change requests timestamp
CREATE OR REPLACE FUNCTION update_role_change_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

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

-- First admin user
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
ON CONFLICT (name) DO NOTHING; 'status', 'system'),
('witness-statement', '#8B5CF6', 'type', 'system'),
('surveillance-footage', '#06B6D4', 'type', 'system'),
('forensic-analysis', '#EC4899', 'type', 'system'),
('confidential', '#DC2626', 'sensitivity', 'system'),
('public', '#059669', 'sensitivity', 'system')
ON CONFLICT (name) DO NOTHING;