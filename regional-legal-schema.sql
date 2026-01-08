-- Regional Legal Templates and Multi-Jurisdiction Schema
-- Court submission templates and cross-border compliance

-- Legal template definitions
CREATE TABLE IF NOT EXISTS legal_templates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    template_name VARCHAR(255) NOT NULL,
    jurisdiction VARCHAR(10) NOT NULL, -- IN, US, EU, UK, CA, AU, GLOBAL
    case_type VARCHAR(50) NOT NULL, -- criminal, civil, administrative
    template_version VARCHAR(20) DEFAULT '1.0',
    sections JSONB NOT NULL, -- Template sections configuration
    legal_framework TEXT, -- Applicable legal framework
    compliance_requirements JSONB, -- Compliance requirements
    language VARCHAR(10) DEFAULT 'en',
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(template_name, jurisdiction, case_type)
);

-- Generated court bundles
CREATE TABLE IF NOT EXISTS court_bundles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    bundle_id UUID NOT NULL UNIQUE,
    case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
    template_id UUID REFERENCES legal_templates(id),
    jurisdiction VARCHAR(10) NOT NULL,
    case_type VARCHAR(50) NOT NULL,
    format VARCHAR(10) DEFAULT 'PDF', -- PDF, DOCX, HTML
    
    -- Bundle metadata
    total_pages INTEGER DEFAULT 0,
    total_evidence INTEGER DEFAULT 0,
    file_size BIGINT,
    
    -- Bundle content
    sections JSONB NOT NULL, -- Generated sections content
    digital_signature JSONB, -- Digital signature information
    
    -- Generation info
    generated_by UUID REFERENCES auth.users(id),
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Download tracking
    download_count INTEGER DEFAULT 0,
    last_downloaded TIMESTAMP WITH TIME ZONE,
    
    -- Legal validation
    legal_review_status VARCHAR(20) DEFAULT 'PENDING', -- PENDING, APPROVED, REJECTED
    reviewed_by UUID REFERENCES auth.users(id),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    review_notes TEXT
);

