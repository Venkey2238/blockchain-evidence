-- EVID-DGC Security Fix - Proper RLS Policies
-- Run this in Supabase SQL Editor to fix all 16 security issues

-- ============================================================================
-- ENABLE RLS ON MISSING TABLES
-- ============================================================================

-- Enable RLS on tables that don't have it
ALTER TABLE IF EXISTS case_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS role_case_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS chain_of_custody ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS evidence_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS file_access_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS role_change_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS tags ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- DROP EXISTING OVERLY PERMISSIVE POLICIES
-- ============================================================================

-- Drop all "Allow all operations" policies
DROP POLICY IF EXISTS "Allow all operations" ON users;
DROP POLICY IF EXISTS "Allow all operations" ON evidence;
DROP POLICY IF EXISTS "Allow all operations" ON cases;
DROP POLICY IF EXISTS "Allow all operations" ON activity_logs;
DROP POLICY IF EXISTS "Allow all operations" ON admin_actions;
DROP POLICY IF EXISTS "Allow all operations" ON notifications;
DROP POLICY IF EXISTS "Allow all operations" ON case_assignments;
DROP POLICY IF EXISTS "Allow all operations" ON role_case_permissions;
DROP POLICY IF EXISTS "Allow all operations" ON audit_logs;
DROP POLICY IF EXISTS "Allow all operations" ON chain_of_custody;
DROP POLICY IF EXISTS "Allow all operations" ON evidence_tags;
DROP POLICY IF EXISTS "Allow all operations" ON file_access_logs;
DROP POLICY IF EXISTS "Allow all operations" ON role_change_requests;
DROP POLICY IF EXISTS "Allow all operations" ON tags;

-- ============================================================================
-- CREATE SECURE RLS POLICIES
-- ============================================================================

-- Users table policies
CREATE POLICY "Users can view active users" ON users FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage users" ON users FOR ALL USING (
    EXISTS (SELECT 1 FROM users u WHERE u.wallet_address = current_setting('request.jwt.claims', true)::json->>'wallet_address' AND u.role = 'admin' AND u.is_active = true)
);

-- Evidence table policies
CREATE POLICY "Users can view evidence" ON evidence FOR SELECT USING (true);
CREATE POLICY "Authorized users can insert evidence" ON evidence FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM users u WHERE u.wallet_address = submitted_by AND u.is_active = true AND u.role IN ('investigator', 'forensic_analyst', 'evidence_manager', 'admin'))
);
CREATE POLICY "Evidence managers can update evidence" ON evidence FOR UPDATE USING (
    EXISTS (SELECT 1 FROM users u WHERE u.wallet_address = current_setting('request.jwt.claims', true)::json->>'wallet_address' AND u.role IN ('evidence_manager', 'admin') AND u.is_active = true)
);

-- Cases table policies
CREATE POLICY "Users can view cases" ON cases FOR SELECT USING (true);
CREATE POLICY "Authorized users can create cases" ON cases FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM users u WHERE u.wallet_address = created_by AND u.is_active = true AND u.role IN ('investigator', 'legal_professional', 'court_official', 'admin'))
);
CREATE POLICY "Case managers can update cases" ON cases FOR UPDATE USING (
    EXISTS (SELECT 1 FROM users u WHERE u.wallet_address = current_setting('request.jwt.claims', true)::json->>'wallet_address' AND u.role IN ('investigator', 'legal_professional', 'court_official', 'admin') AND u.is_active = true)
);

-- Activity logs policies
CREATE POLICY "Users can view own activity" ON activity_logs FOR SELECT USING (
    user_id = current_setting('request.jwt.claims', true)::json->>'wallet_address'
);
CREATE POLICY "Auditors can view all activity" ON activity_logs FOR SELECT USING (
    EXISTS (SELECT 1 FROM users u WHERE u.wallet_address = current_setting('request.jwt.claims', true)::json->>'wallet_address' AND u.role IN ('auditor', 'admin') AND u.is_active = true)
);
CREATE POLICY "Users can insert own activity" ON activity_logs FOR INSERT WITH CHECK (
    user_id = current_setting('request.jwt.claims', true)::json->>'wallet_address'
);

-- Admin actions policies
CREATE POLICY "Admins can view admin actions" ON admin_actions FOR SELECT USING (
    EXISTS (SELECT 1 FROM users u WHERE u.wallet_address = current_setting('request.jwt.claims', true)::json->>'wallet_address' AND u.role = 'admin' AND u.is_active = true)
);
CREATE POLICY "Admins can insert admin actions" ON admin_actions FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM users u WHERE u.wallet_address = admin_wallet AND u.role = 'admin' AND u.is_active = true)
);

-- Notifications policies
CREATE POLICY "Users can view own notifications" ON notifications FOR SELECT USING (
    user_wallet = current_setting('request.jwt.claims', true)::json->>'wallet_address'
);
CREATE POLICY "Users can update own notifications" ON notifications FOR UPDATE USING (
    user_wallet = current_setting('request.jwt.claims', true)::json->>'wallet_address'
);
CREATE POLICY "System can create notifications" ON notifications FOR INSERT WITH CHECK (true);

