-- Migration: create mapping table from exit_type -> member_status_id
CREATE TABLE IF NOT EXISTS exit_type_status_map (
  exit_type VARCHAR(100) PRIMARY KEY,
  member_status_id INTEGER REFERENCES member_statuses(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_exit_type_map_status ON exit_type_status_map(member_status_id);

-- Note: use the admin interface or an explicit seeding migration to populate this table.