-- Jurisdiction definitions and rules
CREATE TABLE IF NOT EXISTS jurisdictions (
    code VARCHAR(10) PRIMARY KEY, -- IN, US, EU, UK, CA, AU, GLOBAL
    name VARCHAR(100) NOT NULL,
    regions TEXT[], -- Array of regions within jurisdiction
    data_residency VARCHAR(20) NOT NULL, -- STRICT, MODERATE, FLEXIBLE
    legal_framework TEXT,
    storage_regions TEXT[], -- Allowed cloud storage regions
    timezone VARCHAR(50),
    language VARCHAR(10),
    currency VARCHAR(3),
    compliance_frameworks JSONB,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Data residency rules
CREATE TABLE IF NOT EXISTS data_residency_rules (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    jurisdiction VARCHAR(10) REFERENCES jurisdictions(code),
    rule_name VARCHAR(100) NOT NULL,
    rule_type VARCHAR(50) NOT NULL, -- STRICT_RESIDENCY, GDPR_COMPLIANCE, etc.
    description TEXT,
    allowed_regions TEXT[],
    cross_border_transfer BOOLEAN DEFAULT false,
    transfer_conditions TEXT[],
    compliance_requirement TEXT,
    penalties TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Cross-jurisdiction access grants
CREATE TABLE IF NOT EXISTS cross_jurisdiction_access_grants (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
    target_jurisdiction VARCHAR(10) REFERENCES jurisdictions(code),
    granted_by UUID REFERENCES auth.users(id),
    granted_to UUID REFERENCES auth.users(id),
    
    -- Grant details
    access_type VARCHAR(50) DEFAULT 'READ_only', -- read_only, full_access, export_allowed
    conditions JSONB, -- Access conditions and restrictions
    
    -- Validity
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    
    -- Revocation
    revoked_by UUID REFERENCES auth.users(id),
    revoked_at TIMESTAMP WITH TIME ZONE,
    revocation_reason TEXT,
    
    -- Audit
    last_accessed TIMESTAMP WITH TIME ZONE,
    access_count INTEGER DEFAULT 0
);

-- User jurisdiction permissions
CREATE TABLE IF NOT EXISTS user_jurisdiction_permissions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    jurisdiction VARCHAR(10) REFERENCES jurisdictions(code),
    permission_type VARCHAR(50) NOT NULL, -- VIEW, EDIT, EXPORT, ADMIN
    granted_by UUID REFERENCES auth.users(id),
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    
    UNIQUE(user_id, jurisdiction, permission_type)
);

-- Jurisdiction routing log
CREATE TABLE IF NOT EXISTS jurisdiction_routing_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
    requesting_user UUID REFERENCES auth.users(id),
    source_jurisdiction VARCHAR(10),
    target_jurisdiction VARCHAR(10),
    routing_decision VARCHAR(50), -- DIRECT_ACCESS, APPROVED, DENIED, CONDITIONAL
    compliance_status VARCHAR(50), -- COMPLIANT, NON_COMPLIANT, REQUIRES_REVIEW
    required_approvals TEXT[],
    restrictions TEXT[],
    decision_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Evidence export compliance
CREATE TABLE IF NOT EXISTS evidence_export_compliance (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    evidence_id UUID REFERENCES evidence(id) ON DELETE CASCADE,
    target_jurisdiction VARCHAR(10) REFERENCES jurisdictions(code),
    export_type VARCHAR(50), -- FULL_EXPORT, METADATA_ONLY, REDACTED
    compliance_status VARCHAR(50), -- COMPLIANT, RESTRICTED, PROHIBITED
    restrictions TEXT[],
    requirements TEXT[],
    approved_by UUID REFERENCES auth.users(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Legal compliance violations
CREATE TABLE IF NOT EXISTS compliance_violations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    violation_type VARCHAR(100) NOT NULL,
    jurisdiction VARCHAR(10) REFERENCES jurisdictions(code),
    case_id UUID REFERENCES cases(id),
    evidence_id UUID REFERENCES evidence(id),
    user_id UUID REFERENCES auth.users(id),
    
    -- Violation details
    description TEXT NOT NULL,
    severity VARCHAR(20) DEFAULT 'MEDIUM', -- LOW, MEDIUM, HIGH, CRITICAL
    legal_framework_violated TEXT,
    potential_penalty TEXT,
    
    -- Resolution
    status VARCHAR(20) DEFAULT 'OPEN', -- OPEN, INVESTIGATING, RESOLVED, DISMISSED
    resolved_by UUID REFERENCES auth.users(id),
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolution_notes TEXT,
    
    -- Reporting
    reported_by UUID REFERENCES auth.users(id),
    reported_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    external_report_required BOOLEAN DEFAULT false,
    external_report_sent BOOLEAN DEFAULT false
);

-- Multi-jurisdiction case metadata
CREATE TABLE IF NOT EXISTS multi_jurisdiction_cases (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
    primary_jurisdiction VARCHAR(10) REFERENCES jurisdictions(code),
    secondary_jurisdictions VARCHAR(10)[], -- Array of additional jurisdictions
    
    -- Cross-border details
    international_case BOOLEAN DEFAULT false,
    mutual_legal_assistance BOOLEAN DEFAULT false,
    treaty_basis TEXT,
    
    -- Data handling
    data_sharing_agreement TEXT,
    data_residency_requirements JSONB,
    export_restrictions JSONB,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_legal_templates_jurisdiction ON legal_templates(jurisdiction);
CREATE INDEX IF NOT EXISTS idx_legal_templates_case_type ON legal_templates(case_type);
CREATE INDEX IF NOT EXISTS idx_legal_templates_active ON legal_templates(is_active);

CREATE INDEX IF NOT EXISTS idx_court_bundles_case_id ON court_bundles(case_id);
CREATE INDEX IF NOT EXISTS idx_court_bundles_jurisdiction ON court_bundles(jurisdiction);
CREATE INDEX IF NOT EXISTS idx_court_bundles_generated_at ON court_bundles(generated_at);

CREATE INDEX IF NOT EXISTS idx_cross_jurisdiction_grants_case_id ON cross_jurisdiction_access_grants(case_id);
CREATE INDEX IF NOT EXISTS idx_cross_jurisdiction_grants_target ON cross_jurisdiction_access_grants(target_jurisdiction);
CREATE INDEX IF NOT EXISTS idx_cross_jurisdiction_grants_active ON cross_jurisdiction_access_grants(is_active);
CREATE INDEX IF NOT EXISTS idx_cross_jurisdiction_grants_expires ON cross_jurisdiction_access_grants(expires_at);

CREATE INDEX IF NOT EXISTS idx_user_jurisdiction_permissions_user ON user_jurisdiction_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_jurisdiction_permissions_jurisdiction ON user_jurisdiction_permissions(jurisdiction);
CREATE INDEX IF NOT EXISTS idx_user_jurisdiction_permissions_active ON user_jurisdiction_permissions(is_active);

CREATE INDEX IF NOT EXISTS idx_jurisdiction_routing_log_case_id ON jurisdiction_routing_log(case_id);
CREATE INDEX IF NOT EXISTS idx_jurisdiction_routing_log_user ON jurisdiction_routing_log(requesting_user);
CREATE INDEX IF NOT EXISTS idx_jurisdiction_routing_log_created_at ON jurisdiction_routing_log(created_at);

CREATE INDEX IF NOT EXISTS idx_evidence_export_compliance_evidence_id ON evidence_export_compliance(evidence_id);
CREATE INDEX IF NOT EXISTS idx_evidence_export_compliance_jurisdiction ON evidence_export_compliance(target_jurisdiction);

CREATE INDEX IF NOT EXISTS idx_compliance_violations_jurisdiction ON compliance_violations(jurisdiction);
CREATE INDEX IF NOT EXISTS idx_compliance_violations_status ON compliance_violations(status);
CREATE INDEX IF NOT EXISTS idx_compliance_violations_severity ON compliance_violations(severity);
CREATE INDEX IF NOT EXISTS idx_compliance_violations_reported_at ON compliance_violations(reported_at);

CREATE INDEX IF NOT EXISTS idx_multi_jurisdiction_cases_case_id ON multi_jurisdiction_cases(case_id);
CREATE INDEX IF NOT EXISTS idx_multi_jurisdiction_cases_primary ON multi_jurisdiction_cases(primary_jurisdiction);

-- Row Level Security (RLS)
ALTER TABLE legal_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE court_bundles ENABLE ROW LEVEL SECURITY;
ALTER TABLE jurisdictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_residency_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE cross_jurisdiction_access_grants ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_jurisdiction_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE jurisdiction_routing_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE evidence_export_compliance ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_violations ENABLE ROW LEVEL SECURITY;
ALTER TABLE multi_jurisdiction_cases ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Legal templates: admins and legal professionals can manage
CREATE POLICY "Legal professionals can manage templates" ON legal_templates
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() AND role IN ('administrator', 'legal', 'auditor')
        )
    );

-- Court bundles: same as case access
CREATE POLICY "Court bundles access" ON court_bundles
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM cases c
            WHERE c.id = court_bundles.case_id
            AND (
                c.created_by = auth.uid() OR
                EXISTS (
                    SELECT 1 FROM users u 
                    WHERE u.id = auth.uid() 
                    AND u.role IN ('administrator', 'legal', 'auditor')
                )
            )
        )
    );

