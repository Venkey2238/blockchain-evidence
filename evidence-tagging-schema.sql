-- Evidence Tagging System Database Schema
-- Run this in Supabase SQL Editor

-- Create tags table
CREATE TABLE IF NOT EXISTS tags (
    id SERIAL PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    color TEXT DEFAULT '#3B82F6',
    category TEXT,
    parent_id INTEGER REFERENCES tags(id),
    usage_count INTEGER DEFAULT 0,
    created_by TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create evidence_tags junction table
CREATE TABLE IF NOT EXISTS evidence_tags (
    evidence_id INTEGER REFERENCES evidence(id) ON DELETE CASCADE,
    tag_id INTEGER REFERENCES tags(id) ON DELETE CASCADE,
    tagged_by TEXT NOT NULL,
    tagged_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (evidence_id, tag_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_tags_name ON tags(name);
CREATE INDEX IF NOT EXISTS idx_tags_category ON tags(category);
CREATE INDEX IF NOT EXISTS idx_tags_usage_count ON tags(usage_count DESC);
CREATE INDEX IF NOT EXISTS idx_evidence_tags_evidence_id ON evidence_tags(evidence_id);
CREATE INDEX IF NOT EXISTS idx_evidence_tags_tag_id ON evidence_tags(tag_id);

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

-- Function to get evidence with all specified tags (AND logic)
CREATE OR REPLACE FUNCTION get_evidence_with_all_tags(tag_ids INTEGER[])
RETURNS TABLE(
    id INTEGER,
    name TEXT,
    case_number TEXT,
    file_type TEXT,
    hash TEXT,
    submitted_by TEXT,
    timestamp TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT e.id, e.name, e.case_number, e.file_type, e.hash, e.submitted_by, e.timestamp
    FROM evidence e
    WHERE e.id IN (
        SELECT et.evidence_id
        FROM evidence_tags et
        WHERE et.tag_id = ANY(tag_ids)
        GROUP BY et.evidence_id
        HAVING COUNT(DISTINCT et.tag_id) = array_length(tag_ids, 1)
    );
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update usage count
DROP TRIGGER IF EXISTS trigger_update_tag_usage ON evidence_tags;
CREATE TRIGGER trigger_update_tag_usage
    AFTER INSERT OR DELETE ON evidence_tags
    FOR EACH ROW EXECUTE FUNCTION update_tag_usage_count();

-- RLS Policies
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE evidence_tags ENABLE ROW LEVEL SECURITY;

-- Tags policies
CREATE POLICY "Users can view all tags" ON tags FOR SELECT USING (true);
CREATE POLICY "Users can create tags" ON tags FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update own tags" ON tags FOR UPDATE USING (created_by = auth.jwt() ->> 'wallet_address');
CREATE POLICY "Admins can delete tags" ON tags FOR DELETE USING (
    EXISTS (
        SELECT 1 FROM users 
        WHERE wallet_address = auth.jwt() ->> 'wallet_address' 
        AND role IN ('administrator', 'evidence_manager', 'auditor')
    )
);

-- Evidence tags policies
CREATE POLICY "Users can view evidence tags" ON evidence_tags FOR SELECT USING (true);
CREATE POLICY "Users can add evidence tags" ON evidence_tags FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can remove own evidence tags" ON evidence_tags FOR DELETE USING (tagged_by = auth.jwt() ->> 'wallet_address');

-- Insert default tags
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