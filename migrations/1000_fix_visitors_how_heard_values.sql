-- 1000_fix_visitors_how_heard_values.sql
-- Normalize existing visitors.how_heard values and ensure constraint exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='visitors') THEN
    -- Set unknown or invalid values to 'Other' to satisfy new constraint
    UPDATE visitors
    SET how_heard = 'Other'
    WHERE how_heard IS NULL OR how_heard NOT IN ('Friend', 'Church', 'Outreach', 'Online', 'Other', 'evangelism');

    -- Recreate constraint (safe drop if exists)
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname='visitors_how_heard_check') THEN
      ALTER TABLE visitors DROP CONSTRAINT visitors_how_heard_check;
    END IF;

    ALTER TABLE visitors ADD CONSTRAINT visitors_how_heard_check CHECK (how_heard IN ('Friend', 'Church', 'Outreach', 'Online', 'Other', 'evangelism'));
  END IF;
END $$;