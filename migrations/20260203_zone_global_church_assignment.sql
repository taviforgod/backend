-- 20260203_zone_global_church_assignment.sql
BEGIN;

-- Remove church-scoped triggers/functions if present
DROP TRIGGER IF EXISTS trg_cell_groups_zone_church ON cell_groups;
DROP FUNCTION IF EXISTS enforce_cell_group_zone_church;
DROP TRIGGER IF EXISTS trg_zone_leaders_church ON zone_leaders;
DROP FUNCTION IF EXISTS enforce_zone_leader_church;

-- Zones become global
ALTER TABLE zones DROP CONSTRAINT IF EXISTS zones_church_id_fkey;
ALTER TABLE zones ALTER COLUMN church_id DROP NOT NULL;

-- Replace church-scoped unique index with global unique (case-insensitive)
DROP INDEX IF EXISTS ux_zones_church_lower_name;
CREATE UNIQUE INDEX IF NOT EXISTS ux_zones_lower_name ON zones (LOWER(name));

-- Ensure supporting columns exist
ALTER TABLE zones
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS region VARCHAR(100),
  ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Normalize existing zones to Zone 1..N (by id order), clear church_id
WITH ordered AS (
  SELECT id, row_number() OVER (ORDER BY id) AS rn FROM zones
)
UPDATE zones z
SET name = 'Zone ' || ordered.rn,
    description = 'Zone ' || ordered.rn,
    region = NULL,
    active = TRUE,
    church_id = NULL,
    updated_at = NOW()
FROM ordered
WHERE z.id = ordered.id;

-- Ensure at least one zone per church (create Zone N if needed)
DO $$
DECLARE church_count int;
DECLARE zone_count int;
DECLARE i int;
BEGIN
  SELECT COUNT(*) INTO church_count FROM churches;
  SELECT COUNT(*) INTO zone_count FROM zones;
  IF zone_count < church_count THEN
    i := zone_count + 1;
    WHILE i <= church_count LOOP
      INSERT INTO zones (name, description, active, created_at, updated_at)
      VALUES ('Zone ' || i, 'Zone ' || i, TRUE, NOW(), NOW())
      ON CONFLICT DO NOTHING;
      i := i + 1;
    END LOOP;
  END IF;
END $$;

-- Restore church -> zone FK
ALTER TABLE churches DROP CONSTRAINT IF EXISTS fk_churches_zone_id;
ALTER TABLE churches ADD CONSTRAINT fk_churches_zone_id
  FOREIGN KEY (zone_id) REFERENCES zones(id) ON DELETE SET NULL;

-- Assign each church to a zone (by id order)
WITH z AS (
  SELECT id, row_number() OVER (ORDER BY id) AS rn FROM zones
), c AS (
  SELECT id, row_number() OVER (ORDER BY id) AS rn FROM churches
)
UPDATE churches c2
SET zone_id = z.id
FROM z
JOIN c ON c.rn = z.rn
WHERE c2.id = c.id;

-- Sync cell_groups zone_id with their church's zone
UPDATE cell_groups cg
SET zone_id = c.zone_id
FROM churches c
WHERE cg.church_id = c.id;

-- Keep cell_groups.zone_id in sync with church.zone_id
CREATE OR REPLACE FUNCTION sync_cell_group_zone()
RETURNS trigger AS $$
DECLARE z int;
BEGIN
  IF NEW.church_id IS NULL THEN
    NEW.zone_id := NULL;
    RETURN NEW;
  END IF;
  SELECT zone_id INTO z FROM churches WHERE id = NEW.church_id;
  NEW.zone_id := z;
  RETURN NEW;
END $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_cell_group_zone ON cell_groups;
CREATE TRIGGER trg_sync_cell_group_zone
BEFORE INSERT OR UPDATE OF church_id ON cell_groups
FOR EACH ROW EXECUTE FUNCTION sync_cell_group_zone();

COMMIT;
