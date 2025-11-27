-- Zones
CREATE TABLE IF NOT EXISTS zones (
    id SERIAL PRIMARY KEY,
    church_id INT NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL,
    description TEXT,
    active BOOLEAN DEFAULT TRUE
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
CREATE TABLE IF NOT EXISTS cell_group_members (
    id SERIAL PRIMARY KEY,
    cell_group_id INT NOT NULL REFERENCES cell_groups(id) ON DELETE CASCADE,
    member_id INT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    role VARCHAR(32) DEFAULT 'member',
    joined_at TIMESTAMP DEFAULT NOW(),
    left_at TIMESTAMP,
    status_id INT REFERENCES status_types(id),
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
CREATE TABLE IF NOT EXISTS cell_leader_reports (
    id SERIAL PRIMARY KEY,
    church_id INT NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
    cell_group_id INT NOT NULL REFERENCES cell_groups(id),
    leader_id INT NOT NULL REFERENCES users(id),
    date_of_meeting DATE NOT NULL,
    topic_taught TEXT,
    attendance INT,
    visitors INT,
    testimonies TEXT,
    absentees INT[],
    prayer_requests TEXT,
    follow_ups TEXT,
    challenges TEXT,
    support_needed TEXT
);

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
('view_cell_group_members');

export const getCellGroupMembers = async (cell_group_id, church_id) => {
    const res = await db.query(
        `SELECT m.id, m.first_name, m.surname, m.email, m.member_status_id
         FROM cell_group_members cgm
         INNER JOIN members m ON cgm.member_id = m.id
         INNER JOIN cell_groups cg ON cgm.cell_group_id = cg.id
         WHERE cgm.cell_group_id = $1 AND cg.church_id = $2
         ORDER BY m.first_name, m.surname`,
        [cell_group_id, church_id]
    );
    return res.rows;
};