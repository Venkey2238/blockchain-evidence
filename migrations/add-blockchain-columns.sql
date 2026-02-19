-- Add blockchain and IPFS columns to evidence table
ALTER TABLE evidence ADD COLUMN IF NOT EXISTS ipfs_cid TEXT;
ALTER TABLE evidence ADD COLUMN IF NOT EXISTS blockchain_tx_hash TEXT;
ALTER TABLE evidence ADD COLUMN IF NOT EXISTS blockchain_block_number BIGINT;
ALTER TABLE evidence ADD COLUMN IF NOT EXISTS gas_used NUMERIC;
ALTER TABLE evidence ADD COLUMN IF NOT EXISTS blockchain_verified BOOLEAN DEFAULT false;
ALTER TABLE evidence ADD COLUMN IF NOT EXISTS blockchain_timestamp TIMESTAMP;

-- Create index for faster blockchain lookups
CREATE INDEX IF NOT EXISTS idx_evidence_blockchain_tx ON evidence(blockchain_tx_hash);
CREATE INDEX IF NOT EXISTS idx_evidence_ipfs_cid ON evidence(ipfs_cid);
CREATE INDEX IF NOT EXISTS idx_evidence_hash ON evidence(hash);

-- Create blockchain_transactions table for tracking
CREATE TABLE IF NOT EXISTS blockchain_transactions (
  id SERIAL PRIMARY KEY,
  evidence_id INTEGER REFERENCES evidence(id),
  tx_hash TEXT NOT NULL UNIQUE,
  block_number BIGINT,
  gas_used NUMERIC,
  status TEXT DEFAULT 'pending',
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  confirmed_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_blockchain_tx_hash ON blockchain_transactions(tx_hash);
CREATE INDEX IF NOT EXISTS idx_blockchain_evidence_id ON blockchain_transactions(evidence_id);

-- Add comments
COMMENT ON COLUMN evidence.ipfs_cid IS 'IPFS Content Identifier from Pinata';
COMMENT ON COLUMN evidence.blockchain_tx_hash IS 'Polygon blockchain transaction hash';
COMMENT ON COLUMN evidence.blockchain_block_number IS 'Block number where evidence was recorded';
COMMENT ON COLUMN evidence.gas_used IS 'Gas consumed for blockchain transaction';
