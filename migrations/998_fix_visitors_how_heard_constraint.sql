-- 998_fix_visitors_how_heard_constraint.sql
-- Ensure the visitors_how_heard_check constraint is present and allows 'evangelism'
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='visitors') THEN
    -- Drop if exists
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname='visitors_how_heard_check') THEN
      ALTER TABLE visitors DROP CONSTRAINT visitors_how_heard_check;
    END IF;

    -- Add the constraint if not present
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='visitors_how_heard_check') THEN
      ALTER TABLE visitors ADD CONSTRAINT visitors_how_heard_check CHECK (how_heard IN ('Friend', 'Church', 'Outreach', 'Online', 'Other', 'evangelism'));
    END IF;
  END IF;
END $$;