-- Jurisdictions: readable by all authenticated users
CREATE POLICY "Jurisdictions readable by all" ON jurisdictions
    FOR SELECT USING (auth.role() = 'authenticated');

-- Data residency rules: readable by all, manageable by admins
CREATE POLICY "Data residency rules readable" ON data_residency_rules
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage residency rules" ON data_residency_rules
    FOR INSERT, UPDATE, DELETE USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() AND role = 'administrator'
        )
    );

-- Cross-jurisdiction access grants: case-based access
CREATE POLICY "Cross-jurisdiction grants access" ON cross_jurisdiction_access_grants
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM cases c
            WHERE c.id = cross_jurisdiction_access_grants.case_id
            AND (
                c.created_by = auth.uid() OR
                cross_jurisdiction_access_grants.granted_to = auth.uid() OR
                EXISTS (
                    SELECT 1 FROM users u 
                    WHERE u.id = auth.uid() 
                    AND u.role IN ('administrator', 'legal')
                )
            )
        )
    );

-- User jurisdiction permissions: users can see their own, admins can see all
CREATE POLICY "Users can view own jurisdiction permissions" ON user_jurisdiction_permissions
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admins can manage jurisdiction permissions" ON user_jurisdiction_permissions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() AND role IN ('administrator', 'legal')
        )
    );

-- Jurisdiction routing log: users can see their own, admins can see all
CREATE POLICY "Users can view own routing log" ON jurisdiction_routing_log
    FOR SELECT USING (requesting_user = auth.uid());

CREATE POLICY "Admins can view all routing logs" ON jurisdiction_routing_log
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() AND role IN ('administrator', 'auditor', 'legal')
        )
    );

