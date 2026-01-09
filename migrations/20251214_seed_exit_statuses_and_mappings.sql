-- Migration: seed common member_statuses and map them to exit types
-- Adds statuses if missing, and populates exit_type_status_map

-- Common exit types to seed: moved, transferred, resigned, deceased, relocated, inactive, exited

-- 1) Insert member_statuses if they do not exist
INSERT INTO member_statuses (name, description)
SELECT 'active', 'Active member' WHERE NOT EXISTS (SELECT 1 FROM member_statuses WHERE name = 'active');
INSERT INTO member_statuses (name, description)
SELECT 'moved', 'Member moved/resettled' WHERE NOT EXISTS (SELECT 1 FROM member_statuses WHERE name = 'moved');
INSERT INTO member_statuses (name, description)
SELECT 'transferred', 'Member transferred to another church/branch' WHERE NOT EXISTS (SELECT 1 FROM member_statuses WHERE name = 'transferred');
INSERT INTO member_statuses (name, description)
SELECT 'resigned', 'Resigned from ministry/membership' WHERE NOT EXISTS (SELECT 1 FROM member_statuses WHERE name = 'resigned');
INSERT INTO member_statuses (name, description)
SELECT 'deceased', 'Deceased' WHERE NOT EXISTS (SELECT 1 FROM member_statuses WHERE name = 'deceased');
INSERT INTO member_statuses (name, description)
SELECT 'relocated', 'Relocated (moved geographically)' WHERE NOT EXISTS (SELECT 1 FROM member_statuses WHERE name = 'relocated');
INSERT INTO member_statuses (name, description)
SELECT 'inactive', 'Marked inactive' WHERE NOT EXISTS (SELECT 1 FROM member_statuses WHERE name = 'inactive');
INSERT INTO member_statuses (name, description)
SELECT 'exited', 'Exited membership' WHERE NOT EXISTS (SELECT 1 FROM member_statuses WHERE name = 'exited');

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
