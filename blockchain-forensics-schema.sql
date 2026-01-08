-- Blockchain Integrity and Forensics Schema
-- C2PA Provenance, Video Segment Hashing, and Deepfake Detection

-- C2PA Provenance metadata table
CREATE TABLE IF NOT EXISTS c2pa_provenance (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    evidence_id UUID REFERENCES evidence(id) ON DELETE CASCADE,
    manifest_id UUID NOT NULL UNIQUE,
    version VARCHAR(10) DEFAULT '1.0',
    
    -- Content identification
    content_hash VARCHAR(64) NOT NULL,
    hash_algorithm VARCHAR(20) DEFAULT 'SHA-256',
    file_size BIGINT,
    mime_type VARCHAR(100),
    
    -- Capture device information
    device_make VARCHAR(100),
    device_model VARCHAR(100),
    device_serial VARCHAR(100),
    firmware_version VARCHAR(50),
    camera_settings JSONB,
    
    -- Location data
    capture_latitude DECIMAL(10, 8),
    capture_longitude DECIMAL(11, 8),
    capture_altitude DECIMAL(10, 2),
    location_accuracy DECIMAL(10, 2),
    location_timestamp TIMESTAMP WITH TIME ZONE,
    
    -- Operator information
    operator_id UUID REFERENCES users(id),
    operator_name VARCHAR(255),
    badge_number VARCHAR(50),
    department VARCHAR(100),
    
    -- Chain of custody
    initial_custodian UUID REFERENCES users(id),
    capture_time TIMESTAMP WITH TIME ZONE,
    case_id UUID REFERENCES cases(id),
    
    -- Technical metadata
    technical_metadata JSONB,
    
    -- Integrity assertions
    assertions JSONB,
    
    -- Digital signature (placeholder)
    signature_algorithm VARCHAR(20),
    certificate_data TEXT,
    signature_data TEXT,
    
    -- Blockchain anchoring
    blockchain_hash VARCHAR(64),
    blockchain_timestamp TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Video segment hashing table
CREATE TABLE IF NOT EXISTS video_segments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    evidence_id UUID REFERENCES evidence(id) ON DELETE CASCADE,
    video_id UUID NOT NULL,
    
    -- Segment information
    segment_index INTEGER NOT NULL,
    start_time DECIMAL(10, 3) NOT NULL, -- seconds with millisecond precision
    end_time DECIMAL(10, 3) NOT NULL,
    duration DECIMAL(10, 3) NOT NULL,
    
    -- Hashing
    segment_hash VARCHAR(64) NOT NULL,
    hash_algorithm VARCHAR(20) DEFAULT 'SHA-256',
    segment_size BIGINT,
    
    -- Frame metadata
    frame_count INTEGER,
    key_frames INTEGER,
    avg_frame_size DECIMAL(10, 2),
    
    -- Integrity status
    integrity_status VARCHAR(20) DEFAULT 'VERIFIED', -- VERIFIED, TAMPERED, UNKNOWN
    verification_timestamp TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Video segment summary table
CREATE TABLE IF NOT EXISTS video_segment_summary (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    evidence_id UUID REFERENCES evidence(id) ON DELETE CASCADE,
    video_id UUID NOT NULL UNIQUE,
    
    -- Video metadata
    total_duration DECIMAL(10, 3),
    segment_duration DECIMAL(10, 3) DEFAULT 5.0,
    segment_count INTEGER,
    
    -- Merkle tree
    merkle_root VARCHAR(64) NOT NULL,
    
    -- Blockchain anchoring
    blockchain_anchor JSONB,
    anchor_hash VARCHAR(64),
    anchor_timestamp TIMESTAMP WITH TIME ZONE,
    
    -- Verification status
    last_verification TIMESTAMP WITH TIME ZONE,
    verification_status VARCHAR(20) DEFAULT 'PENDING', -- PENDING, VERIFIED, FAILED
    tampered_segments INTEGER DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Deepfake analysis results
CREATE TABLE IF NOT EXISTS deepfake_analysis (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    evidence_id UUID REFERENCES evidence(id) ON DELETE CASCADE,
    analysis_id UUID NOT NULL UNIQUE,
    
    -- File information
    file_hash VARCHAR(64) NOT NULL,
    file_size BIGINT,
    mime_type VARCHAR(100),
    filename VARCHAR(255),
    
    -- Analysis status
    status VARCHAR(20) DEFAULT 'PENDING', -- PENDING, PROCESSING, COMPLETED, FAILED
    start_time TIMESTAMP WITH TIME ZONE,
    end_time TIMESTAMP WITH TIME ZONE,
    processing_duration INTEGER, -- milliseconds
    
    -- Overall risk assessment
    overall_risk_score INTEGER DEFAULT 0, -- 0-100
    risk_level VARCHAR(20) DEFAULT 'UNKNOWN', -- UNKNOWN, LOW, MEDIUM, HIGH, ERROR
    confidence INTEGER DEFAULT 0, -- 0-100
    provider_count INTEGER DEFAULT 0,
    
    -- Analysis metadata
    analysis_version VARCHAR(20) DEFAULT '1.0.0',
    
    -- Blockchain anchoring
    blockchain_anchor JSONB,
    anchor_hash VARCHAR(64),
    
    error_message TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Deepfake analysis provider results
CREATE TABLE IF NOT EXISTS deepfake_provider_results (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    analysis_id UUID REFERENCES deepfake_analysis(id) ON DELETE CASCADE,
    
    -- Provider information
    provider_name VARCHAR(100) NOT NULL,
    model_version VARCHAR(50),
    
    -- Results
    risk_score INTEGER, -- 0-100
    confidence INTEGER, -- 0-100
    explanation TEXT,
    details JSONB,
    
    -- Processing info
    processing_time INTEGER, -- milliseconds
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Error handling
    error_message TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Forensic reports table (unified for all forensic analyses)
CREATE TABLE IF NOT EXISTS forensic_reports (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    evidence_id UUID REFERENCES evidence(id) ON DELETE CASCADE,
    report_type VARCHAR(50) NOT NULL, -- C2PA, VIDEO_SEGMENTS, DEEPFAKE, COMBINED
    
    -- Report metadata
    report_data JSONB NOT NULL,
    generated_by UUID REFERENCES users(id),
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Legal information
    legal_statement TEXT,
    methodology TEXT,
    
    -- Export information
    exported_at TIMESTAMP WITH TIME ZONE,
    export_format VARCHAR(20), -- PDF, JSON, XML
    export_hash VARCHAR(64),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_c2pa_provenance_evidence_id ON c2pa_provenance(evidence_id);
CREATE INDEX IF NOT EXISTS idx_c2pa_provenance_manifest_id ON c2pa_provenance(manifest_id);
CREATE INDEX IF NOT EXISTS idx_c2pa_provenance_content_hash ON c2pa_provenance(content_hash);

CREATE INDEX IF NOT EXISTS idx_video_segments_evidence_id ON video_segments(evidence_id);
CREATE INDEX IF NOT EXISTS idx_video_segments_video_id ON video_segments(video_id);
CREATE INDEX IF NOT EXISTS idx_video_segments_index ON video_segments(video_id, segment_index);

CREATE INDEX IF NOT EXISTS idx_video_segment_summary_evidence_id ON video_segment_summary(evidence_id);
CREATE INDEX IF NOT EXISTS idx_video_segment_summary_video_id ON video_segment_summary(video_id);

CREATE INDEX IF NOT EXISTS idx_deepfake_analysis_evidence_id ON deepfake_analysis(evidence_id);
CREATE INDEX IF NOT EXISTS idx_deepfake_analysis_analysis_id ON deepfake_analysis(analysis_id);
CREATE INDEX IF NOT EXISTS idx_deepfake_analysis_status ON deepfake_analysis(status);
CREATE INDEX IF NOT EXISTS idx_deepfake_analysis_risk_level ON deepfake_analysis(risk_level);

CREATE INDEX IF NOT EXISTS idx_deepfake_provider_results_analysis_id ON deepfake_provider_results(analysis_id);
CREATE INDEX IF NOT EXISTS idx_deepfake_provider_results_provider ON deepfake_provider_results(provider_name);

CREATE INDEX IF NOT EXISTS idx_forensic_reports_evidence_id ON forensic_reports(evidence_id);
CREATE INDEX IF NOT EXISTS idx_forensic_reports_type ON forensic_reports(report_type);
CREATE INDEX IF NOT EXISTS idx_forensic_reports_generated_at ON forensic_reports(generated_at);

-- Row Level Security (RLS)
ALTER TABLE c2pa_provenance ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_segment_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE deepfake_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE deepfake_provider_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE forensic_reports ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- C2PA Provenance: same as evidence access
CREATE POLICY "C2PA provenance access" ON c2pa_provenance
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM evidence e
            JOIN cases c ON e.case_id = c.id
            WHERE e.id = c2pa_provenance.evidence_id
            AND (
                c.created_by = auth.uid() OR
                EXISTS (
                    SELECT 1 FROM users u 
                    WHERE u.id = auth.uid() 
                    AND u.role IN ('administrator', 'auditor', 'evidence_manager')
                )
            )
        )
    );

-- Video segments: same as evidence access
CREATE POLICY "Video segments access" ON video_segments
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM evidence e
            JOIN cases c ON e.case_id = c.id
            WHERE e.id = video_segments.evidence_id
            AND (
                c.created_by = auth.uid() OR
                EXISTS (
                    SELECT 1 FROM users u 
                    WHERE u.id = auth.uid() 
                    AND u.role IN ('administrator', 'auditor', 'evidence_manager')
                )
            )
        )
    );

-- Video segment summary: same as evidence access
CREATE POLICY "Video segment summary access" ON video_segment_summary
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM evidence e
            JOIN cases c ON e.case_id = c.id
            WHERE e.id = video_segment_summary.evidence_id
            AND (
                c.created_by = auth.uid() OR
                EXISTS (
                    SELECT 1 FROM users u 
                    WHERE u.id = auth.uid() 
                    AND u.role IN ('administrator', 'auditor', 'evidence_manager')
                )
            )
        )
    );

