-- spiritual_growth_schema.sql (multi-church scoped)
CREATE TABLE IF NOT EXISTS milestone_templates (
  id SERIAL PRIMARY KEY,
  church_id INTEGER NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  required_for_promotion BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE (church_id, name)
);

CREATE TABLE IF NOT EXISTS milestone_records (
  id SERIAL PRIMARY KEY,
  church_id INTEGER NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  member_id INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  template_id INTEGER REFERENCES milestone_templates(id) ON DELETE SET NULL,
  milestone_name VARCHAR(200) NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by INTEGER,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS foundation_school_enrollments (
  id SERIAL PRIMARY KEY,
  church_id INTEGER NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  member_id INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  level INTEGER DEFAULT 1,
  status VARCHAR(50) DEFAULT 'enrolled',
  enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS mentorship_assignments (
  id SERIAL PRIMARY KEY,
  church_id INTEGER NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  mentor_id INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  mentee_id INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  active BOOLEAN DEFAULT TRUE,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS mentorship_sessions (
  id SERIAL PRIMARY KEY,
  assignment_id INTEGER REFERENCES mentorship_assignments(id) ON DELETE CASCADE,
  session_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  duration_minutes INTEGER,
  notes TEXT,
  created_by INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);


-- Add class_id column to foundation_school_enrollments if not exists
ALTER TABLE foundation_school_enrollments
  ADD COLUMN IF NOT EXISTS class_id INTEGER;

-- Foundation Classes table for associating classes with enrollments and church
CREATE TABLE IF NOT EXISTS foundation_classes (
  id SERIAL PRIMARY KEY,
  church_id INTEGER NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  start_date DATE,
  end_date DATE,
  UNIQUE(church_id, name)
);