-- Add placement timestamp to contracts (used for DL 5-day and MINORS 5-day enforcement)
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS placed_at TIMESTAMPTZ;

-- Comment
COMMENT ON COLUMN contracts.placed_at IS 'Timestamp when player was most recently placed on a reserve designation (DL/IR/SSPD/MINORS). Used to enforce minimum stay rules.';
