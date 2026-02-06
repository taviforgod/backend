-- Zones
CREATE TABLE IF NOT EXISTS zones (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    region VARCHAR(100),
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO zones (church_id, name, description, active)
VALUES
  (1, 'North Zone', 'Covers the northern region', TRUE),
  (1, 'South Zone', 'Covers the southern region', TRUE),
  (1, 'East Zone', 'Covers the eastern region', TRUE),
  (1, 'West Zone', 'Covers the western region', TRUE);

-- Status Types
CREATE TABLE IF NOT EXISTS status_types (
    id SERIAL PRIMARY KEY,
    church_id INT NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL,
    description TEXT,
    active BOOLEAN DEFAULT TRUE,
    sort_order INT DEFAULT 0
);

INSERT INTO status_types (church_id, name, description, active, sort_order)
VALUES
  (1, 'Active', 'Currently active cell group', TRUE, 1),
  (1, 'Inactive', 'Not currently meeting', TRUE, 2),
  (1, 'Merged', 'Merged with another group', TRUE, 3),
  (1, 'Closed', 'No longer exists', TRUE, 4);

-- Cell Groups
CREATE TABLE IF NOT EXISTS cell_groups (
    id SERIAL PRIMARY KEY,
    church_id INT NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    zone_id INT REFERENCES zones(id),
    leader_id INT REFERENCES members(id),
    location VARCHAR(255),
    status_id INT REFERENCES status_types(id),
    health_score INT DEFAULT 100,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Cell Group Members
CREATE TABLE IF NOT EXISTS cell_members (
    id SERIAL PRIMARY KEY,
    cell_group_id INT NOT NULL REFERENCES cell_groups(id) ON DELETE CASCADE,
    member_id INT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    role_id INT REFERENCES roles(id),
    role VARCHAR(32) DEFAULT 'member',
    joined_at TIMESTAMP DEFAULT NOW(),
    left_at TIMESTAMP,
    date_joined TIMESTAMPTZ,
    date_left TIMESTAMPTZ,
    status_id INT REFERENCES status_types(id),
    is_active BOOLEAN DEFAULT TRUE,
    assigned_at TIMESTAMPTZ DEFAULT now(),
    removed_at TIMESTAMPTZ,
    consecutive_absences INT DEFAULT 0,
    total_absences INT DEFAULT 0,
    added_by INT REFERENCES members(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (cell_group_id, member_id)
);

-- Health metric log
CREATE TABLE IF NOT EXISTS cell_group_health_history (
    id SERIAL PRIMARY KEY,
    cell_group_id INT NOT NULL REFERENCES cell_groups(id) ON DELETE CASCADE,
    report_date DATE NOT NULL,
    health_score INT NOT NULL,
    attendance INT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Weekly Cell Leader Report
CREATE TABLE IF NOT EXISTS weekly_reports (
    id SERIAL PRIMARY KEY,
    church_id INTEGER NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
    cell_group_id INTEGER NOT NULL REFERENCES cell_groups(id) ON DELETE CASCADE,
    meeting_date DATE NOT NULL,
    next_meeting_date DATE,
    topic VARCHAR(255),

    current_cell_membership INTEGER DEFAULT 0,
    bible_study_teachers INTEGER DEFAULT 0,
    outreaches_done INTEGER DEFAULT 0,
    people_reached INTEGER DEFAULT 0,
    souls_saved_outreach INTEGER DEFAULT 0,
    total_cell_attendance INTEGER DEFAULT 0,
    first_timers INTEGER DEFAULT 0,
    souls_saved_meeting INTEGER DEFAULT 0,
    converts_church_attendance INTEGER DEFAULT 0,
    converts_baptised INTEGER DEFAULT 0,
    converts_started_foundation INTEGER DEFAULT 0,
    visits_done INTEGER DEFAULT 0,
    souls_uploaded_tracker INTEGER DEFAULT 0,
    total_church_attendance INTEGER DEFAULT 0,
    new_bible_classes_started INTEGER DEFAULT 0,

    testimonies TEXT,
    prayer_requests TEXT,
    follow_ups TEXT,
    challenges TEXT,
    support_needed TEXT,

    submitted_by INTEGER REFERENCES members(id) ON DELETE SET NULL,

    attendees JSONB DEFAULT '[]'::jsonb,
    visitors JSONB DEFAULT '[]'::jsonb,
    absentees JSONB DEFAULT '[]'::jsonb,
    visitors_count INTEGER DEFAULT 0,
    absentees_count INTEGER DEFAULT 0,

    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    deleted_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP,
    is_deleted BOOLEAN DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_weekly_reports_cell_group_id ON weekly_reports(cell_group_id);
CREATE INDEX IF NOT EXISTS idx_weekly_reports_meeting_date ON weekly_reports(meeting_date);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    church_id INT NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
    user_id INT NOT NULL REFERENCES users(id),
    type VARCHAR(32),
    title VARCHAR(255),
    message TEXT,
    link VARCHAR(255),
    priority VARCHAR(16) DEFAULT 'normal',
    created_at TIMESTAMP DEFAULT NOW(),
    read_at TIMESTAMP
);

-- RBAC permissions for cell module
INSERT INTO permissions (name) VALUES
('view_cell_groups'),
('create_cell_group'),
('update_cell_group'),
('delete_cell_group'),
('assign_cell_group_member'),
('remove_cell_group_member' ),
('view_cell_members');

export const getCellGroupMembers = async (cell_group_id, church_id) => {
    const res = await db.query(
        `SELECT m.id, m.first_name, m.surname, m.email, m.member_status_id
         FROM cell_members cgm
         INNER JOIN members m ON cgm.member_id = m.id
         INNER JOIN cell_groups cg ON cgm.cell_group_id = cg.id
         WHERE cgm.cell_group_id = $1 AND cg.church_id = $2
         ORDER BY m.first_name, m.surname`,
        [cell_group_id, church_id]
    );
    return res.rows;
};