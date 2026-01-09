-- base_schema.sql generated 2025-10-02T10:12:19.795494Z

BEGIN;

CREATE TABLE IF NOT EXISTS churches (
  id SERIAL PRIMARY KEY,
  name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE,
  password_hash TEXT,
  first_name TEXT,
  surname TEXT,
  church_id INT REFERENCES churches(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS permissions (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE
);

CREATE TABLE IF NOT EXISTS roles (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE
);

CREATE TABLE IF NOT EXISTS role_permissions (
  role_id INT REFERENCES roles(id) ON DELETE CASCADE,
  permission_id INT REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE IF NOT EXISTS user_roles (
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  role_id INT REFERENCES roles(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, role_id)
);

CREATE TABLE IF NOT EXISTS members (
  id SERIAL PRIMARY KEY,
  church_id INT REFERENCES churches(id),
  first_name TEXT,
  surname TEXT,
  contact_primary TEXT,
  email TEXT,
  cell_group_id INT,
  invited_by INT,
  status TEXT,
  date_joined TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ======================
-- Cell Groups
-- ======================
CREATE TABLE IF NOT EXISTS cell_groups (
  id SERIAL PRIMARY KEY,
  church_id INT REFERENCES churches(id),
  name TEXT,
  zone_id INT,
  leader_id INT,
  next_meeting_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status_id INT REFERENCES status_types(id)
);

-- ======================
-- Visitors
-- ======================
CREATE TABLE IF NOT EXISTS visitors (
  id SERIAL PRIMARY KEY,
  church_id INT NOT NULL REFERENCES churches(id),
  cell_group_id INT NULL REFERENCES cell_groups(id),
  first_name TEXT,
  surname TEXT,
  contact_primary TEXT,
  contact_secondary TEXT,
  email TEXT,
  home_address TEXT,
  date_of_first_visit DATE,
  how_heard TEXT,
  age_group TEXT,
  church_affiliation TEXT,
  prayer_requests TEXT,
  invited_by INT NULL REFERENCES members(id),
  follow_up_method TEXT,
  assigned_member_id INT NULL REFERENCES members(id),
  next_follow_up_date TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  status TEXT DEFAULT 'new',
  follow_up_status TEXT DEFAULT 'pending',
  deleted_at TIMESTAMP NULL,
  converted BOOLEAN DEFAULT false,
  converted_date TIMESTAMP NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by INT NULL REFERENCES users(id)
);

-- ======================
-- Visitor Follow Ups
-- ======================
CREATE TABLE IF NOT EXISTS visitor_follow_ups (
  id SERIAL PRIMARY KEY,
  visitor_id INT NOT NULL REFERENCES visitors(id) ON DELETE CASCADE,
  assigned_member_id INT NULL REFERENCES members(id),
  followup_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  method VARCHAR(50),
  notes TEXT,
  outcome VARCHAR(50),
  created_by INT NULL REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);


-- ======================
-- Notifications
-- ======================
CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  church_id INT NULL REFERENCES churches(id),
  user_id INT NULL REFERENCES users(id),
  title TEXT,
  message TEXT,
  channel TEXT DEFAULT 'in_app',
  metadata JSONB,
  read_at TIMESTAMP WITH TIME ZONE NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ======================
-- Cell Group Members (join table)
-- ======================
CREATE TABLE IF NOT EXISTS cell_group_members (
    id SERIAL PRIMARY KEY,
    cell_group_id INT NOT NULL REFERENCES cell_groups(id) ON DELETE CASCADE,
    member_id INT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    role VARCHAR(32) DEFAULT 'member',
    joined_at TIMESTAMP DEFAULT NOW(),
    left_at TIMESTAMP,
    status_id INT REFERENCES status_types(id),
    consecutive_absences INT DEFAULT 0,
    total_absences INT DEFAULT 0,
    UNIQUE (cell_group_id, member_id)
);

-- Weekly report (leader submission)
CREATE TABLE cell_weekly_reports (
  id SERIAL PRIMARY KEY,
  church_id INT REFERENCES churches(id),
  cell_group_id INT REFERENCES cell_groups(id),
  date_of_meeting DATE NOT NULL,
  topic TEXT,
  attendance INT DEFAULT 0,
  visitors INT DEFAULT 0,
  conversions INT DEFAULT 0,
  offering DECIMAL(10,2),
  notes TEXT,
  created_by INT REFERENCES members(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Attendance per member for each report
CREATE TABLE cell_attendance (
  id SERIAL PRIMARY KEY,
  church_id INT REFERENCES churches(id),
  cell_group_id INT REFERENCES cell_groups(id),
  member_id INT REFERENCES members(id),
  meeting_date DATE NOT NULL,
  status VARCHAR(10) CHECK (status IN ('present','absent')),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (cell_group_id, member_id, meeting_date)
);


-- ======================
-- Views for Dashboard
-- ======================
-- Attendance per week
CREATE OR REPLACE VIEW cell_health_attendance_vw AS
SELECT cell_group_id, church_id,
       to_char(date_of_meeting, 'IYYY-IW') AS week,
       SUM(attendance) AS attendance
FROM cell_leader_reports
GROUP BY cell_group_id, church_id, week;

-- Conversions per month
CREATE OR REPLACE VIEW cell_health_conversions_vw AS
SELECT cell_group_id, church_id,
       to_char(converted_date, 'Mon') AS month,
       COUNT(*) AS conversions
FROM visitors
WHERE converted = true AND deleted_at IS NULL
GROUP BY cell_group_id, church_id, month;

-- Growth per month (via cell_group_members)
CREATE OR REPLACE VIEW cell_health_growth_vw AS
SELECT cgm.cell_group_id, m.church_id,
       to_char(cgm.joined_at, 'Mon') AS month,
       COUNT(*) AS new_members
FROM cell_group_members cgm
JOIN members m ON m.id = cgm.member_id
WHERE cgm.left_at IS NULL
GROUP BY cgm.cell_group_id, m.church_id, month;

-- ======================
-- Useful Indexes
-- ======================
CREATE INDEX IF NOT EXISTS idx_visitors_church ON visitors(church_id);
CREATE INDEX IF NOT EXISTS idx_visitors_deleted_at ON visitors(deleted_at);
CREATE INDEX IF NOT EXISTS idx_visitors_next_followup ON visitors(next_follow_up_date);
CREATE INDEX IF NOT EXISTS idx_followups_visitor ON visitor_follow_ups(visitor_id);
CREATE INDEX IF NOT EXISTS idx_cell_attendance_meeting ON cell_attendance(cell_group_id, meeting_date);
