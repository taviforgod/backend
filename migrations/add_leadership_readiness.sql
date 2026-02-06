-- Add readiness fields to leadership_roles for Leadership Readiness feature
ALTER TABLE leadership_roles
  ADD COLUMN IF NOT EXISTS readiness_score INTEGER DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS readiness_status VARCHAR(50) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Optionally create an index for quick ordering
CREATE INDEX IF NOT EXISTS idx_leadership_roles_readiness_score ON leadership_roles(readiness_score DESC NULLS LAST);