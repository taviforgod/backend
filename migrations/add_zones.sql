-- Migration: Add Zones Support to the System
-- This migration introduces zones and zone pastoral oversight

-- Create zones table
CREATE TABLE IF NOT EXISTS zones (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  region VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add zone_id to churches table
ALTER TABLE churches
ADD COLUMN IF NOT EXISTS zone_id INTEGER REFERENCES zones(id) ON DELETE SET NULL;

-- Create zone_leaders junction table (many pastors can oversee a zone, many zones can have multiple leaders)
CREATE TABLE IF NOT EXISTS zone_leaders (
  id SERIAL PRIMARY KEY,
  zone_id INTEGER NOT NULL REFERENCES zones(id) ON DELETE CASCADE,
  member_id INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(zone_id, member_id)
);

-- Create zone_statistics table for cached metrics
CREATE TABLE IF NOT EXISTS zone_statistics (
  id SERIAL PRIMARY KEY,
  zone_id INTEGER NOT NULL REFERENCES zones(id) ON DELETE CASCADE,
  total_churches INTEGER DEFAULT 0,
  total_members INTEGER DEFAULT 0,
  active_members INTEGER DEFAULT 0,
  total_leaders INTEGER DEFAULT 0,
  total_cell_groups INTEGER DEFAULT 0,
  total_crisis_cases INTEGER DEFAULT 0,
  total_giving DECIMAL(15, 2) DEFAULT 0,
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(zone_id)
);

-- Add zonal_pastor role if not exists
INSERT INTO roles (name) VALUES ('Zonal Pastor') ON CONFLICT DO NOTHING;

-- Add zonal_pastor permissions
INSERT INTO permissions (name) VALUES 
  ('view_zone_dashboard'),
  ('manage_zone'),
  ('view_zone_churches'),
  ('view_zone_members'),
  ('view_zone_reports')
ON CONFLICT DO NOTHING;

-- Grant permissions to zonal_pastor role
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'Zonal Pastor' 
  AND p.name IN ('view_zone_dashboard', 'manage_zone', 'view_zone_churches', 'view_zone_members', 'view_zone_reports')
ON CONFLICT DO NOTHING;

-- Create index for faster zone queries
CREATE INDEX IF NOT EXISTS idx_churches_zone_id ON churches(zone_id);
CREATE INDEX IF NOT EXISTS idx_zone_leaders_zone_id ON zone_leaders(zone_id);
CREATE INDEX IF NOT EXISTS idx_zone_leaders_user_id ON zone_leaders(user_id);
