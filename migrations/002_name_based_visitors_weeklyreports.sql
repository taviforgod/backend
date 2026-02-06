-- 002_name_based_visitors_weeklyreports.sql
-- Final schema: visitors with lifecycle + follow-up; weekly reports store arrays but frontend uses names only.

-- Visitors table (rich schema)
CREATE TABLE IF NOT EXISTS visitors (
  id SERIAL PRIMARY KEY,
  
  church_id INT NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  cell_group_id INT REFERENCES cell_groups(id) ON DELETE SET NULL,

  first_name TEXT NOT NULL,
  surname TEXT,
  contact_primary TEXT,
  contact_secondary TEXT,
  email TEXT,
  home_address TEXT,
  date_of_first_visit DATE,

  how_heard TEXT CHECK (how_heard IN ('Friend', 'Church', 'Outreach', 'Online', 'Other')),
  age_group TEXT CHECK (age_group IN ('Teen', 'Young Adult', 'Adult', 'Elder')),
  church_affiliation TEXT CHECK (church_affiliation IN ('Member', 'Non-Member', 'Seeker', 'Backslider')),

  prayer_requests TEXT,

  invited_by INT REFERENCES members(id) ON DELETE SET NULL,
  follow_up_method TEXT CHECK (follow_up_method IN ('Visit', 'Call', 'WhatsApp', 'Coffee Meetup')),
  member_id INT REFERENCES members(id) ON DELETE SET NULL, -- Assigned follow-up personnel

  next_follow_up_date DATE,
  notes TEXT,

  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'followed_up', 'converted')),
  follow_up_status TEXT DEFAULT 'pending' CHECK (follow_up_status IN ('pending', 'in_progress', 'done')),

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE visitors
  DROP CONSTRAINT visitors_how_heard_check,
  ADD CONSTRAINT visitors_how_heard_check CHECK (how_heard IN ('Friend', 'Church', 'Outreach', 'Online', 'Other', 'evangelism'));
-- Weekly Reports (safe re-create if not exists; otherwise ALTERs)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name='cell_leader_reports'
  ) THEN
    CREATE TABLE cell_leader_reports (
      id SERIAL PRIMARY KEY,
      church_id INT NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
      cell_group_id INT NOT NULL REFERENCES cell_groups(id),
      leader_id INT NOT NULL REFERENCES members(id),
      date_of_meeting DATE NOT NULL,
      topic_taught TEXT,
      attendees INT[] DEFAULT '{}',
      absentees INT[] DEFAULT '{}',
      visitors INT[] DEFAULT '{}',
      attendance INT DEFAULT 0,
      visitors_count INT DEFAULT 0,
      testimonies TEXT,
      prayer_requests TEXT,
      follow_ups TEXT,
      challenges TEXT,
      support_needed TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );
  ELSE
    -- Ensure new columns exist
    BEGIN
      ALTER TABLE cell_leader_reports ADD COLUMN IF NOT EXISTS attendees INT[] DEFAULT '{}';
      ALTER TABLE cell_leader_reports ADD COLUMN IF NOT EXISTS absentees INT[] DEFAULT '{}';
      ALTER TABLE cell_leader_reports ADD COLUMN IF NOT EXISTS visitors INT[] DEFAULT '{}';
      ALTER TABLE cell_leader_reports ADD COLUMN IF NOT EXISTS attendance INT DEFAULT 0;
      ALTER TABLE cell_leader_reports ADD COLUMN IF NOT EXISTS visitors_count INT DEFAULT 0;
    EXCEPTION WHEN duplicate_column THEN NULL;
    END;
  END IF;
END $$;
-- migrations/20250822_add_removed_at_to_cell_group_members.sql
BEGIN;

-- 1) add removed_at for soft deletes if not present
ALTER TABLE cell_group_members
  ADD COLUMN IF NOT EXISTS removed_at timestamptz NULL;