-- Case assignments policies (if table exists)
CREATE POLICY "Users can view case assignments" ON case_assignments FOR SELECT USING (true);
CREATE POLICY "Managers can assign cases" ON case_assignments FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM users u WHERE u.wallet_address = assigned_by AND u.role IN ('admin', 'court_official', 'evidence_manager') AND u.is_active = true)
);

-- Role case permissions policies (if table exists)
CREATE POLICY "Users can view role permissions" ON role_case_permissions FOR SELECT USING (true);
CREATE POLICY "Admins can manage role permissions" ON role_case_permissions FOR ALL USING (
    EXISTS (SELECT 1 FROM users u WHERE u.wallet_address = current_setting('request.jwt.claims', true)::json->>'wallet_address' AND u.role = 'admin' AND u.is_active = true)
);

-- Audit logs policies (if table exists)
CREATE POLICY "Auditors can view audit logs" ON audit_logs FOR SELECT USING (
    EXISTS (SELECT 1 FROM users u WHERE u.wallet_address = current_setting('request.jwt.claims', true)::json->>'wallet_address' AND u.role IN ('auditor', 'admin') AND u.is_active = true)
);
CREATE POLICY "System can create audit logs" ON audit_logs FOR INSERT WITH CHECK (true);

-- Chain of custody policies (if table exists)
CREATE POLICY "Users can view chain of custody" ON chain_of_custody FOR SELECT USING (true);
CREATE POLICY "Evidence managers can update chain of custody" ON chain_of_custody FOR ALL USING (
    EXISTS (SELECT 1 FROM users u WHERE u.wallet_address = current_setting('request.jwt.claims', true)::json->>'wallet_address' AND u.role IN ('evidence_manager', 'admin') AND u.is_active = true)
);

-- Evidence tags policies (if table exists)
CREATE POLICY "Users can view evidence tags" ON evidence_tags FOR SELECT USING (true);
CREATE POLICY "Users can manage own evidence tags" ON evidence_tags FOR ALL USING (
    tagged_by = current_setting('request.jwt.claims', true)::json->>'wallet_address'
);

-- File access logs policies (if table exists)
CREATE POLICY "Users can view own file access" ON file_access_logs FOR SELECT USING (
    user_wallet = current_setting('request.jwt.claims', true)::json->>'wallet_address'
);
CREATE POLICY "Auditors can view all file access" ON file_access_logs FOR SELECT USING (
    EXISTS (SELECT 1 FROM users u WHERE u.wallet_address = current_setting('request.jwt.claims', true)::json->>'wallet_address' AND u.role IN ('auditor', 'admin') AND u.is_active = true)
);
CREATE POLICY "System can log file access" ON file_access_logs FOR INSERT WITH CHECK (true);

-- Role change requests policies (if table exists)
CREATE POLICY "Admins can view role change requests" ON role_change_requests FOR SELECT USING (
    EXISTS (SELECT 1 FROM users u WHERE u.wallet_address = current_setting('request.jwt.claims', true)::json->>'wallet_address' AND u.role = 'admin' AND u.is_active = true)
);
CREATE POLICY "Admins can manage role change requests" ON role_change_requests FOR ALL USING (
    EXISTS (SELECT 1 FROM users u WHERE u.wallet_address = current_setting('request.jwt.claims', true)::json->>'wallet_address' AND u.role = 'admin' AND u.is_active = true)
);

-- Tags policies (if table exists)
CREATE POLICY "Users can view tags" ON tags FOR SELECT USING (true);
CREATE POLICY "Users can create tags" ON tags FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM users u WHERE u.wallet_address = created_by AND u.is_active = true)
);
CREATE POLICY "Users can update own tags" ON tags FOR UPDATE USING (
    created_by = current_setting('request.jwt.claims', true)::json->>'wallet_address'
);

-- ============================================================================
-- FIX FUNCTION SECURITY ISSUES
-- ============================================================================

-- Fix search_path for functions
ALTER FUNCTION IF EXISTS update_tag_usage_count() SET search_path = '';
ALTER FUNCTION IF EXISTS update_role_change_requests_updated_at() SET search_path = '';

-- ============================================================================
-- CREATE HELPER FUNCTION FOR JWT CLAIMS
-- ============================================================================

-- Function to get current user wallet from JWT
CREATE OR REPLACE FUNCTION get_current_user_wallet()
RETURNS TEXT AS $$
BEGIN
    RETURN current_setting('request.jwt.claims', true)::json->>'wallet_address';
EXCEPTION
    WHEN OTHERS THEN
        RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check RLS is enabled on all tables
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('users', 'evidence', 'cases', 'activity_logs', 'admin_actions', 'notifications', 'case_assignments', 'role_case_permissions', 'audit_logs', 'chain_of_custody', 'evidence_tags', 'file_access_logs', 'role_change_requests', 'tags')
ORDER BY tablename;

-- Count policies per table
SELECT 
    schemaname,
    tablename,
    COUNT(*) as policy_count
FROM pg_policies 
WHERE schemaname = 'public'
GROUP BY schemaname, tablename
ORDER BY tablename;