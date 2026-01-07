-- Evidence Export Feature Database Schema Update
-- Add this to your existing database schema

-- Create downloads table for tracking evidence downloads
CREATE TABLE IF NOT EXISTS downloads (
    id SERIAL PRIMARY KEY,
    evidence_id INTEGER REFERENCES evidence(id),
    user_wallet TEXT NOT NULL,
    download_type TEXT NOT NULL CHECK (download_type IN ('single', 'bulk')),
    file_name TEXT,
    watermark_applied BOOLEAN DEFAULT TRUE,
    download_timestamp TIMESTAMPTZ DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT,
    metadata JSONB
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_downloads_evidence_id ON downloads(evidence_id);
CREATE INDEX IF NOT EXISTS idx_downloads_user_wallet ON downloads(user_wallet);
CREATE INDEX IF NOT EXISTS idx_downloads_timestamp ON downloads(download_timestamp);

-- Add RLS (Row Level Security) policies
ALTER TABLE downloads ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own downloads
CREATE POLICY "Users can view own downloads" ON downloads
    FOR SELECT USING (user_wallet = current_setting('app.current_user_wallet', true));

-- Policy: Admins and auditors can see all downloads
CREATE POLICY "Admins and auditors can view all downloads" ON downloads
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE wallet_address = current_setting('app.current_user_wallet', true)
            AND role IN ('admin', 'auditor')
            AND is_active = true
        )
    );

-- Policy: Only authenticated users can insert downloads
CREATE POLICY "Authenticated users can insert downloads" ON downloads
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM users 
            WHERE wallet_address = user_wallet
            AND is_active = true
        )
    );

-- Update evidence table to add download_count column
ALTER TABLE evidence ADD COLUMN IF NOT EXISTS download_count INTEGER DEFAULT 0;

-- Create function to update download count
CREATE OR REPLACE FUNCTION update_evidence_download_count()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE evidence 
    SET download_count = download_count + 1 
    WHERE id = NEW.evidence_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update download count
DROP TRIGGER IF EXISTS trigger_update_download_count ON downloads;
CREATE TRIGGER trigger_update_download_count
    AFTER INSERT ON downloads
    FOR EACH ROW
    EXECUTE FUNCTION update_evidence_download_count();

-- Add export permissions to existing roles
COMMENT ON TABLE downloads IS 'Tracks all evidence downloads and exports with watermarking and audit trail';

-- Sample data for testing (optional)
-- INSERT INTO evidence (name, case_number, file_type, hash, submitted_by, timestamp) VALUES
-- ('Sample Crime Scene Photo', 'CASE-2024-001', 'image/jpeg', '0x1234567890abcdef', '0x1111111111111111111111111111111111111111', NOW()),
-- ('Sample Witness Statement', 'CASE-2024-001', 'application/pdf', '0xabcdef1234567890', '0x2222222222222222222222222222222222222222', NOW()),
-- ('Sample Security Footage', 'CASE-2024-002', 'video/mp4', '0x567890abcdef1234', '0x3333333333333333333333333333333333333333', NOW());