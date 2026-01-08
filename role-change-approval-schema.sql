-- Role Change Approval System Schema
-- This creates the necessary table for multi-step role change approval

-- Create role_change_requests table
CREATE TABLE IF NOT EXISTS role_change_requests (
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

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_role_change_requests_status ON role_change_requests(status);
CREATE INDEX IF NOT EXISTS idx_role_change_requests_target ON role_change_requests(target_wallet);
CREATE INDEX IF NOT EXISTS idx_role_change_requests_requesting ON role_change_requests(requesting_admin);

-- Add RLS (Row Level Security) policies
ALTER TABLE role_change_requests ENABLE ROW LEVEL SECURITY;

-- Policy: Allow all operations for now (since your main DB uses this pattern)
CREATE POLICY "Allow all operations" ON role_change_requests FOR ALL USING (true);

-- Function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_role_change_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to call the function
CREATE TRIGGER role_change_requests_updated_at_trigger
    BEFORE UPDATE ON role_change_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_role_change_requests_updated_at();