-- Migration: add exit_id to members to link active inactive exits
ALTER TABLE members
  ADD COLUMN IF NOT EXISTS exit_id INTEGER REFERENCES inactive_member_exits(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_members_exit_id ON members(exit_id);