-- Deepfake analysis: same as evidence access
CREATE POLICY "Deepfake analysis access" ON deepfake_analysis
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM evidence e
            JOIN cases c ON e.case_id = c.id
            WHERE e.id = deepfake_analysis.evidence_id
            AND (
                c.created_by = auth.uid() OR
                EXISTS (
                    SELECT 1 FROM users u 
                    WHERE u.id = auth.uid() 
                    AND u.role IN ('administrator', 'auditor', 'evidence_manager', 'analyst')
                )
            )
        )
    );

-- Deepfake provider results: through analysis
CREATE POLICY "Deepfake provider results access" ON deepfake_provider_results
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM deepfake_analysis da
            JOIN evidence e ON da.evidence_id = e.id
            JOIN cases c ON e.case_id = c.id
            WHERE da.id = deepfake_provider_results.analysis_id
            AND (
                c.created_by = auth.uid() OR
                EXISTS (
                    SELECT 1 FROM users u 
                    WHERE u.id = auth.uid() 
                    AND u.role IN ('administrator', 'auditor', 'evidence_manager', 'analyst')
                )
            )
        )
    );

-- Forensic reports: same as evidence access
CREATE POLICY "Forensic reports access" ON forensic_reports
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM evidence e
            JOIN cases c ON e.case_id = c.id
            WHERE e.id = forensic_reports.evidence_id
            AND (
                c.created_by = auth.uid() OR
                EXISTS (
                    SELECT 1 FROM users u 
                    WHERE u.id = auth.uid() 
                    AND u.role IN ('administrator', 'auditor', 'evidence_manager', 'analyst', 'legal')
                )
            )
        )
    );

