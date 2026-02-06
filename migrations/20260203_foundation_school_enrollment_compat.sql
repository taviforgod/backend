-- 20260203_foundation_school_enrollment_compat.sql
BEGIN;

-- Add compatibility columns expected by reporting and foundation school modules
ALTER TABLE foundation_school_enrollments
  ADD COLUMN IF NOT EXISTS level INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS enrolled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS module_number INTEGER,
  ADD COLUMN IF NOT EXISTS next_session_date DATE;

-- Backfill enrolled_at/completed_at from legacy columns if present
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'foundation_school_enrollments' AND column_name = 'enrollment_date'
  ) THEN
    UPDATE foundation_school_enrollments
    SET enrolled_at = COALESCE(enrolled_at, enrollment_date);
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'foundation_school_enrollments' AND column_name = 'completion_date'
  ) THEN
    UPDATE foundation_school_enrollments
    SET completed_at = COALESCE(completed_at, completion_date);
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'foundation_school_enrollments' AND column_name = 'current_module'
  ) THEN
    UPDATE foundation_school_enrollments
    SET module_number = COALESCE(module_number, current_module);
  END IF;
END $$;

-- Backfill level from foundation_school_classes.class_level where possible
DO $$
BEGIN
  IF to_regclass('public.foundation_school_classes') IS NOT NULL THEN
    UPDATE foundation_school_enrollments fe
    SET level = COALESCE(
      level,
      NULLIF(regexp_replace(fsc.class_level, '[^0-9]', '', 'g'), '')::int
    )
    FROM foundation_school_classes fsc
    WHERE fe.class_id = fsc.id
      AND (fe.level IS NULL OR fe.level = 1);
  END IF;
END $$;

UPDATE foundation_school_enrollments
SET level = 1
WHERE level IS NULL;

COMMIT;
