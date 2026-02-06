-- 20260203_member_status_cell_members_cleanup.sql
BEGIN;

-- Ensure member_statuses exists (idempotent)
CREATE TABLE IF NOT EXISTS member_statuses (
  id SERIAL PRIMARY KEY,
  name VARCHAR(30) UNIQUE NOT NULL,
  description TEXT
);

ALTER TABLE member_statuses
  ADD COLUMN IF NOT EXISTS description TEXT;

-- Seed common statuses
INSERT INTO member_statuses (name, description) VALUES
  ('active', 'Active member'),
  ('inactive', 'Inactive member'),
  ('suspended', 'Suspended member'),
  ('transferred', 'Transferred member'),
  ('deceased', 'Deceased member'),
  ('moved', 'Moved member'),
  ('resigned', 'Resigned member'),
  ('relocated', 'Relocated member'),
  ('exited', 'Exited member')
ON CONFLICT (name) DO NOTHING;

-- Add member_status_id + active flag if missing
ALTER TABLE members
  ADD COLUMN IF NOT EXISTS member_status_id INTEGER REFERENCES member_statuses(id),
  ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT TRUE;

-- Backfill member_status_id from legacy members.status if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'members' AND column_name = 'status'
  ) THEN
    UPDATE members m
    SET member_status_id = ms.id
    FROM member_statuses ms
    WHERE m.member_status_id IS NULL
      AND LOWER(m.status) = LOWER(ms.name);
  END IF;
END $$;

-- Backfill from active flag if still null
DO $$
DECLARE active_id INT;
DECLARE inactive_id INT;
BEGIN
  SELECT id INTO active_id FROM member_statuses WHERE name = 'active' LIMIT 1;
  SELECT id INTO inactive_id FROM member_statuses WHERE name = 'inactive' LIMIT 1;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'members' AND column_name = 'active'
  ) THEN
    UPDATE members m
    SET member_status_id = CASE WHEN m.active IS FALSE THEN inactive_id ELSE active_id END
    WHERE m.member_status_id IS NULL;
  END IF;
END $$;

-- Default any remaining nulls to active
UPDATE members
SET member_status_id = (SELECT id FROM member_statuses WHERE name = 'active' LIMIT 1)
WHERE member_status_id IS NULL;

UPDATE members SET active = TRUE WHERE active IS NULL;

-- Backfill cell_members from legacy members.cell_group_id if present
DO $$
BEGIN
  IF to_regclass('public.cell_members') IS NOT NULL
     AND EXISTS (
       SELECT 1 FROM information_schema.columns
       WHERE table_name = 'members' AND column_name = 'cell_group_id'
     ) THEN
    INSERT INTO cell_members (cell_group_id, member_id, role, is_active, joined_at, date_joined, assigned_at)
    SELECT m.cell_group_id,
           m.id,
           'member',
           COALESCE(m.active, TRUE),
           COALESCE(m.date_joined, NOW()),
           m.date_joined,
           NOW()
    FROM members m
    WHERE m.cell_group_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM cell_members cm
        WHERE cm.member_id = m.id AND cm.cell_group_id = m.cell_group_id
      );
  END IF;
END $$;

-- Add notes column to cell_attendance (used by attendanceController)
ALTER TABLE cell_attendance
  ADD COLUMN IF NOT EXISTS notes TEXT;

COMMIT;