-- Functions for integrity verification
CREATE OR REPLACE FUNCTION verify_video_segment_integrity(
    p_video_id UUID
) RETURNS TABLE (
    segment_index INTEGER,
    is_valid BOOLEAN,
    current_hash VARCHAR(64),
    stored_hash VARCHAR(64)
) AS $$
BEGIN
    -- This would contain logic to re-hash video segments and compare
    -- For now, return mock verification results
    RETURN QUERY
    SELECT 
        vs.segment_index,
        TRUE as is_valid,
        vs.segment_hash as current_hash,
        vs.segment_hash as stored_hash
    FROM video_segments vs
    WHERE vs.video_id = p_video_id
    ORDER BY vs.segment_index;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION calculate_deepfake_risk_trend(
    p_evidence_id UUID
) RETURNS TABLE (
    analysis_date DATE,
    avg_risk_score DECIMAL,
    analysis_count INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        DATE(da.created_at) as analysis_date,
        AVG(da.overall_risk_score)::DECIMAL as avg_risk_score,
        COUNT(*)::INTEGER as analysis_count
    FROM deepfake_analysis da
    WHERE da.evidence_id = p_evidence_id
    AND da.status = 'COMPLETED'
    GROUP BY DATE(da.created_at)
    ORDER BY analysis_date;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updating timestamps
CREATE OR REPLACE FUNCTION update_forensic_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_c2pa_provenance_timestamp
    BEFORE UPDATE ON c2pa_provenance
    FOR EACH ROW
    EXECUTE FUNCTION update_forensic_timestamp();

CREATE TRIGGER update_video_segment_summary_timestamp
    BEFORE UPDATE ON video_segment_summary
    FOR EACH ROW
    EXECUTE FUNCTION update_forensic_timestamp();

CREATE TRIGGER update_deepfake_analysis_timestamp
    BEFORE UPDATE ON deepfake_analysis
    FOR EACH ROW
    EXECUTE FUNCTION update_forensic_timestamp();

-- Insert sample data for testing
INSERT INTO deepfake_analysis (evidence_id, analysis_id, file_hash, overall_risk_score, risk_level, confidence, status)
SELECT 
    e.id,
    gen_random_uuid(),
    encode(sha256(e.filename::bytea), 'hex'),
    (random() * 100)::INTEGER,
    CASE 
        WHEN random() < 0.7 THEN 'LOW'
        WHEN random() < 0.9 THEN 'MEDIUM'
        ELSE 'HIGH'
    END,
    (70 + random() * 30)::INTEGER,
    'COMPLETED'
FROM evidence e
WHERE e.file_type LIKE 'image/%' OR e.file_type LIKE 'video/%'
LIMIT 5;

COMMENT ON TABLE c2pa_provenance IS 'C2PA-compliant provenance metadata for digital evidence';
COMMENT ON TABLE video_segments IS 'Individual video segment hashes for integrity verification';
COMMENT ON TABLE video_segment_summary IS 'Summary and Merkle tree data for video segments';
COMMENT ON TABLE deepfake_analysis IS 'AI-based deepfake detection analysis results';
COMMENT ON TABLE deepfake_provider_results IS 'Individual AI provider results for deepfake analysis';
COMMENT ON TABLE forensic_reports IS 'Generated forensic reports for court submission';