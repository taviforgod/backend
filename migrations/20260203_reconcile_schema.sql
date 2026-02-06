-- 20260203_reconcile_schema.sql
BEGIN;

-- =========================================================
-- 1) Reconcile cell_members vs cell_group_members
-- =========================================================
DO $$
BEGIN
  IF to_regclass('public.cell_members') IS NULL
     AND to_regclass('public.cell_group_members') IS NOT NULL THEN
    ALTER TABLE cell_group_members RENAME TO cell_members;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS cell_members (
  id SERIAL PRIMARY KEY,
  cell_group_id INT NOT NULL REFERENCES cell_groups(id) ON DELETE CASCADE,
  member_id INT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  role_id INT REFERENCES roles(id),
  role VARCHAR(32) DEFAULT 'member',
  status_id INT REFERENCES status_types(id),
  is_active BOOLEAN DEFAULT TRUE,
  joined_at TIMESTAMPTZ DEFAULT now(),
  left_at TIMESTAMPTZ,
  date_joined TIMESTAMPTZ,
  date_left TIMESTAMPTZ,
  assigned_at TIMESTAMPTZ DEFAULT now(),
  removed_at TIMESTAMPTZ,
  consecutive_absences INT DEFAULT 0,
  total_absences INT DEFAULT 0,
  added_by INT REFERENCES members(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE cell_members
  ADD COLUMN IF NOT EXISTS role_id INTEGER REFERENCES roles(id),
  ADD COLUMN IF NOT EXISTS role VARCHAR(32) DEFAULT 'member',
  ADD COLUMN IF NOT EXISTS status_id INTEGER REFERENCES status_types(id),
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS joined_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS left_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS date_joined TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS date_left TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN IF NOT EXISTS removed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS consecutive_absences INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_absences INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS added_by INTEGER REFERENCES members(id),
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

UPDATE cell_members
SET date_joined = COALESCE(date_joined, joined_at),
    date_left = COALESCE(date_left, left_at),
    joined_at = COALESCE(joined_at, date_joined),
    left_at = COALESCE(left_at, date_left),
    is_active = COALESCE(is_active, left_at IS NULL),
    role_id = COALESCE(role_id, (SELECT id FROM roles r WHERE r.name = cell_members.role LIMIT 1));

CREATE OR REPLACE FUNCTION sync_cell_member_dates()
RETURNS trigger AS $$
BEGIN
  IF NEW.date_joined IS NOT NULL AND NEW.joined_at IS NULL THEN NEW.joined_at := NEW.date_joined; END IF;
  IF NEW.joined_at IS NOT NULL AND NEW.date_joined IS NULL THEN NEW.date_joined := NEW.joined_at; END IF;
  IF NEW.date_left IS NOT NULL AND NEW.left_at IS NULL THEN NEW.left_at := NEW.date_left; END IF;
  IF NEW.left_at IS NOT NULL AND NEW.date_left IS NULL THEN NEW.date_left := NEW.left_at; END IF;
  IF NEW.is_active IS NULL THEN NEW.is_active := (NEW.left_at IS NULL); END IF;
  RETURN NEW;
END $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_cell_member_dates ON cell_members;
CREATE TRIGGER trg_sync_cell_member_dates
BEFORE INSERT OR UPDATE ON cell_members
FOR EACH ROW EXECUTE FUNCTION sync_cell_member_dates();

CREATE UNIQUE INDEX IF NOT EXISTS ux_cell_members_cell_member
  ON cell_members (cell_group_id, member_id);

DO $$
BEGIN
  IF to_regclass('public.cell_group_members') IS NULL THEN
    EXECUTE 'CREATE VIEW cell_group_members AS SELECT * FROM cell_members';
  END IF;
END $$;

-- =========================================================
-- 2) weekly_reports JSONB arrays + counts
-- =========================================================
ALTER TABLE weekly_reports
  ADD COLUMN IF NOT EXISTS attendees JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS visitors JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS absentees JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS visitors_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS absentees_count INTEGER DEFAULT 0;

UPDATE weekly_reports
SET visitors_count = jsonb_array_length(COALESCE(visitors, '[]'::jsonb)),
    absentees_count = jsonb_array_length(COALESCE(absentees, '[]'::jsonb));

-- =========================================================
-- 3) mentorship_assignments compatibility columns
-- =========================================================
ALTER TABLE mentorship_assignments
  ADD COLUMN IF NOT EXISTS start_date DATE,
  ADD COLUMN IF NOT EXISTS end_date DATE;

UPDATE mentorship_assignments
SET start_date = COALESCE(start_date, started_at::date)
WHERE started_at IS NOT NULL;

-- =========================================================
-- 4) Zones reconciliation (global-friendly)
-- =========================================================
ALTER TABLE zones
  ADD COLUMN IF NOT EXISTS church_id INTEGER REFERENCES churches(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS region VARCHAR(100),
  ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'zones' AND column_name = 'church_id'
  ) THEN
    BEGIN
      ALTER TABLE zones ALTER COLUMN church_id DROP NOT NULL;
    EXCEPTION WHEN others THEN
      NULL;
    END;
  END IF;
END $$;

ALTER TABLE churches
  ADD COLUMN IF NOT EXISTS zone_id INTEGER;

ALTER TABLE cell_groups
  ADD COLUMN IF NOT EXISTS zone_id INTEGER;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_churches_zone_id'
  ) THEN
    ALTER TABLE churches
      ADD CONSTRAINT fk_churches_zone_id
      FOREIGN KEY (zone_id) REFERENCES zones(id) ON DELETE SET NULL NOT VALID;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_cell_groups_zone_id'
  ) THEN
    ALTER TABLE cell_groups
      ADD CONSTRAINT fk_cell_groups_zone_id
      FOREIGN KEY (zone_id) REFERENCES zones(id) ON DELETE SET NULL NOT VALID;
  END IF;
END $$;

COMMIT;
