-- Migration: seed common member_statuses and map them to exit types
-- Adds statuses if missing, and populates exit_type_status_map

-- Common exit types to seed: moved, transferred, resigned, deceased, relocated, inactive, exited

-- 1) Insert member_statuses if they do not exist (robust to schema changes)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='member_statuses' AND column_name='description') THEN
    INSERT INTO member_statuses (name, description)
    SELECT name, description FROM (VALUES
      ('active', 'Active member'),
      ('moved', 'Member moved/resettled'),
      ('transferred', 'Member transferred to another church/branch'),
      ('resigned', 'Resigned from ministry/membership'),
      ('deceased', 'Deceased'),
      ('relocated', 'Relocated (moved geographically)'),
      ('inactive', 'Marked inactive'),
      ('exited', 'Exited membership')
    ) AS v(name, description)
    WHERE NOT EXISTS (SELECT 1 FROM member_statuses ms WHERE ms.name = v.name);
  ELSE
    INSERT INTO member_statuses (name)
    SELECT name FROM (VALUES
      ('active', ''),
      ('moved', ''),
      ('transferred', ''),
      ('resigned', ''),
      ('deceased', ''),
      ('relocated', ''),
      ('inactive', ''),
      ('exited', '')
    ) AS v(name, description)
    WHERE NOT EXISTS (SELECT 1 FROM member_statuses ms WHERE ms.name = v.name);
  END IF;
END $$;

-- 2) Populate/ensure mappings in exit_type_status_map
INSERT INTO exit_type_status_map (exit_type, member_status_id)
SELECT 'moved', id FROM member_statuses WHERE name = 'moved'
ON CONFLICT (exit_type) DO UPDATE SET member_status_id = EXCLUDED.member_status_id;

INSERT INTO exit_type_status_map (exit_type, member_status_id)
SELECT 'transferred', id FROM member_statuses WHERE name = 'transferred'
ON CONFLICT (exit_type) DO UPDATE SET member_status_id = EXCLUDED.member_status_id;

INSERT INTO exit_type_status_map (exit_type, member_status_id)
SELECT 'resigned', id FROM member_statuses WHERE name = 'resigned'
ON CONFLICT (exit_type) DO UPDATE SET member_status_id = EXCLUDED.member_status_id;

INSERT INTO exit_type_status_map (exit_type, member_status_id)
SELECT 'deceased', id FROM member_statuses WHERE name = 'deceased'
ON CONFLICT (exit_type) DO UPDATE SET member_status_id = EXCLUDED.member_status_id;

INSERT INTO exit_type_status_map (exit_type, member_status_id)
SELECT 'relocated', id FROM member_statuses WHERE name = 'relocated'
ON CONFLICT (exit_type) DO UPDATE SET member_status_id = EXCLUDED.member_status_id;

INSERT INTO exit_type_status_map (exit_type, member_status_id)
SELECT 'inactive', id FROM member_statuses WHERE name = 'inactive'
ON CONFLICT (exit_type) DO UPDATE SET member_status_id = EXCLUDED.member_status_id;

INSERT INTO exit_type_status_map (exit_type, member_status_id)
SELECT 'exited', id FROM member_statuses WHERE name = 'exited'
ON CONFLICT (exit_type) DO UPDATE SET member_status_id = EXCLUDED.member_status_id; 

-- 2) Populate/ensure mappings in exit_type_status_map
INSERT INTO exit_type_status_map (exit_type, member_status_id)
SELECT 'moved', id FROM member_statuses WHERE name = 'moved'
ON CONFLICT (exit_type) DO UPDATE SET member_status_id = EXCLUDED.member_status_id;

INSERT INTO exit_type_status_map (exit_type, member_status_id)
SELECT 'transferred', id FROM member_statuses WHERE name = 'transferred'
ON CONFLICT (exit_type) DO UPDATE SET member_status_id = EXCLUDED.member_status_id;

INSERT INTO exit_type_status_map (exit_type, member_status_id)
SELECT 'resigned', id FROM member_statuses WHERE name = 'resigned'
ON CONFLICT (exit_type) DO UPDATE SET member_status_id = EXCLUDED.member_status_id;

INSERT INTO exit_type_status_map (exit_type, member_status_id)
SELECT 'deceased', id FROM member_statuses WHERE name = 'deceased'
ON CONFLICT (exit_type) DO UPDATE SET member_status_id = EXCLUDED.member_status_id;

INSERT INTO exit_type_status_map (exit_type, member_status_id)
SELECT 'relocated', id FROM member_statuses WHERE name = 'relocated'
ON CONFLICT (exit_type) DO UPDATE SET member_status_id = EXCLUDED.member_status_id;

INSERT INTO exit_type_status_map (exit_type, member_status_id)
SELECT 'inactive', id FROM member_statuses WHERE name = 'inactive'
ON CONFLICT (exit_type) DO UPDATE SET member_status_id = EXCLUDED.member_status_id;

INSERT INTO exit_type_status_map (exit_type, member_status_id)
SELECT 'exited', id FROM member_statuses WHERE name = 'exited'
ON CONFLICT (exit_type) DO UPDATE SET member_status_id = EXCLUDED.member_status_id;