-- Evidence export compliance: same as evidence access
CREATE POLICY "Evidence export compliance access" ON evidence_export_compliance
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM evidence e
            JOIN cases c ON e.case_id = c.id
            WHERE e.id = evidence_export_compliance.evidence_id
            AND (
                c.created_by = auth.uid() OR
                EXISTS (
                    SELECT 1 FROM users u 
                    WHERE u.id = auth.uid() 
                    AND u.role IN ('administrator', 'legal', 'evidence_manager')
                )
            )
        )
    );

-- Compliance violations: legal and admin access
CREATE POLICY "Legal can manage compliance violations" ON compliance_violations
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() AND role IN ('administrator', 'legal', 'auditor')
        )
    );

-- Multi-jurisdiction cases: same as case access
CREATE POLICY "Multi-jurisdiction cases access" ON multi_jurisdiction_cases
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM cases c
            WHERE c.id = multi_jurisdiction_cases.case_id
            AND (
                c.created_by = auth.uid() OR
                EXISTS (
                    SELECT 1 FROM users u 
                    WHERE u.id = auth.uid() 
                    AND u.role IN ('administrator', 'legal', 'auditor')
                )
            )
        )
    );

-- Functions for jurisdiction management
CREATE OR REPLACE FUNCTION check_cross_jurisdiction_access(
    p_user_id UUID,
    p_case_id UUID,
    p_target_jurisdiction VARCHAR(10)
) RETURNS BOOLEAN AS $$
DECLARE
    has_permission BOOLEAN := false;
    has_active_grant BOOLEAN := false;
BEGIN
    -- Check if user has jurisdiction permission
    SELECT EXISTS (
        SELECT 1 FROM user_jurisdiction_permissions ujp
        WHERE ujp.user_id = p_user_id
        AND ujp.jurisdiction = p_target_jurisdiction
        AND ujp.is_active = true
        AND (ujp.expires_at IS NULL OR ujp.expires_at > NOW())
    ) INTO has_permission;
    
    -- Check if there's an active access grant for this case
    SELECT EXISTS (
        SELECT 1 FROM cross_jurisdiction_access_grants cjag
        WHERE cjag.case_id = p_case_id
        AND cjag.target_jurisdiction = p_target_jurisdiction
        AND cjag.is_active = true
        AND (cjag.expires_at IS NULL OR cjag.expires_at > NOW())
    ) INTO has_active_grant;
    
    RETURN has_permission OR has_active_grant;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_jurisdiction_compliance_score(
    p_jurisdiction VARCHAR(10),
    p_days INTEGER DEFAULT 30
) RETURNS DECIMAL AS $$
DECLARE
    total_requests INTEGER := 0;
    denied_requests INTEGER := 0;
    violations INTEGER := 0;
    score DECIMAL := 100.0;
BEGIN
    -- Count routing requests
    SELECT COUNT(*) INTO total_requests
    FROM jurisdiction_routing_log
    WHERE target_jurisdiction = p_jurisdiction
    AND created_at >= NOW() - (p_days || ' days')::INTERVAL;
    
    -- Count denied requests
    SELECT COUNT(*) INTO denied_requests
    FROM jurisdiction_routing_log
    WHERE target_jurisdiction = p_jurisdiction
    AND routing_decision = 'DENIED'
    AND created_at >= NOW() - (p_days || ' days')::INTERVAL;
    
    -- Count compliance violations
    SELECT COUNT(*) INTO violations
    FROM compliance_violations
    WHERE jurisdiction = p_jurisdiction
    AND status IN ('OPEN', 'INVESTIGATING')
    AND reported_at >= NOW() - (p_days || ' days')::INTERVAL;
    
    -- Calculate score
    IF total_requests > 0 THEN
        score := score - ((denied_requests::DECIMAL / total_requests) * 20);
    END IF;
    
    score := score - (violations * 10);
    
    RETURN GREATEST(0, score);
END;
$$ LANGUAGE plpgsql;

-- Triggers for updating timestamps
CREATE OR REPLACE FUNCTION update_jurisdiction_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_legal_templates_timestamp
    BEFORE UPDATE ON legal_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_jurisdiction_timestamp();

CREATE TRIGGER update_multi_jurisdiction_cases_timestamp
    BEFORE UPDATE ON multi_jurisdiction_cases
    FOR EACH ROW
    EXECUTE FUNCTION update_jurisdiction_timestamp();

