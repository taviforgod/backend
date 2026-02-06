-- Add zone_id to leadership_readiness_approvals and backfill from members
ALTER TABLE leadership_readiness_approvals
  ADD COLUMN IF NOT EXISTS zone_id INTEGER REFERENCES zones(id);

-- Backfill existing records with current member zone (best-effort)
UPDATE leadership_readiness_approvals ra
SET zone_id = m.zone_id
FROM members m
WHERE m.id = ra.leader_id AND ra.zone_id IS NULL;

-- Add index for faster filtering
CREATE INDEX IF NOT EXISTS idx_leadership_readiness_approvals_zone_id ON leadership_readiness_approvals(zone_id);
