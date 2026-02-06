-- Leadership Development Module (multi-church, member-linked, milestone-integrated)

CREATE TABLE IF NOT EXISTS leadership_roles (
  id SERIAL PRIMARY KEY,
  church_id INTEGER NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  member_id INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  role VARCHAR(100) NOT NULL,          -- e.g. 'cell_leader', 'zone_leader'
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  active BOOLEAN DEFAULT TRUE,
  notes TEXT,
  UNIQUE (church_id, member_id, role, active)
);

CREATE TABLE IF NOT EXISTS leadership_promotions (
  id SERIAL PRIMARY KEY,
  church_id INTEGER NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  member_id INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  from_role VARCHAR(100),
  to_role VARCHAR(100),
  promotion_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
  notes TEXT,
  created_by INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS leadership_evaluations (
  id SERIAL PRIMARY KEY,
  church_id INTEGER NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  leader_id INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  evaluator_id INTEGER REFERENCES users(id),
  type VARCHAR(32),                    -- 'self', 'peer', 'supervisor'
  evaluation_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
  spiritual_maturity INT,
  relational_health INT,
  discipleship INT,
  growth_potential INT,
  leadership_qualities JSONB,          -- {"vision":4,"serving":5,...}
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS leadership_alerts (
  id SERIAL PRIMARY KEY,
  church_id INTEGER NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  leader_id INTEGER REFERENCES members(id) ON DELETE CASCADE,
  type VARCHAR(64),                    -- 'inactivity', 'burnout', 'readiness', etc.
  message TEXT,
  resolved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  resolved_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(church_id, leader_id, type)
);

CREATE TABLE IF NOT EXISTS leadership_milestone_templates (
  id SERIAL PRIMARY KEY,
  church_id INTEGER NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  required_for_promotion BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(church_id, name)
);

CREATE TABLE IF NOT EXISTS leadership_milestone_records (
  id SERIAL PRIMARY KEY,
  church_id INTEGER NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  member_id INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  template_id INTEGER REFERENCES leadership_milestone_templates(id) ON DELETE SET NULL,
  milestone_name VARCHAR(200) NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by INTEGER,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS leadership_exit_records (
  id SERIAL PRIMARY KEY,
  church_id INTEGER NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  member_id INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  exit_type VARCHAR(100),              -- 'resigned', 'relocation', 'burnout', 'promotion'
  exit_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
  reason TEXT,
  interview_notes TEXT,
  created_by INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Leadership mentorships: direct link to mentorship_assignments
-- Use mentorship_assignments table from spiritual growth module:
-- mentor_id (leader) and mentee_id (member) provide the relationship

-- Indexes
CREATE INDEX IF NOT EXISTS idx_leadership_roles_church_id ON leadership_roles(church_id);
CREATE INDEX IF NOT EXISTS idx_leadership_evaluations_leader_id ON leadership_evaluations(leader_id);
CREATE INDEX IF NOT EXISTS idx_leadership_alerts_leader_id ON leadership_alerts(leader_id);
CREATE INDEX IF NOT EXISTS idx_leadership_milestone_records_member_id ON leadership_milestone_records(member_id);