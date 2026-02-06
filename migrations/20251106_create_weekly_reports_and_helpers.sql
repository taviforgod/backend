-- ============================================
-- Weekly Reports Main Table
-- ============================================
CREATE TABLE IF NOT EXISTS weekly_reports (
    id SERIAL PRIMARY KEY,

    -- relationships
    church_id INTEGER NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
    cell_group_id INTEGER NOT NULL REFERENCES cell_groups(id) ON DELETE CASCADE,

    -- report data
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

    -- audit fields
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

-- ============================================
-- Weekly Report Details Table
-- ============================================
-- This table tracks related visitors or custom follow-ups.
CREATE TABLE IF NOT EXISTS weekly_report_details (
    id SERIAL PRIMARY KEY,
    weekly_report_id INTEGER NOT NULL REFERENCES weekly_reports(id) ON DELETE CASCADE,

    -- Instead of absentees, we can optionally reference members (for follow-up)
    member_id INTEGER REFERENCES members(id) ON DELETE SET NULL,
    visitor_id INTEGER REFERENCES visitors(id) ON DELETE SET NULL,

    followup_action TEXT,

    -- audit
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    deleted_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP,
    is_deleted BOOLEAN DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_weekly_report_details_report ON weekly_report_details(weekly_report_id);
CREATE INDEX IF NOT EXISTS idx_weekly_report_details_visitor ON weekly_report_details(visitor_id);

-- ============================================
-- Weekly Report Attendees Table
-- ============================================
-- Stores members who attended a given cell meeting.
CREATE TABLE IF NOT EXISTS weekly_report_attendees (
    id SERIAL PRIMARY KEY,
    weekly_report_id INTEGER NOT NULL REFERENCES weekly_reports(id) ON DELETE CASCADE,
    member_id INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_weekly_report_attendees_report ON weekly_report_attendees(weekly_report_id);
CREATE INDEX IF NOT EXISTS idx_weekly_report_attendees_member ON weekly_report_attendees(member_id);