-- Insert default jurisdictions
INSERT INTO jurisdictions (code, name, regions, data_residency, legal_framework, storage_regions, timezone, language, currency) VALUES
('IN', 'India', ARRAY['North', 'South', 'East', 'West', 'Central', 'Northeast'], 'STRICT', 
 'Indian Evidence Act 1872, IT Act 2000, DPDP Act 2023', 
 ARRAY['ap-south-1', 'ap-south-2'], 'Asia/Kolkata', 'en-IN', 'INR'),
('US', 'United States', ARRAY['Federal', 'State', 'Local'], 'MODERATE',
 'Federal Rules of Evidence, State Evidence Codes',
 ARRAY['us-east-1', 'us-west-2'], 'America/New_York', 'en-US', 'USD'),
('EU', 'European Union', ARRAY['GDPR Zone'], 'STRICT',
 'GDPR, eIDAS Regulation, Digital Services Act',
 ARRAY['eu-west-1', 'eu-central-1'], 'Europe/Brussels', 'en-EU', 'EUR'),
('UK', 'United Kingdom', ARRAY['England', 'Scotland', 'Wales', 'Northern Ireland'], 'STRICT',
 'UK GDPR, Data Protection Act 2018, Police and Criminal Evidence Act 1984',
 ARRAY['eu-west-2'], 'Europe/London', 'en-GB', 'GBP'),
('CA', 'Canada', ARRAY['Federal', 'Provincial'], 'MODERATE',
 'Canada Evidence Act, Personal Information Protection and Electronic Documents Act',
 ARRAY['ca-central-1'], 'America/Toronto', 'en-CA', 'CAD'),
('AU', 'Australia', ARRAY['Federal', 'State', 'Territory'], 'MODERATE',
 'Evidence Act 1995, Privacy Act 1988, Notifiable Data Breaches scheme',
 ARRAY['ap-southeast-2'], 'Australia/Sydney', 'en-AU', 'AUD'),
('GLOBAL', 'Global/International', ARRAY['International'], 'FLEXIBLE',
 'International Standards, ISO 27001, NIST Framework',
 ARRAY['us-east-1', 'eu-west-1', 'ap-south-1'], 'UTC', 'en', 'USD')
ON CONFLICT (code) DO NOTHING;

-- Insert default legal templates
INSERT INTO legal_templates (template_name, jurisdiction, case_type, sections, legal_framework, language) VALUES
('Indian Criminal Case Evidence Bundle', 'IN', 'criminal', 
 '["case_details", "evidence_list", "chain_of_custody", "hash_verification", "digital_signatures", "legal_compliance", "annexures"]',
 'Indian Evidence Act 1872, Section 65B', 'en-IN'),
('Indian Civil Case Evidence Bundle', 'IN', 'civil',
 '["case_details", "evidence_list", "authenticity_certificate", "technical_analysis", "legal_compliance"]',
 'Indian Evidence Act 1872, CPC 1908', 'en-IN'),
('Generic Criminal Case Evidence Bundle', 'GLOBAL', 'criminal',
 '["case_summary", "evidence_inventory", "custody_chain", "integrity_verification", "technical_reports"]',
 'International Standards, ISO 27037', 'en'),
('Generic Civil Case Evidence Bundle', 'GLOBAL', 'civil',
 '["case_summary", "evidence_inventory", "authenticity_reports", "technical_analysis"]',
 'International Standards', 'en')
ON CONFLICT (template_name, jurisdiction, case_type) DO NOTHING;

COMMENT ON TABLE legal_templates IS 'Regional legal document templates for court submissions';
COMMENT ON TABLE court_bundles IS 'Generated court bundles with digital signatures';
COMMENT ON TABLE jurisdictions IS 'Supported jurisdictions with compliance requirements';
COMMENT ON TABLE data_residency_rules IS 'Data residency and cross-border transfer rules';
COMMENT ON TABLE cross_jurisdiction_access_grants IS 'Cross-border case access permissions';
COMMENT ON TABLE user_jurisdiction_permissions IS 'User permissions for different jurisdictions';
COMMENT ON TABLE jurisdiction_routing_log IS 'Audit log for jurisdiction routing decisions';
COMMENT ON TABLE evidence_export_compliance IS 'Evidence export compliance tracking';
COMMENT ON TABLE compliance_violations IS 'Legal and regulatory compliance violations';
COMMENT ON TABLE multi_jurisdiction_cases IS 'Cases spanning multiple jurisdictions';