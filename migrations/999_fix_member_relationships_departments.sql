-- Safe fix: ensure departments, member_departments and member_relationships exist
-- This migration is idempotent and uses IF NOT EXISTS and ON CONFLICT to avoid failures on reruns

CREATE TABLE IF NOT EXISTS departments (
  id SERIAL PRIMARY KEY,
  church_id INTEGER NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  head_member_id INTEGER REFERENCES members(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_by INTEGER REFERENCES members(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Make department names unique per church (case-insensitive)
CREATE UNIQUE INDEX IF NOT EXISTS ux_departments_church_id_lower_name ON departments (church_id, LOWER(name));

CREATE TABLE IF NOT EXISTS member_departments (
  id SERIAL PRIMARY KEY,
  church_id INTEGER NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  member_id INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  department_id INTEGER NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  role VARCHAR(100),
  assigned_at DATE DEFAULT CURRENT_DATE,
  created_by INTEGER REFERENCES members(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (member_id, department_id)
);

CREATE TABLE IF NOT EXISTS member_relationships (
  id SERIAL PRIMARY KEY,
  church_id INTEGER NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  member_id INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  related_member_id INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  relationship_type VARCHAR(100),
  is_primary BOOLEAN DEFAULT FALSE,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_by INTEGER REFERENCES members(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (member_id, related_member_id, relationship_type)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_departments_church_id ON departments(church_id);
CREATE INDEX IF NOT EXISTS idx_member_departments_member_id ON member_departments(member_id);
CREATE INDEX IF NOT EXISTS idx_member_departments_department_id ON member_departments(department_id);
CREATE INDEX IF NOT EXISTS idx_member_relationships_member_id ON member_relationships(member_id);
CREATE INDEX IF NOT EXISTS idx_member_relationships_related_member_id ON member_relationships(related_member_id);

-- Safe seed for relationship types
INSERT INTO lookups (category, name, value, display_order) VALUES
('relationship_type', 'Spouse', 'spouse', 1),
('relationship_type', 'Parent', 'parent', 2),
('relationship_type', 'Child', 'child', 3),
('relationship_type', 'Sibling', 'sibling', 4),
('relationship_type', 'Guardian', 'guardian', 5)
ON CONFLICT (category, name) DO NOTHING;
