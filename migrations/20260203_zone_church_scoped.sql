-- 20260203_zone_church_scoped.sql
BEGIN;

-- Ensure zones are church-scoped
ALTER TABLE zones
  ADD COLUMN IF NOT EXISTS church_id INTEGER REFERENCES churches(id) ON DELETE CASCADE;

-- If only one church exists, backfill null church_id values
DO $$
DECLARE church_count int;
DECLARE only_church_id int;
BEGIN
  SELECT COUNT(*) INTO church_count FROM churches;
  IF church_count = 1 THEN
    SELECT id INTO only_church_id FROM churches LIMIT 1;
    UPDATE zones SET church_id = COALESCE(church_id, only_church_id);
  END IF;
END $$;

-- Drop global unique constraint on name if it exists
ALTER TABLE zones DROP CONSTRAINT IF EXISTS zones_name_key;

-- Unique zone names per church (case-insensitive)
CREATE UNIQUE INDEX IF NOT EXISTS ux_zones_church_lower_name
  ON zones (church_id, LOWER(name));

-- Enforce NOT NULL if possible
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM zones WHERE church_id IS NULL) THEN
    ALTER TABLE zones ALTER COLUMN church_id SET NOT NULL;
  END IF;
END $$;

-- Churches are not assigned to zones in church-scoped model
ALTER TABLE churches DROP CONSTRAINT IF EXISTS fk_churches_zone_id;

-- Enforce zone belongs to same church for cell_groups
CREATE OR REPLACE FUNCTION enforce_cell_group_zone_church()
RETURNS trigger AS $$
BEGIN
  IF NEW.zone_id IS NOT NULL THEN
    PERFORM 1 FROM zones z WHERE z.id = NEW.zone_id AND z.church_id = NEW.church_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Zone % does not belong to church %', NEW.zone_id, NEW.church_id;
    END IF;
  END IF;
  RETURN NEW;
END $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_cell_groups_zone_church ON cell_groups;
CREATE TRIGGER trg_cell_groups_zone_church
BEFORE INSERT OR UPDATE OF zone_id, church_id ON cell_groups
FOR EACH ROW EXECUTE FUNCTION enforce_cell_group_zone_church();

-- Enforce zone leaders belong to same church as zone (via member)
CREATE OR REPLACE FUNCTION enforce_zone_leader_church()
RETURNS trigger AS $$
BEGIN
  IF NEW.member_id IS NOT NULL THEN
    PERFORM 1
      FROM zones z
      JOIN members m ON m.id = NEW.member_id
     WHERE z.id = NEW.zone_id AND z.church_id = m.church_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Zone % and member % are not in the same church', NEW.zone_id, NEW.member_id;
    END IF;
  END IF;
  RETURN NEW;
END $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_zone_leaders_church ON zone_leaders;
CREATE TRIGGER trg_zone_leaders_church
BEFORE INSERT OR UPDATE OF zone_id, member_id ON zone_leaders
FOR EACH ROW EXECUTE FUNCTION enforce_zone_leader_church();

COMMIT;