-- 2) ensure there's a unique constraint for (cell_group_id, member_id) to support ON CONFLICT upserts
-- If you used a primary key id only, create a UNIQUE index to be used with ON CONFLICT (cell_group_id, member_id)
CREATE UNIQUE INDEX IF NOT EXISTS ux_cell_group_members_cell_member
  ON cell_group_members (cell_group_id, member_id);

-- 3) optional helpful index to speed queries that filter removed_at IS NULL
CREATE INDEX IF NOT EXISTS idx_cell_group_members_removed_at
  ON cell_group_members (removed_at);

COMMIT;
-- migrations/20250822_add_member_timestamps_and_index.sql
BEGIN;

-- Add assigned_at for audit (when member was assigned to group)
ALTER TABLE cell_group_members
  ADD COLUMN IF NOT EXISTS assigned_at timestamptz DEFAULT now();

-- Add removed_at for soft-deletes (if not already present)
ALTER TABLE cell_group_members
  ADD COLUMN IF NOT EXISTS removed_at timestamptz NULL;

-- Ensure unique constraint for upserts: (cell_group_id, member_id)
-- If you already have a PK id column but no unique on cell+member, create unique index
CREATE UNIQUE INDEX IF NOT EXISTS ux_cell_group_members_cell_member
  ON cell_group_members (cell_group_id, member_id);

-- Optional helpful index to speed queries that filter removed_at IS NULL
CREATE INDEX IF NOT EXISTS idx_cell_group_members_removed_at
  ON cell_group_members (removed_at);

COMMIT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name='cell_leader_reports'
  ) THEN
    CREATE TABLE cell_leader_reports (
      id SERIAL PRIMARY KEY,
      church_id INT NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
      cell_group_id INT NOT NULL REFERENCES cell_groups(id),
      leader_id INT NOT NULL REFERENCES members(id),
      date_of_meeting DATE NOT NULL,
      topic_taught TEXT,
      attendees INT[] DEFAULT '{}',
      attendee_names TEXT[] DEFAULT '{}',
      absentees INT[] DEFAULT '{}',
      visitors INT[] DEFAULT '{}',
      attendance INT DEFAULT 0,
      visitors_count INT DEFAULT 0,
      testimonies TEXT,
      prayer_requests TEXT,
      follow_ups TEXT,
      challenges TEXT,
      support_needed TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
  ELSE
    -- Ensure new columns exist
    BEGIN
      ALTER TABLE cell_leader_reports ADD COLUMN IF NOT EXISTS attendees INT[] DEFAULT '{}';
      ALTER TABLE cell_leader_reports ADD COLUMN IF NOT EXISTS attendee_names TEXT[] DEFAULT '{}';
      ALTER TABLE cell_leader_reports ADD COLUMN IF NOT EXISTS absentees INT[] DEFAULT '{}';
      ALTER TABLE cell_leader_reports ADD COLUMN IF NOT EXISTS visitors INT[] DEFAULT '{}';
      ALTER TABLE cell_leader_reports ADD COLUMN IF NOT EXISTS attendance INT DEFAULT 0;
      ALTER TABLE cell_leader_reports ADD COLUMN IF NOT EXISTS visitors_count INT DEFAULT 0;
      ALTER TABLE cell_leader_reports ADD COLUMN IF NOT EXISTS testimonies TEXT;
      ALTER TABLE cell_leader_reports ADD COLUMN IF NOT EXISTS prayer_requests TEXT;
      ALTER TABLE cell_leader_reports ADD COLUMN IF NOT EXISTS follow_ups TEXT;
      ALTER TABLE cell_leader_reports ADD COLUMN IF NOT EXISTS challenges TEXT;
      ALTER TABLE cell_leader_reports ADD COLUMN IF NOT EXISTS support_needed TEXT;
      ALTER TABLE cell_leader_reports ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
    EXCEPTION WHEN duplicate_column THEN NULL;
    END;
  END IF;
END $$;

ALTER TABLE cell_leader_reports ADD COLUMN IF NOT EXISTS absentee_reasons JSONB DEFAULT '{}';