-- ============================================
-- Cell Ministry Enhancements
-- Bible Teaching Calendar, Foundation School, Baptism Register, etc.
-- ============================================

-- ============================================
-- 1. BIBLE TEACHING CALENDAR
-- ============================================

CREATE TABLE IF NOT EXISTS bible_teaching_calendar (
    id SERIAL PRIMARY KEY,
    church_id INTEGER NOT NULL REFERENCES churches(id) ON DELETE CASCADE,

    -- Basic info
    title VARCHAR(200) NOT NULL,
    scripture_reference VARCHAR(100),
    description TEXT,
    teaching_category VARCHAR(100), -- salvation, discipleship, leadership, etc.

    -- Scheduling
    planned_date DATE NOT NULL,
    cell_group_id INTEGER REFERENCES cell_groups(id) ON DELETE CASCADE,

    -- Assignment
    assigned_teacher INTEGER REFERENCES members(id) ON DELETE SET NULL,
    assistant_teacher INTEGER REFERENCES members(id) ON DELETE SET NULL,

    -- Preparation
    preparation_notes TEXT,
    materials_needed TEXT,
    key_points TEXT,

    -- Status
    status VARCHAR(50) DEFAULT 'planned', -- planned, prepared, taught, cancelled
    actual_date DATE,
    attendance_count INTEGER,

    -- Outcomes
    feedback TEXT,
    follow_up_needed BOOLEAN DEFAULT FALSE,

    -- Audit
    created_by INTEGER REFERENCES members(id) ON DELETE SET NULL,
    updated_by INTEGER REFERENCES members(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 2. NEW BELIEVER INTEGRATION TRACKER
-- ============================================

CREATE TABLE IF NOT EXISTS cell_visitor_journeys (
    id SERIAL PRIMARY KEY,
    church_id INTEGER NOT NULL REFERENCES churches(id) ON DELETE CASCADE,

    -- Source visitor/member info
    visitor_id INTEGER REFERENCES visitors(id) ON DELETE SET NULL,
    member_id INTEGER REFERENCES members(id) ON DELETE SET NULL,

    -- NTYABA Information
    is_ntyaba BOOLEAN DEFAULT FALSE,
    first_visit_date DATE,
    how_heard_about_church TEXT,
    age_group VARCHAR(50),

    -- Conversion details
    conversion_date DATE,
    conversion_notes TEXT,
    baptized BOOLEAN DEFAULT FALSE,
    baptism_date DATE,

    -- Integration stages
    current_stage VARCHAR(50) DEFAULT 'cell_visitor', -- cell_visitor, church_attendee, foundation_school, membership, disciple
    foundation_school_started BOOLEAN DEFAULT FALSE,
    foundation_school_completed BOOLEAN DEFAULT FALSE,
    membership_class_completed BOOLEAN DEFAULT FALSE,

    -- Mentorship
    primary_mentor_id INTEGER REFERENCES members(id) ON DELETE SET NULL,
    secondary_mentor_id INTEGER REFERENCES members(id) ON DELETE SET NULL,
    mentorship_started_date DATE,

    -- Spiritual growth tracking
    salvation_testimony TEXT,
    spiritual_gifts_assessment JSONB DEFAULT '{}'::jsonb,
    growth_milestones JSONB DEFAULT '{}'::jsonb, -- {date: description}

    -- Church involvement
    serving_area TEXT,
    cell_group_assigned BOOLEAN DEFAULT FALSE,
    ministry_interest TEXT,

    -- Follow-up tracking
    welcome_package_sent BOOLEAN DEFAULT FALSE,
    church_orientation_completed BOOLEAN DEFAULT FALSE,
    community_group_assigned BOOLEAN DEFAULT FALSE,

    -- Status and notes
    status VARCHAR(50) DEFAULT 'active', -- active, inactive, graduated, dropped
    integration_notes TEXT,
    prayer_requests TEXT,

    -- Audit
    created_by INTEGER REFERENCES members(id) ON DELETE SET NULL,
    updated_by INTEGER REFERENCES members(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- NTYABA (New To Your Area By Accident) tracking
CREATE TABLE IF NOT EXISTS ntyaba_visits (
    id SERIAL PRIMARY KEY,
    church_id INTEGER NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
    cell_visitor_journey_id INTEGER REFERENCES cell_visitor_journeys(id) ON DELETE CASCADE,

    visit_date DATE NOT NULL,
    service_time TIME,
    welcomed_by INTEGER REFERENCES members(id) ON DELETE SET NULL,
    follow_up_method VARCHAR(50), -- call, text, email, visit
    follow_up_date DATE,
    follow_up_completed BOOLEAN DEFAULT FALSE,
    visit_notes TEXT,

    created_by INTEGER REFERENCES members(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- New believer mentorship sessions
CREATE TABLE IF NOT EXISTS cell_visitor_sessions (
    id SERIAL PRIMARY KEY,
    journey_id INTEGER NOT NULL REFERENCES cell_visitor_journeys(id) ON DELETE CASCADE,

    session_date DATE NOT NULL,
    session_type VARCHAR(50), -- welcome, discipleship, foundation_review, mentorship
    mentor_id INTEGER REFERENCES members(id) ON DELETE SET NULL,
    topics_covered TEXT,
    next_steps TEXT,
    attendance_marked BOOLEAN DEFAULT FALSE,
    session_notes TEXT,

    created_by INTEGER REFERENCES members(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Seed data for cell visitor integration stages
INSERT INTO lookups (category, name, value, display_order) VALUES
('cell_visitor_stage', 'Cell Visitor', 'cell_visitor', 1),
('cell_visitor_stage', 'Church Attendee', 'church_attendee', 2),
('cell_visitor_stage', 'Foundation School', 'foundation_school', 3),
('cell_visitor_stage', 'Membership Class', 'membership_class', 4),
('cell_visitor_stage', 'Disciple', 'disciple', 5),
('cell_visitor_stage', 'Leader', 'leader', 6)
ON CONFLICT (category, name) DO NOTHING;

INSERT INTO lookups (category, name, value, display_order) VALUES
('follow_up_method', 'Phone Call', 'call', 1),
('follow_up_method', 'Text Message', 'text', 2),
('follow_up_method', 'Email', 'email', 3),
('follow_up_method', 'Home Visit', 'visit', 4),
('follow_up_method', 'Church Visit', 'church_visit', 5)
ON CONFLICT (category, name) DO NOTHING;

INSERT INTO lookups (category, name, value, display_order) VALUES
('age_group', 'Under 18', 'under_18', 1),
('age_group', '18-25', '18_25', 2),
('age_group', '26-35', '26_35', 3),
('age_group', '36-50', '36_50', 4),
('age_group', '51-65', '51_65', 5),
('age_group', 'Over 65', 'over_65', 6)
ON CONFLICT (category, name) DO NOTHING;

-- ============================================
-- 3. FOUNDATION SCHOOL PROGRESS TRACKER
-- ============================================

CREATE TABLE IF NOT EXISTS foundation_school_classes (
    id SERIAL PRIMARY KEY,
    church_id INTEGER NOT NULL REFERENCES churches(id) ON DELETE CASCADE,

    class_name VARCHAR(200) NOT NULL,
    class_level VARCHAR(50), -- level_1, level_2, level_3, etc.
    description TEXT,
    curriculum_outline TEXT,
    duration_weeks INTEGER,

    is_active BOOLEAN DEFAULT TRUE,
    created_by INTEGER REFERENCES members(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS foundation_school_enrollments (
    id SERIAL PRIMARY KEY,
    church_id INTEGER NOT NULL REFERENCES churches(id) ON DELETE CASCADE,

    member_id INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    class_id INTEGER NOT NULL REFERENCES foundation_school_classes(id) ON DELETE CASCADE,

    enrollment_date DATE DEFAULT CURRENT_DATE,
    completion_date DATE,
    status VARCHAR(50) DEFAULT 'enrolled', -- enrolled, in_progress, completed, dropped

    -- Progress tracking
    current_module INTEGER DEFAULT 1,
    attendance_percentage DECIMAL(5,2) DEFAULT 0,
    assessment_scores JSONB DEFAULT '{}'::jsonb,

    -- Mentoring
    mentor_id INTEGER REFERENCES members(id) ON DELETE SET NULL,

    notes TEXT,
    created_by INTEGER REFERENCES members(id) ON DELETE SET NULL,
    updated_by INTEGER REFERENCES members(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(member_id, class_id)
);

CREATE TABLE IF NOT EXISTS foundation_school_sessions (
    id SERIAL PRIMARY KEY,
    enrollment_id INTEGER NOT NULL REFERENCES foundation_school_enrollments(id) ON DELETE CASCADE,

    session_date DATE NOT NULL,
    module_number INTEGER NOT NULL,
    topic VARCHAR(200),

    attendance_marked BOOLEAN DEFAULT FALSE,
    session_notes TEXT,
    homework_assigned TEXT,
    homework_completed BOOLEAN DEFAULT FALSE,

    created_by INTEGER REFERENCES members(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 3. BAPTISM REGISTER
-- ============================================

-- Baptism Candidates table creation moved to later section

-- ============================================
-- 4. CONFLICT MANAGEMENT LOG
-- ============================================

CREATE TABLE IF NOT EXISTS conflict_cases (
    id SERIAL PRIMARY KEY,
    church_id INTEGER NOT NULL REFERENCES churches(id) ON DELETE CASCADE,

    -- Involved parties
    primary_party_id INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    secondary_party_id INTEGER REFERENCES members(id) ON DELETE SET NULL,
    cell_group_id INTEGER REFERENCES cell_groups(id) ON DELETE SET NULL,

    -- Conflict details
    conflict_date DATE DEFAULT CURRENT_DATE,
    conflict_category VARCHAR(100), -- personal, doctrinal, leadership, etc.
    conflict_description TEXT NOT NULL,

    severity_level VARCHAR(20) DEFAULT 'low', -- low, medium, high, critical
    urgency_level VARCHAR(20) DEFAULT 'normal', -- low, normal, urgent

    -- Resolution process
    status VARCHAR(50) DEFAULT 'reported', -- reported, investigating, mediating, resolved, escalated
    resolution_date DATE,
    resolution_summary TEXT,
    resolution_type VARCHAR(100), -- reconciliation, separation, counseling, etc.

    -- Mediation team
    primary_mediator_id INTEGER REFERENCES members(id) ON DELETE SET NULL,
    secondary_mediator_id INTEGER REFERENCES members(id) ON DELETE SET NULL,

    -- Communication log
    communication_log JSONB DEFAULT '[]'::jsonb, -- Array of communication entries

    -- Biblical references used
    biblical_references TEXT,

    -- Follow-up
    follow_up_required BOOLEAN DEFAULT FALSE,
    follow_up_date DATE,
    follow_up_notes TEXT,

    -- Audit
    reported_by INTEGER REFERENCES members(id) ON DELETE SET NULL,
    created_by INTEGER REFERENCES members(id) ON DELETE SET NULL,
    updated_by INTEGER REFERENCES members(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 5. CELEBRATIONS & EVENTS TRACKER
-- ============================================

CREATE TABLE IF NOT EXISTS member_celebrations (
    id SERIAL PRIMARY KEY,
    church_id INTEGER NOT NULL REFERENCES churches(id) ON DELETE CASCADE,

    member_id INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    cell_group_id INTEGER REFERENCES cell_groups(id) ON DELETE SET NULL,

    -- Event details
    celebration_type VARCHAR(100) NOT NULL, -- birthday, anniversary, graduation, etc.
    event_date DATE NOT NULL,
    event_description TEXT,

    -- Planning
    planned_activities TEXT,
    responsible_person INTEGER REFERENCES members(id) ON DELETE SET NULL,

    -- Status
    status VARCHAR(50) DEFAULT 'planned', -- planned, celebrated, cancelled
    actual_date DATE,

    -- Outcomes
    attendance_count INTEGER,
    feedback TEXT,
    photos_urls TEXT, -- Comma-separated URLs

    -- Follow-up
    thank_you_sent BOOLEAN DEFAULT FALSE,
    follow_up_notes TEXT,

    created_by INTEGER REFERENCES members(id) ON DELETE SET NULL,
    updated_by INTEGER REFERENCES members(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

-- Bible Teaching Calendar
CREATE INDEX IF NOT EXISTS idx_bible_teaching_calendar_church_id ON bible_teaching_calendar(church_id);
CREATE INDEX IF NOT EXISTS idx_bible_teaching_calendar_date ON bible_teaching_calendar(planned_date);
CREATE INDEX IF NOT EXISTS idx_bible_teaching_calendar_cell_group ON bible_teaching_calendar(cell_group_id);
CREATE INDEX IF NOT EXISTS idx_bible_teaching_calendar_teacher ON bible_teaching_calendar(assigned_teacher);

-- Foundation School
CREATE INDEX IF NOT EXISTS idx_foundation_classes_church_id ON foundation_school_classes(church_id);
CREATE INDEX IF NOT EXISTS idx_foundation_enrollments_member ON foundation_school_enrollments(member_id);
CREATE INDEX IF NOT EXISTS idx_foundation_enrollments_class ON foundation_school_enrollments(class_id);
CREATE INDEX IF NOT EXISTS idx_foundation_sessions_enrollment ON foundation_school_sessions(enrollment_id);

-- Baptism Register
CREATE INDEX IF NOT EXISTS idx_baptism_candidates_church_id ON baptism_candidates(church_id);
CREATE INDEX IF NOT EXISTS idx_baptism_candidates_member ON baptism_candidates(member_id);
CREATE INDEX IF NOT EXISTS idx_baptism_candidates_status ON baptism_candidates(status);
CREATE INDEX IF NOT EXISTS idx_baptism_candidates_date ON baptism_candidates(baptism_date);

-- Conflict Management
CREATE INDEX IF NOT EXISTS idx_conflict_cases_church_id ON conflict_cases(church_id);
CREATE INDEX IF NOT EXISTS idx_conflict_cases_parties ON conflict_cases(primary_party_id, secondary_party_id);
CREATE INDEX IF NOT EXISTS idx_conflict_cases_status ON conflict_cases(status);

-- Celebrations
CREATE INDEX IF NOT EXISTS idx_member_celebrations_church_id ON member_celebrations(church_id);
CREATE INDEX IF NOT EXISTS idx_member_celebrations_member ON member_celebrations(member_id);
CREATE INDEX IF NOT EXISTS idx_member_celebrations_date ON member_celebrations(event_date);

-- ============================================
-- SEED DATA
-- ============================================

-- Foundation School Classes
INSERT INTO foundation_school_classes (church_id, class_name, class_level, description, curriculum_outline, duration_weeks, is_active, created_by) VALUES
(1, 'Foundation Level 1: Salvation & New Life', 'level_1', 'Basic salvation, Holy Spirit, prayer, Bible reading', 'Salvation, Repentance, Holy Spirit Baptism, Prayer, Bible Study Methods', 8, true, NULL),
(1, 'Foundation Level 2: Discipleship & Growth', 'level_2', 'Water baptism, church membership, spiritual disciplines', 'Water Baptism, Church Covenant, Fasting, Tithing, Witnessing', 8, true, NULL),
(1, 'Foundation Level 3: Ministry & Leadership', 'level_3', 'Ministry gifts, leadership, cell group principles', 'Spiritual Gifts, Leadership Principles, Cell Group Dynamics, Missions', 8, true, NULL);

-- Sample Bible Teaching Topics
INSERT INTO bible_teaching_calendar (church_id, title, scripture_reference, description, teaching_category, planned_date, status, created_by) VALUES
(1, 'The Power of Prayer', 'Matthew 6:5-15', 'Understanding the Lord''s Prayer and effective prayer principles', 'discipleship', CURRENT_DATE + INTERVAL '7 days', 'planned', NULL),
(1, 'Spiritual Gifts in Action', '1 Corinthians 12', 'Discovering and using spiritual gifts in ministry', 'ministry', CURRENT_DATE + INTERVAL '14 days', 'planned', NULL),
(1, 'Leadership in the Kingdom', 'Mark 10:35-45', 'Biblical principles of servant leadership', 'leadership', CURRENT_DATE + INTERVAL '21 days', 'planned', NULL);

-- ============================================
-- 4. CELL MEETING PLANNING - AUTOMATED AGENDA BUILDER
-- ============================================

-- Meeting Agenda Templates
CREATE TABLE IF NOT EXISTS meeting_agenda_templates (
    id SERIAL PRIMARY KEY,
    church_id INTEGER NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    meeting_type VARCHAR(50) DEFAULT 'bible_study', -- bible_study, prayer, fellowship, outreach, leadership
    is_default BOOLEAN DEFAULT FALSE,
    estimated_duration INTEGER DEFAULT 90, -- minutes

    created_by INTEGER REFERENCES members(id) ON DELETE SET NULL,
    updated_by INTEGER REFERENCES members(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Template Sections
CREATE TABLE IF NOT EXISTS agenda_template_sections (
    id SERIAL PRIMARY KEY,
    template_id INTEGER NOT NULL REFERENCES meeting_agenda_templates(id) ON DELETE CASCADE,
    section_name VARCHAR(100) NOT NULL,
    description TEXT,
    duration_minutes INTEGER DEFAULT 10,
    section_order INTEGER NOT NULL,
    is_required BOOLEAN DEFAULT FALSE,
    section_type VARCHAR(50) DEFAULT 'standard', -- standard, bible_teaching, prayer, worship, announcements, fellowship

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Meeting Agendas (instances of templates)
CREATE TABLE IF NOT EXISTS meeting_agendas (
    id SERIAL PRIMARY KEY,
    church_id INTEGER NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
    cell_group_id INTEGER REFERENCES cell_groups(id) ON DELETE CASCADE,

    template_id INTEGER REFERENCES meeting_agenda_templates(id) ON DELETE SET NULL,
    title VARCHAR(200) NOT NULL,
    meeting_date DATE NOT NULL,
    start_time TIME,
    end_time TIME,
    actual_duration INTEGER, -- minutes

    bible_teaching_id INTEGER REFERENCES bible_teaching_calendar(id) ON DELETE SET NULL,
    facilitator_id INTEGER REFERENCES members(id) ON DELETE SET NULL,
    worship_leader_id INTEGER REFERENCES members(id) ON DELETE SET NULL,

    status VARCHAR(50) DEFAULT 'planned', -- planned, in_progress, completed, cancelled
    attendance_count INTEGER,
    notes TEXT,

    created_by INTEGER REFERENCES members(id) ON DELETE SET NULL,
    updated_by INTEGER REFERENCES members(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Meeting Agenda Sections (actual sections for a specific meeting)
CREATE TABLE IF NOT EXISTS meeting_agenda_sections (
    id SERIAL PRIMARY KEY,
    agenda_id INTEGER NOT NULL REFERENCES meeting_agendas(id) ON DELETE CASCADE,

    section_name VARCHAR(100) NOT NULL,
    description TEXT,
    planned_duration INTEGER DEFAULT 10, -- minutes
    actual_duration INTEGER, -- minutes actually used
    start_time TIME,
    end_time TIME,

    section_order INTEGER NOT NULL,
    section_type VARCHAR(50) DEFAULT 'standard',
    is_completed BOOLEAN DEFAULT FALSE,

    notes TEXT, -- notes taken during this section
    action_items TEXT, -- decisions or action items from this section

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Meeting Participants/Attendance
CREATE TABLE IF NOT EXISTS meeting_participants (
    id SERIAL PRIMARY KEY,
    agenda_id INTEGER NOT NULL REFERENCES meeting_agendas(id) ON DELETE CASCADE,
    member_id INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,

    attendance_status VARCHAR(20) DEFAULT 'present', -- present, absent, late
    check_in_time TIME,
    check_out_time TIME,

    notes TEXT,

    UNIQUE(agenda_id, member_id)
);

-- Seed data for meeting agenda templates
INSERT INTO meeting_agenda_templates (church_id, name, description, meeting_type, is_default, estimated_duration) VALUES
(1, 'Standard Bible Study', 'Complete agenda for weekly cell Bible study meetings', 'bible_study', true, 90),
(1, 'Prayer Meeting', 'Focused prayer and intercession meeting', 'prayer', false, 60),
(1, 'Fellowship Meeting', 'Social fellowship and community building', 'fellowship', false, 120),
(1, 'Outreach Planning', 'Planning and organizing outreach activities', 'outreach', false, 75),
(1, 'Leadership Meeting', 'Cell leadership planning and coordination', 'leadership', false, 90);

-- Seed agenda sections for default Bible Study template
INSERT INTO agenda_template_sections (template_id, section_name, description, duration_minutes, section_order, is_required, section_type)
SELECT
    t.id,
    section_data.section_name,
    section_data.description,
    section_data.duration_minutes,
    section_data.section_order,
    section_data.is_required,
    section_data.section_type
FROM meeting_agenda_templates t
CROSS JOIN (VALUES
    ('Welcome & Icebreaker', 'Warm welcome and icebreaker activity', 10, 1, true, 'standard'),
    ('Worship & Praise', 'Songs and worship time', 15, 2, true, 'worship'),
    ('Announcements', 'Share important updates and announcements', 5, 3, true, 'announcements'),
    ('Bible Teaching', 'Main Bible study teaching session', 30, 4, true, 'bible_teaching'),
    ('Group Discussion', 'Interactive discussion on the teaching', 15, 5, true, 'standard'),
    ('Prayer Time', 'Group prayer and individual prayer requests', 10, 6, true, 'prayer'),
    ('Closing & Fellowship', 'Closing remarks and fellowship time', 5, 7, true, 'fellowship')
) AS section_data(section_name, description, duration_minutes, section_order, is_required, section_type)
WHERE t.name = 'Standard Bible Study' AND t.church_id = 1;

-- Seed agenda sections for Prayer Meeting template
INSERT INTO agenda_template_sections (template_id, section_name, description, duration_minutes, section_order, is_required, section_type)
SELECT
    t.id,
    section_data.section_name,
    section_data.description,
    section_data.duration_minutes,
    section_data.section_order,
    section_data.is_required,
    section_data.section_type
FROM meeting_agenda_templates t
CROSS JOIN (VALUES
    ('Opening Worship', 'Opening songs and worship', 10, 1, true, 'worship'),
    ('Praise & Thanksgiving', 'Share praises and thanksgiving', 15, 2, true, 'standard'),
    ('Prayer Requests', 'Share prayer needs and concerns', 15, 3, true, 'prayer'),
    ('Intercessory Prayer', 'Group prayer time', 20, 4, true, 'prayer')
) AS section_data(section_name, description, duration_minutes, section_order, is_required, section_type)
WHERE t.name = 'Prayer Meeting' AND t.church_id = 1;

-- ============================================
-- 5. OUTREACH EVENT PLANNING & BAPTISM REGISTER
-- ============================================

-- Outreach Events
CREATE TABLE IF NOT EXISTS outreach_events (
    id SERIAL PRIMARY KEY,
    church_id INTEGER NOT NULL REFERENCES churches(id) ON DELETE CASCADE,

    title VARCHAR(200) NOT NULL,
    description TEXT,
    event_type VARCHAR(50) DEFAULT 'evangelism', -- evangelism, community_service, outreach, mission

    event_date DATE NOT NULL,
    start_time TIME,
    end_time TIME,
    location TEXT,
    address TEXT,
    coordinates POINT,

    target_audience TEXT, -- who is this event for?
    expected_attendance INTEGER,

    -- Planning
    objective TEXT,
    preparation_needed TEXT,
    materials_needed TEXT,

    -- Resources & Budget
    estimated_budget DECIMAL(10,2),
    actual_budget DECIMAL(10,2),
    resources_assigned TEXT,

    -- Team
    event_coordinator_id INTEGER REFERENCES members(id) ON DELETE SET NULL,
    team_members JSONB DEFAULT '[]', -- array of member IDs

    -- Status & Outcomes
    status VARCHAR(50) DEFAULT 'planned', -- planned, confirmed, in_progress, completed, cancelled
    actual_attendance INTEGER,
    contacts_made INTEGER,
    decisions_made INTEGER,
    follow_up_needed BOOLEAN DEFAULT FALSE,

    notes TEXT,

    created_by INTEGER REFERENCES members(id) ON DELETE SET NULL,
    updated_by INTEGER REFERENCES members(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Baptism Candidates
CREATE TABLE IF NOT EXISTS baptism_candidates (
    id SERIAL PRIMARY KEY,
    church_id INTEGER NOT NULL REFERENCES churches(id) ON DELETE CASCADE,

    -- Candidate Info
    member_id INTEGER REFERENCES members(id) ON DELETE SET NULL,
    visitor_id INTEGER REFERENCES visitors(id) ON DELETE SET NULL,

    first_name VARCHAR(100) NOT NULL,
    surname VARCHAR(100) NOT NULL,
    contact_primary VARCHAR(100),
    email VARCHAR(255),
    age INTEGER,
    address TEXT,

    -- Baptism Details
    baptism_type VARCHAR(50) DEFAULT 'water', -- water, spirit, believer
    preferred_date DATE,
    baptism_date DATE,
    baptism_time TIME,
    location TEXT,

    -- Sponsors/Godparents
    sponsor_1_id INTEGER REFERENCES members(id) ON DELETE SET NULL,
    sponsor_1_name VARCHAR(200),
    sponsor_2_id INTEGER REFERENCES members(id) ON DELETE SET NULL,
    sponsor_2_name VARCHAR(200),

    -- Preparation & Counseling
    counseling_completed BOOLEAN DEFAULT FALSE,
    counseling_date DATE,
    counselor_id INTEGER REFERENCES members(id) ON DELETE SET NULL,
    foundation_class_completed BOOLEAN DEFAULT FALSE,

    -- Testimony & Faith Journey
    salvation_testimony TEXT,
    faith_journey TEXT,
    baptized_elsewhere BOOLEAN DEFAULT FALSE,
    previous_church TEXT,

    -- Status & Notes
    status VARCHAR(50) DEFAULT 'preparing', -- preparing, ready, scheduled, completed, deferred
    preparation_notes TEXT,
    special_requests TEXT,

    -- Baptism Event Link
    baptism_event_id INTEGER REFERENCES outreach_events(id) ON DELETE SET NULL,

    created_by INTEGER REFERENCES members(id) ON DELETE SET NULL,
    updated_by INTEGER REFERENCES members(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Baptism Records
CREATE TABLE IF NOT EXISTS baptism_records (
    id SERIAL PRIMARY KEY,
    church_id INTEGER NOT NULL REFERENCES churches(id) ON DELETE CASCADE,

    candidate_id INTEGER NOT NULL REFERENCES baptism_candidates(id) ON DELETE CASCADE,
    baptism_date DATE NOT NULL,
    baptism_time TIME,
    location TEXT,
    officiator_id INTEGER REFERENCES members(id) ON DELETE SET NULL,

    -- Baptism Details
    baptism_method VARCHAR(50), -- immersion, sprinkling, pouring
    water_temperature VARCHAR(20),
    weather_conditions TEXT,

    -- Witnesses & Participants
    witnesses JSONB DEFAULT '[]', -- array of member IDs and names
    photographer_id INTEGER REFERENCES members(id) ON DELETE SET NULL,

    -- Ceremony Details
    scripture_reading TEXT,
    prayer_offered TEXT,
    special_music TEXT,
    ceremony_notes TEXT,

    -- Follow-up
    certificate_issued BOOLEAN DEFAULT FALSE,
    certificate_number VARCHAR(50),
    follow_up_date DATE,
    follow_up_completed BOOLEAN DEFAULT FALSE,
    follow_up_notes TEXT,

    -- Media
    photos_taken BOOLEAN DEFAULT FALSE,
    video_recorded BOOLEAN DEFAULT FALSE,
    media_location TEXT,

    created_by INTEGER REFERENCES members(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Outreach Event Participants/Volunteers
CREATE TABLE IF NOT EXISTS outreach_participants (
    id SERIAL PRIMARY KEY,
    event_id INTEGER NOT NULL REFERENCES outreach_events(id) ON DELETE CASCADE,
    member_id INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,

    role VARCHAR(50) DEFAULT 'participant', -- coordinator, volunteer, participant
    confirmed BOOLEAN DEFAULT FALSE,
    attended BOOLEAN DEFAULT FALSE,
    hours_contributed DECIMAL(4,1),

    notes TEXT,

    UNIQUE(event_id, member_id)
);

-- Seed data for outreach events
INSERT INTO outreach_events (
    church_id, title, description, event_type, event_date, location,
    target_audience, expected_attendance, objective, status
) VALUES
(1, 'Community Block Party', 'Family-friendly outreach event in the local community', 'community_service',
 CURRENT_DATE + INTERVAL '30 days', 'Central Park', 'Local families and children', 150,
 'Build relationships with community and share the love of Christ', 'planned'),

(1, 'Door-to-Door Evangelism', 'Neighborhood visitation and gospel sharing', 'evangelism',
 CURRENT_DATE + INTERVAL '14 days', 'Various Neighborhoods', 'Local residents', 20,
 'Share the gospel and invite people to church', 'planned');

-- Seed data for baptism candidates
INSERT INTO baptism_candidates (
    church_id, first_name, surname, contact_primary, age, baptism_type,
    status, salvation_testimony, foundation_class_completed
) VALUES
(1, 'Sarah', 'Johnson', '+1234567890', 28, 'water', 'preparing',
 'I accepted Jesus as my Savior 6 months ago after a friend invited me to church', TRUE),
(1, 'Michael', 'Davis', '+1234567891', 35, 'water', 'ready',
 'God has been working in my life for years, and I''m ready to take this step', TRUE);

-- ============================================
-- 6. DISCIPLESHIP INTEGRATION - FOUNDATION SCHOOL TRACKER & BAPTISM PREP
-- ============================================

-- Foundation School Detailed Progress Tracking
CREATE TABLE IF NOT EXISTS foundation_school_progress (
    id SERIAL PRIMARY KEY,
    church_id INTEGER NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
    enrollment_id INTEGER NOT NULL REFERENCES foundation_school_enrollments(id) ON DELETE CASCADE,

    module_number INTEGER NOT NULL, -- 1-8 for the 8 modules
    module_title VARCHAR(200) NOT NULL,
    module_description TEXT,

    -- Progress tracking
    status VARCHAR(50) DEFAULT 'not_started', -- not_started, in_progress, completed, reviewed
    started_date DATE,
    completed_date DATE,
    reviewed_date DATE,

    -- Assignments and assessments
    assignments_completed INTEGER DEFAULT 0,
    total_assignments INTEGER DEFAULT 0,
    assessment_score DECIMAL(5,2), -- percentage score
    assessment_notes TEXT,

    -- Instructor feedback
    instructor_feedback TEXT,
    instructor_id INTEGER REFERENCES members(id) ON DELETE SET NULL,

    -- Study materials
    study_notes TEXT,
    prayer_points TEXT,
    key_learnings TEXT,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(enrollment_id, module_number)
);

-- Foundation School Module Templates
CREATE TABLE IF NOT EXISTS foundation_school_modules (
    id SERIAL PRIMARY KEY,
    church_id INTEGER NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
    level INTEGER NOT NULL, -- 1, 2, or 3
    module_number INTEGER NOT NULL, -- 1-8 within each level
    module_title VARCHAR(200) NOT NULL,
    module_description TEXT,
    objectives TEXT,

    -- Content structure
    key_scriptures TEXT,
    main_topics TEXT,
    assignments TEXT,
    assessment_criteria TEXT,

    -- Duration and resources
    estimated_weeks INTEGER DEFAULT 1,
    required_reading TEXT,
    additional_resources TEXT,

    -- Meta
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INTEGER,

    created_by INTEGER REFERENCES members(id) ON DELETE SET NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(church_id, level, module_number)
);

-- Baptism Preparation Checklist
CREATE TABLE IF NOT EXISTS baptism_prep_checklist (
    id SERIAL PRIMARY KEY,
    church_id INTEGER NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
    candidate_id INTEGER NOT NULL REFERENCES baptism_candidates(id) ON DELETE CASCADE,

    checklist_item VARCHAR(200) NOT NULL,
    category VARCHAR(50) DEFAULT 'general', -- counseling, foundation_school, testimony, sponsors, practical
    description TEXT,

    -- Completion tracking
    is_required BOOLEAN DEFAULT FALSE,
    is_completed BOOLEAN DEFAULT FALSE,
    completed_date DATE,
    completed_by INTEGER REFERENCES members(id) ON DELETE SET NULL,
    notes TEXT,

    -- Due dates and reminders
    due_date DATE,
    reminder_sent BOOLEAN DEFAULT FALSE,

    sort_order INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(candidate_id, checklist_item)
);

-- Baptism Preparation Sessions
CREATE TABLE IF NOT EXISTS baptism_prep_sessions (
    id SERIAL PRIMARY KEY,
    church_id INTEGER NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
    candidate_id INTEGER NOT NULL REFERENCES baptism_candidates(id) ON DELETE CASCADE,

    session_date DATE NOT NULL,
    session_type VARCHAR(50) DEFAULT 'counseling', -- counseling, testimony_prep, q_and_a, prayer
    facilitator_id INTEGER REFERENCES members(id) ON DELETE SET NULL,

    topics_covered TEXT,
    concerns_addressed TEXT,
    next_steps TEXT,
    prayer_requests TEXT,

    attendance_marked BOOLEAN DEFAULT FALSE,
    session_notes TEXT,
    follow_up_date DATE,

    created_by INTEGER REFERENCES members(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Foundation School Certificates
CREATE TABLE IF NOT EXISTS foundation_school_certificates (
    id SERIAL PRIMARY KEY,
    church_id INTEGER NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
    enrollment_id INTEGER NOT NULL REFERENCES foundation_school_enrollments(id) ON DELETE CASCADE,

    certificate_type VARCHAR(50) DEFAULT 'completion', -- completion, excellence, participation
    certificate_number VARCHAR(50) UNIQUE,
    issued_date DATE NOT NULL,
    issued_by INTEGER REFERENCES members(id) ON DELETE SET NULL,

    -- Certificate details
    student_name VARCHAR(200) NOT NULL,
    level_completed INTEGER NOT NULL,
    completion_date DATE,
    gpa_score DECIMAL(4,2),

    -- Digital certificate
    certificate_url TEXT,
    qr_code TEXT,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Seed foundation school modules
INSERT INTO foundation_school_modules (
    church_id, level, module_number, module_title, module_description,
    objectives, estimated_weeks, sort_order
) VALUES
-- Level 1 Modules
(1, 1, 1, 'Salvation and New Life', 'Understanding salvation, Holy Spirit baptism, and new life in Christ',
 'Understand the meaning of salvation, Explain water baptism, Describe Holy Spirit baptism', 1, 1),

(1, 1, 2, 'Prayer and Bible Study', 'Developing a consistent prayer life and learning to study the Bible',
 'Develop a daily prayer life, Learn basic Bible study methods, Understand prayer principles', 1, 2),

(1, 1, 3, 'The Church', 'Understanding the purpose and function of the local church',
 'Explain the purpose of the church, Understand church membership, Identify spiritual gifts', 1, 3),

(1, 1, 4, 'Christian Living', 'Practical Christian living and spiritual disciplines',
 'Apply biblical principles to daily life, Understand fasting, Practice tithing', 1, 4),

(1, 1, 5, 'Evangelism and Missions', 'Sharing the gospel and understanding global missions',
 'Share personal testimony, Understand evangelism methods, Learn about missions', 1, 5),

(1, 1, 6, 'Spiritual Warfare', 'Understanding spiritual battles and spiritual authority',
 'Identify spiritual warfare strategies, Understand spiritual authority, Apply spiritual warfare principles', 1, 6),

(1, 1, 7, 'Giving and Stewardship', 'Biblical principles of giving and managing resources',
 'Understand biblical giving, Learn stewardship principles, Apply giving in practice', 1, 7),

(1, 1, 8, 'End Times and Second Coming', 'Understanding biblical prophecy and the return of Christ',
 'Understand end-time events, Explain the second coming, Apply prophetic understanding', 1, 8)
ON CONFLICT (church_id, level, module_number) DO NOTHING;

-- Seed baptism preparation checklist template
INSERT INTO baptism_prep_checklist (
    church_id, candidate_id, checklist_item, category, description,
    is_required, sort_order
) VALUES
-- Template entries (will be copied for each candidate)
(1, 0, 'Initial Counseling Session', 'counseling', 'Meet with pastor/counselor for initial baptism discussion',
 true, 1),

(1, 0, 'Foundation School Completion', 'foundation_school', 'Complete all 8 modules of foundation school',
 true, 2),

(1, 0, 'Salvation Testimony Prepared', 'testimony', 'Write and practice personal salvation testimony',
 true, 3),

(1, 0, 'Sponsors/Godparents Assigned', 'sponsors', 'Identify and confirm baptism sponsors',
 true, 4),

(1, 0, 'Water Baptism Understanding', 'practical', 'Understand meaning and method of water baptism',
 true, 5),

(1, 0, 'Church Membership Discussion', 'practical', 'Discuss church membership and covenant',
 false, 6),

(1, 0, 'Baptism Robe/Attire', 'practical', 'Arrange appropriate baptism attire',
 false, 7),

(1, 0, 'Photography Arrangements', 'practical', 'Arrange for baptism photos/video if desired',
 false, 8) ON CONFLICT (candidate_id, checklist_item) DO NOTHING;

-- ============================================
-- 7. RELATIONSHIP MANAGEMENT - CONFLICT LOG & CELEBRATIONS TRACKER
-- ============================================

-- Conflict Management Log
CREATE TABLE IF NOT EXISTS conflict_logs (
    id SERIAL PRIMARY KEY,
    church_id INTEGER NOT NULL REFERENCES churches(id) ON DELETE CASCADE,

    -- Conflict Details
    title VARCHAR(200) NOT NULL,
    description TEXT,
    conflict_type VARCHAR(50) DEFAULT 'interpersonal', -- interpersonal, leadership, doctrinal, ministry, other

    -- Involved Parties
    reported_by INTEGER REFERENCES members(id) ON DELETE SET NULL,
    primary_party INTEGER REFERENCES members(id) ON DELETE SET NULL,
    secondary_party INTEGER REFERENCES members(id) ON DELETE SET NULL,
    involved_parties JSONB DEFAULT '[]', -- array of member IDs

    -- Context
    cell_group_id INTEGER REFERENCES cell_groups(id) ON DELETE SET NULL,
    ministry_area VARCHAR(100),
    incident_date DATE,
    reported_date DATE DEFAULT CURRENT_DATE,

    -- Severity and Status
    severity VARCHAR(20) DEFAULT 'low', -- low, medium, high, critical
    status VARCHAR(50) DEFAULT 'reported', -- reported, investigating, mediating, resolved, escalated, closed

    -- Resolution Details
    resolution_summary TEXT,
    resolution_date DATE,
    resolved_by INTEGER REFERENCES members(id) ON DELETE SET NULL,
    follow_up_required BOOLEAN DEFAULT FALSE,
    follow_up_date DATE,
    follow_up_completed BOOLEAN DEFAULT FALSE,

    -- Additional Info
    witnesses TEXT,
    evidence TEXT,
    lessons_learned TEXT,
    preventive_measures TEXT,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Conflict Resolution Steps/Actions
CREATE TABLE IF NOT EXISTS conflict_actions (
    id SERIAL PRIMARY KEY,
    conflict_id INTEGER NOT NULL REFERENCES conflict_logs(id) ON DELETE CASCADE,

    action_date DATE NOT NULL,
    action_type VARCHAR(50) DEFAULT 'meeting', -- meeting, counseling, mediation, prayer, discipline, other
    action_description TEXT,
    responsible_party INTEGER REFERENCES members(id) ON DELETE SET NULL,

    status VARCHAR(50) DEFAULT 'planned', -- planned, in_progress, completed, cancelled
    outcome TEXT,
    notes TEXT,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Celebrations & Events Tracker
CREATE TABLE IF NOT EXISTS celebration_events (
    id SERIAL PRIMARY KEY,
    church_id INTEGER NOT NULL REFERENCES churches(id) ON DELETE CASCADE,

    -- Event Details
    title VARCHAR(200) NOT NULL,
    description TEXT,
    event_type VARCHAR(50) DEFAULT 'birthday', -- birthday, anniversary, achievement, milestone, holiday, other

    -- Date and Recurrence
    event_date DATE NOT NULL,
    is_recurring BOOLEAN DEFAULT FALSE,
    recurrence_pattern VARCHAR(50), -- yearly, monthly, weekly, custom
    end_date DATE,

    -- Celebrant/Subject
    primary_member INTEGER REFERENCES members(id) ON DELETE SET NULL,
    secondary_member INTEGER REFERENCES members(id) ON DELETE SET NULL, -- for anniversaries, etc.
    involved_members JSONB DEFAULT '[]', -- for group celebrations

    -- Celebration Details
    celebration_theme TEXT,
    planned_activities TEXT,
    special_guests TEXT,
    budget_allocated DECIMAL(10,2),

    -- Planning and Execution
    coordinator INTEGER REFERENCES members(id) ON DELETE SET NULL,
    planning_status VARCHAR(50) DEFAULT 'planned', -- planned, confirmed, in_progress, completed, cancelled
    actual_date DATE,
    attendance_count INTEGER,

    -- Follow-up
    feedback TEXT,
    photos_videos TEXT,
    lessons_learned TEXT,

    created_by INTEGER REFERENCES members(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Special Dates Tracking (Birthdays, Anniversaries, etc.)
CREATE TABLE IF NOT EXISTS special_dates (
    id SERIAL PRIMARY KEY,
    church_id INTEGER NOT NULL REFERENCES churches(id) ON DELETE CASCADE,

    member_id INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    date_type VARCHAR(50) NOT NULL, -- birthday, wedding_anniversary, salvation_anniversary, baptism_anniversary, other
    special_date DATE NOT NULL,
    description TEXT,

    -- Celebration Preferences
    wants_celebration BOOLEAN DEFAULT TRUE,
    celebration_preferences TEXT,
    gift_suggestions TEXT,
    dietary_restrictions TEXT,

    -- Tracking
    last_celebrated DATE,
    celebration_count INTEGER DEFAULT 0,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(member_id, date_type, special_date)
);

-- Achievement and Milestone Tracker
CREATE TABLE IF NOT EXISTS achievements (
    id SERIAL PRIMARY KEY,
    church_id INTEGER NOT NULL REFERENCES churches(id) ON DELETE CASCADE,

    member_id INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    achievement_type VARCHAR(50) NOT NULL, -- graduation, leadership, service, spiritual, ministry, other
    title VARCHAR(200) NOT NULL,
    description TEXT,

    achievement_date DATE NOT NULL,
    awarded_by INTEGER REFERENCES members(id) ON DELETE SET NULL,
    certificate_issued BOOLEAN DEFAULT FALSE,

    -- Impact and Recognition
    significance_level VARCHAR(20) DEFAULT 'local', -- personal, cell_group, church, community, regional, national
    recognition_given TEXT,
    impact_description TEXT,

    -- Media and Documentation
    photos TEXT,
    testimonials TEXT,
    press_coverage TEXT,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Seed data for conflict types and celebration types
INSERT INTO lookups (category, name, value, display_order) VALUES
('conflict_type', 'Interpersonal', 'interpersonal', 1),
('conflict_type', 'Leadership', 'leadership', 2),
('conflict_type', 'Doctrinal', 'doctrinal', 3),
('conflict_type', 'Ministry', 'ministry', 4),
('conflict_type', 'Financial', 'financial', 5),
('conflict_type', 'Other', 'other', 6)
ON CONFLICT (category, name) DO NOTHING;

INSERT INTO lookups (category, name, value, display_order) VALUES
('celebration_type', 'Birthday', 'birthday', 1),
('celebration_type', 'Wedding Anniversary', 'wedding_anniversary', 2),
('celebration_type', 'Salvation Anniversary', 'salvation_anniversary', 3),
('celebration_type', 'Baptism Anniversary', 'baptism_anniversary', 4),
('celebration_type', 'Graduation', 'graduation', 5),
('celebration_type', 'Leadership Milestone', 'leadership_milestone', 6),
('celebration_type', 'Ministry Achievement', 'ministry_achievement', 7),
('celebration_type', 'Other', 'other', 8)
ON CONFLICT (category, name) DO NOTHING;

INSERT INTO lookups (category, name, value, display_order) VALUES
('conflict_severity', 'Low', 'low', 1),
('conflict_severity', 'Medium', 'medium', 2),
('conflict_severity', 'High', 'high', 3),
('conflict_severity', 'Critical', 'critical', 4)
ON CONFLICT (category, name) DO NOTHING;

-- ============================================
-- 8. FINANCE & GIVING MODULE - GIVING LOG & TESTIMONY TRACKER
-- ============================================

-- Giving/Contributions Log
CREATE TABLE IF NOT EXISTS giving_log (
    id SERIAL PRIMARY KEY,
    church_id INTEGER NOT NULL REFERENCES churches(id) ON DELETE CASCADE,

    member_id INTEGER REFERENCES members(id) ON DELETE SET NULL,
    giver_name VARCHAR(200), -- For anonymous or non-member donors

    -- Giving Details
    giving_type VARCHAR(50) DEFAULT 'tithe', -- tithe, offering, special_offering, building_fund, mission_offering, other
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',

    -- Date and Method
    giving_date DATE NOT NULL DEFAULT CURRENT_DATE,
    payment_method VARCHAR(50) DEFAULT 'cash', -- cash, check, bank_transfer, online, mobile_money, other

    -- Context
    service_date DATE,
    cell_group_id INTEGER REFERENCES cell_groups(id) ON DELETE SET NULL,
    ministry_area VARCHAR(100),
    purpose_description TEXT,

    -- Receipt and Tracking
    receipt_number VARCHAR(50) UNIQUE,
    transaction_reference VARCHAR(100),
    is_anonymous BOOLEAN DEFAULT FALSE,

    -- Audit
    recorded_by INTEGER REFERENCES members(id) ON DELETE SET NULL,
    recorded_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    notes TEXT,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Testimony Log
CREATE TABLE IF NOT EXISTS testimony_log (
    id SERIAL PRIMARY KEY,
    church_id INTEGER NOT NULL REFERENCES churches(id) ON DELETE CASCADE,

    -- Testifier Details
    member_id INTEGER REFERENCES members(id) ON DELETE SET NULL,
    testifier_name VARCHAR(200),
    contact_info VARCHAR(100),

    -- Testimony Details
    testimony_date DATE NOT NULL DEFAULT CURRENT_DATE,
    testimony_type VARCHAR(50) DEFAULT 'salvation', -- salvation, healing, provision, breakthrough, answered_prayer, other

    title VARCHAR(200),
    testimony_text TEXT NOT NULL,

    -- Context and Impact
    circumstance TEXT, -- What led to this testimony?
    how_god_intervened TEXT,
    life_impact TEXT,
    lessons_learned TEXT,

    -- Sharing Details
    shared_in_service BOOLEAN DEFAULT FALSE,
    service_date DATE,
    shared_online BOOLEAN DEFAULT FALSE,
    shared_in_cell BOOLEAN DEFAULT FALSE,

    -- Media
    photos TEXT, -- JSON array of photo URLs
    videos TEXT, -- JSON array of video URLs
    audio_recording TEXT,

    -- Approval and Publishing
    is_approved BOOLEAN DEFAULT FALSE,
    approved_by INTEGER REFERENCES members(id) ON DELETE SET NULL,
    approved_date DATE,
    is_published BOOLEAN DEFAULT FALSE,
    published_date DATE,

    -- Follow-up
    follow_up_needed BOOLEAN DEFAULT FALSE,
    follow_up_date DATE,
    follow_up_notes TEXT,

    recorded_by INTEGER REFERENCES members(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Budget Categories and Budgeting
CREATE TABLE IF NOT EXISTS budget_categories (
    id SERIAL PRIMARY KEY,
    church_id INTEGER NOT NULL REFERENCES churches(id) ON DELETE CASCADE,

    category_name VARCHAR(100) NOT NULL,
    category_type VARCHAR(50) DEFAULT 'expense', -- income, expense, asset, liability
    parent_category_id INTEGER REFERENCES budget_categories(id) ON DELETE SET NULL,

    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,

    created_by INTEGER REFERENCES members(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Church Budget
CREATE TABLE IF NOT EXISTS church_budget (
    id SERIAL PRIMARY KEY,
    church_id INTEGER NOT NULL REFERENCES churches(id) ON DELETE CASCADE,

    budget_year INTEGER NOT NULL,
    budget_month INTEGER, -- NULL for annual budget

    category_id INTEGER NOT NULL REFERENCES budget_categories(id) ON DELETE CASCADE,
    budgeted_amount DECIMAL(12,2) NOT NULL,

    -- Budget Details
    budget_type VARCHAR(20) DEFAULT 'annual', -- annual, monthly, quarterly
    description TEXT,

    approved_by INTEGER REFERENCES members(id) ON DELETE SET NULL,
    approved_date DATE,

    created_by INTEGER REFERENCES members(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Financial Reports/Actuals
CREATE TABLE IF NOT EXISTS financial_transactions (
    id SERIAL PRIMARY KEY,
    church_id INTEGER NOT NULL REFERENCES churches(id) ON DELETE CASCADE,

    transaction_date DATE NOT NULL,
    transaction_type VARCHAR(20) DEFAULT 'expense', -- income, expense, transfer

    category_id INTEGER REFERENCES budget_categories(id) ON DELETE SET NULL,
    amount DECIMAL(12,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',

    -- Transaction Details
    description TEXT,
    vendor_supplier VARCHAR(200),
    invoice_number VARCHAR(50),
    payment_method VARCHAR(50),

    -- References
    giving_log_id INTEGER REFERENCES giving_log(id) ON DELETE SET NULL,
    member_id INTEGER REFERENCES members(id) ON DELETE SET NULL,

    -- Audit
    recorded_by INTEGER REFERENCES members(id) ON DELETE SET NULL,
    approved_by INTEGER REFERENCES members(id) ON DELETE SET NULL,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Seed data for giving types, testimony types, and budget categories
INSERT INTO lookups (category, name, value, display_order) VALUES
('giving_type', 'Tithe', 'tithe', 1),
('giving_type', 'General Offering', 'offering', 2),
('giving_type', 'Special Offering', 'special_offering', 3),
('giving_type', 'Building Fund', 'building_fund', 4),
('giving_type', 'Mission Offering', 'mission_offering', 5),
('giving_type', 'Benevolence', 'benevolence', 6),
('giving_type', 'Other', 'other', 7)
ON CONFLICT (category, name) DO NOTHING;

INSERT INTO lookups (category, name, value, display_order) VALUES
('testimony_type', 'Salvation', 'salvation', 1),
('testimony_type', 'Healing', 'healing', 2),
('testimony_type', 'Provision', 'provision', 3),
('testimony_type', 'Breakthrough', 'breakthrough', 4),
('testimony_type', 'Answered Prayer', 'answered_prayer', 5),
('testimony_type', 'Deliverance', 'deliverance', 6),
('testimony_type', 'Other', 'other', 7)
ON CONFLICT (category, name) DO NOTHING;

INSERT INTO lookups (category, name, value, display_order) VALUES
('payment_method', 'Cash', 'cash', 1),
('payment_method', 'Check', 'check', 2),
('payment_method', 'Bank Transfer', 'bank_transfer', 3),
('payment_method', 'Online Payment', 'online', 4),
('payment_method', 'Mobile Money', 'mobile_money', 5),
('payment_method', 'Other', 'other', 6)
ON CONFLICT (category, name) DO NOTHING;

-- Seed basic budget categories
INSERT INTO budget_categories (church_id, category_name, category_type, description) VALUES
(1, 'Tithes and Offerings', 'income', 'Regular giving from church members'),
(1, 'Special Offerings', 'income', 'Special collections and designated giving'),
(1, 'Other Income', 'income', 'Miscellaneous income sources'),

(1, 'Staff Salaries', 'expense', 'Compensation for church staff'),
(1, 'Ministry Expenses', 'expense', 'Costs for various ministry programs'),
(1, 'Building & Maintenance', 'expense', 'Facility upkeep and improvements'),
(1, 'Utilities', 'expense', 'Electricity, water, internet, etc.'),
(1, 'Office Supplies', 'expense', 'Administrative and office materials'),
(1, 'Missions & Outreach', 'expense', 'Evangelism and community outreach'),

(1, 'Building Fund', 'asset', 'Savings for building projects'),
(1, 'Emergency Fund', 'asset', 'Reserve funds for unexpected needs');

-- ============================================
-- 9. CELL GROWTH MULTIPLICATION - WBS CYCLE DASHBOARD
-- ============================================

-- Cell Group Performance Metrics
CREATE TABLE IF NOT EXISTS cell_performance_metrics (
    id SERIAL PRIMARY KEY,
    church_id INTEGER NOT NULL REFERENCES churches(id) ON DELETE CASCADE,

    cell_group_id INTEGER NOT NULL REFERENCES cell_groups(id) ON DELETE CASCADE,
    metric_date DATE NOT NULL,
    week_of_year INTEGER,

    -- Attendance Metrics
    attendance_count INTEGER NOT NULL,
    visitor_count INTEGER DEFAULT 0,
    member_count INTEGER NOT NULL,
    first_timers INTEGER DEFAULT 0,

    -- Growth Indicators
    new_conversions INTEGER DEFAULT 0,
    baptisms INTEGER DEFAULT 0,
    foundation_school_graduates INTEGER DEFAULT 0,

    -- Health Metrics
    offering_amount DECIMAL(10,2) DEFAULT 0,
    testimony_count INTEGER DEFAULT 0,
    prayer_requests_count INTEGER DEFAULT 0,

    -- Leadership Development
    apprentice_leaders INTEGER DEFAULT 0,
    potential_leaders_identified INTEGER DEFAULT 0,

    -- Multiplication Readiness
    multiplication_readiness_score INTEGER DEFAULT 0, -- 1-10 scale
    target_multiplication_date DATE,
    multiplication_training_completed BOOLEAN DEFAULT FALSE,

    recorded_by INTEGER REFERENCES members(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Cell Group Health Assessment
CREATE TABLE IF NOT EXISTS cell_health_assessments (
    id SERIAL PRIMARY KEY,
    church_id INTEGER NOT NULL REFERENCES churches(id) ON DELETE CASCADE,

    cell_group_id INTEGER NOT NULL REFERENCES cell_groups(id) ON DELETE CASCADE,
    assessment_date DATE NOT NULL,

    -- WBS Cycle Stage (Win, Build, Send)
    wbs_stage VARCHAR(20) DEFAULT 'win', -- win, build, send, multiply
    stage_progress_percentage INTEGER DEFAULT 0, -- 0-100

    -- Win Metrics (Evangelism & Growth)
    outreach_events_count INTEGER DEFAULT 0,
    gospel_presentations_count INTEGER DEFAULT 0,
    conversion_rate DECIMAL(5,2) DEFAULT 0, -- percentage

    -- Build Metrics (Discipleship & Development)
    discipleship_sessions_count INTEGER DEFAULT 0,
    foundation_school_completion_rate DECIMAL(5,2) DEFAULT 0,
    leadership_development_score INTEGER DEFAULT 0, -- 1-10 scale

    -- Send Metrics (Multiplication & Sending Out)
    leaders_sent_out INTEGER DEFAULT 0,
    new_cells_planted INTEGER DEFAULT 0,
    multiplication_success_rate DECIMAL(5,2) DEFAULT 0,

    -- Overall Health Score (1-10)
    overall_health_score INTEGER DEFAULT 5,
    health_trends TEXT, -- improving, declining, stable

    -- Action Items
    critical_issues TEXT,
    recommended_actions TEXT,
    next_review_date DATE,

    assessed_by INTEGER REFERENCES members(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Leadership Pipeline
CREATE TABLE IF NOT EXISTS leadership_pipeline (
    id SERIAL PRIMARY KEY,
    church_id INTEGER NOT NULL REFERENCES churches(id) ON DELETE CASCADE,

    member_id INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    member_role VARCHAR(50), -- member, cell_visitor, apprentice, cell_leader, zone_leader

    -- Development Stage
    development_stage VARCHAR(30) DEFAULT 'potential', -- potential, apprentice, trained, leading, multiplying
    development_start_date DATE,

    -- Skills Assessment (1-10 scale)
    leadership_potential INTEGER DEFAULT 5,
    teaching_ability INTEGER DEFAULT 5,
    evangelism_skills INTEGER DEFAULT 5,
    discipleship_capability INTEGER DEFAULT 5,
    administrative_skills INTEGER DEFAULT 5,

    -- Training Progress
    training_completed TEXT, -- JSON array of completed trainings
    training_needed TEXT, -- JSON array of needed trainings
    mentorship_assigned INTEGER REFERENCES members(id) ON DELETE SET NULL,

    -- Multiplication Readiness
    ready_for_multiplication BOOLEAN DEFAULT FALSE,
    multiplication_date DATE,
    cells_led INTEGER DEFAULT 0,

    -- Notes and Follow-up
    development_notes TEXT,
    next_review_date DATE,
    follow_up_actions TEXT,

    identified_by INTEGER REFERENCES members(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Cell Multiplication Planning
CREATE TABLE IF NOT EXISTS cell_multiplication_plans (
    id SERIAL PRIMARY KEY,
    church_id INTEGER NOT NULL REFERENCES churches(id) ON DELETE CASCADE,

    parent_cell_id INTEGER NOT NULL REFERENCES cell_groups(id) ON DELETE CASCADE,
    target_multiplication_date DATE NOT NULL,
    planned_launch_date DATE,

    -- Multiplication Strategy
    multiplication_type VARCHAR(30) DEFAULT 'split', -- split, daughter, satellite
    target_location TEXT,
    target_audience TEXT,

    -- Leadership Assignment
    primary_leader_id INTEGER REFERENCES members(id) ON DELETE SET NULL,
    apprentice_leader_id INTEGER REFERENCES members(id) ON DELETE SET NULL,
    support_team_members TEXT, -- JSON array of member IDs

    -- Preparation Milestones
    milestones TEXT, -- JSON array of milestone objects
    completion_percentage INTEGER DEFAULT 0,

    -- Resources Needed
    budget_allocated DECIMAL(10,2) DEFAULT 0,
    materials_needed TEXT,
    training_required TEXT,

    -- Status and Tracking
    status VARCHAR(30) DEFAULT 'planning', -- planning, preparing, ready, launched, completed
    launch_success_rating INTEGER, -- 1-10 scale
    lessons_learned TEXT,

    coordinator INTEGER REFERENCES members(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Church-wide Growth Targets
CREATE TABLE IF NOT EXISTS growth_targets (
    id SERIAL PRIMARY KEY,
    church_id INTEGER NOT NULL REFERENCES churches(id) ON DELETE CASCADE,

    target_year INTEGER NOT NULL,
    target_period VARCHAR(20) DEFAULT 'annual', -- annual, quarterly, monthly

    -- Quantitative Targets
    target_members INTEGER,
    target_cells INTEGER,
    target_conversions INTEGER,
    target_baptisms INTEGER,

    -- Qualitative Targets
    target_leaders_developed INTEGER,
    target_cells_multiplied INTEGER,
    target_disciples_made INTEGER,

    -- Financial Targets
    target_giving DECIMAL(12,2),
    target_missions_giving DECIMAL(12,2),

    -- Progress Tracking
    current_members INTEGER DEFAULT 0,
    current_cells INTEGER DEFAULT 0,
    current_conversions INTEGER DEFAULT 0,
    current_baptisms INTEGER DEFAULT 0,

    progress_percentage DECIMAL(5,2) DEFAULT 0,
    target_status VARCHAR(20) DEFAULT 'on_track', -- on_track, behind, ahead, achieved

    set_by INTEGER REFERENCES members(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Seed data for leadership development stages and cell health metrics
INSERT INTO lookups (category, name, value, display_order) VALUES
('leadership_stage', 'Potential Leader', 'potential', 1),
('leadership_stage', 'Apprentice', 'apprentice', 2),
('leadership_stage', 'Trained Leader', 'trained', 3),
('leadership_stage', 'Cell Leader', 'leading', 4),
('leadership_stage', 'Multiplying Leader', 'multiplying', 5)
ON CONFLICT (category, name) DO NOTHING;

INSERT INTO lookups (category, name, value, display_order) VALUES
('wbs_stage', 'Win (Evangelism)', 'win', 1),
('wbs_stage', 'Build (Discipleship)', 'build', 2),
('wbs_stage', 'Send (Multiplication)', 'send', 3),
('wbs_stage', 'Multiply (Plant)', 'multiply', 4)
ON CONFLICT (category, name) DO NOTHING;

INSERT INTO lookups (category, name, value, display_order) VALUES
('multiplication_type', 'Split Existing Cell', 'split', 1),
('multiplication_type', 'Daughter Cell', 'daughter', 2),
('multiplication_type', 'Satellite Cell', 'satellite', 3)
ON CONFLICT (category, name) DO NOTHING;

-- ============================================
-- 10. PERSONAL GROWTH & WELLNESS TRACKER - GROWTH PLANS & BURNOUT MONITOR
-- ============================================

-- Personal Growth Plans
CREATE TABLE IF NOT EXISTS personal_growth_plans (
    id SERIAL PRIMARY KEY,
    church_id INTEGER NOT NULL REFERENCES churches(id) ON DELETE CASCADE,

    member_id INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,

    -- Plan Details
    plan_title VARCHAR(200) NOT NULL,
    plan_description TEXT,
    plan_category VARCHAR(50) DEFAULT 'spiritual', -- spiritual, personal, leadership, ministry, family

    -- Timeframe
    start_date DATE NOT NULL,
    target_completion_date DATE,
    actual_completion_date DATE,

    -- Status and Progress
    status VARCHAR(30) DEFAULT 'draft', -- draft, active, completed, paused, cancelled
    overall_progress_percentage INTEGER DEFAULT 0,

    -- Goals and Objectives
    primary_goal TEXT,
    specific_objectives TEXT, -- JSON array of objectives
    success_metrics TEXT, -- JSON array of measurable outcomes

    -- Resources and Support
    required_resources TEXT,
    accountability_partner INTEGER REFERENCES members(id) ON DELETE SET NULL,
    mentorship_support INTEGER REFERENCES members(id) ON DELETE SET NULL,

    -- Review and Updates
    review_frequency VARCHAR(20) DEFAULT 'monthly', -- weekly, monthly, quarterly
    last_review_date DATE,
    next_review_date DATE,
    review_notes TEXT,

    created_by INTEGER REFERENCES members(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Growth Plan Milestones
CREATE TABLE IF NOT EXISTS growth_plan_milestones (
    id SERIAL PRIMARY KEY,
    growth_plan_id INTEGER NOT NULL REFERENCES personal_growth_plans(id) ON DELETE CASCADE,

    milestone_title VARCHAR(200) NOT NULL,
    milestone_description TEXT,
    milestone_category VARCHAR(50), -- prayer, bible_study, service, leadership, personal

    -- Timeline
    target_date DATE,
    completed_date DATE,
    is_completed BOOLEAN DEFAULT FALSE,

    -- Progress Tracking
    progress_notes TEXT,
    challenges_encountered TEXT,
    lessons_learned TEXT,

    -- Support and Resources
    required_resources TEXT,
    support_needed TEXT,

    sort_order INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Burnout Risk Assessment
CREATE TABLE IF NOT EXISTS burnout_assessments (
    id SERIAL PRIMARY KEY,
    church_id INTEGER NOT NULL REFERENCES churches(id) ON DELETE CASCADE,

    member_id INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    assessment_date DATE NOT NULL,

    -- Burnout Indicators (1-10 scale)
    emotional_exhaustion INTEGER NOT NULL CHECK (emotional_exhaustion >= 1 AND emotional_exhaustion <= 10),
    depersonalization INTEGER NOT NULL CHECK (depersonalization >= 1 AND depersonalization <= 10),
    reduced_accomplishment INTEGER NOT NULL CHECK (reduced_accomplishment >= 1 AND reduced_accomplishment <= 10),

    -- Overall Risk Level
    overall_risk_level VARCHAR(20), -- low, moderate, high, critical (calculated)

    -- Contributing Factors
    work_hours_per_week INTEGER,
    sleep_hours_per_night DECIMAL(3,1),
    stress_factors TEXT,
    support_system_rating INTEGER CHECK (support_system_rating >= 1 AND support_system_rating <= 10),

    -- Health and Wellness
    physical_health_rating INTEGER CHECK (physical_health_rating >= 1 AND physical_health_rating <= 10),
    mental_health_rating INTEGER CHECK (mental_health_rating >= 1 AND mental_health_rating <= 10),
    spiritual_health_rating INTEGER CHECK (spiritual_health_rating >= 1 AND spiritual_health_rating <= 10),

    -- Recommendations
    recommended_actions TEXT,
    intervention_needed BOOLEAN DEFAULT FALSE,
    intervention_type VARCHAR(50), -- counseling, sabbatical, reduced_responsibilities, medical_attention
    follow_up_date DATE,

    assessed_by INTEGER REFERENCES members(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Wellness Check-ins
CREATE TABLE IF NOT EXISTS wellness_checkins (
    id SERIAL PRIMARY KEY,
    church_id INTEGER NOT NULL REFERENCES churches(id) ON DELETE CASCADE,

    member_id INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    checkin_date DATE NOT NULL,

    -- Daily Wellness Metrics (1-10 scale)
    energy_level INTEGER CHECK (energy_level >= 1 AND energy_level <= 10),
    stress_level INTEGER CHECK (stress_level >= 1 AND stress_level <= 10),
    sleep_quality INTEGER CHECK (sleep_quality >= 1 AND sleep_quality <= 10),
    spiritual_connection INTEGER CHECK (spiritual_connection >= 1 AND spiritual_connection <= 10),

    -- Weekly/Monthly Reflection
    accomplishments_this_period TEXT,
    challenges_this_period TEXT,
    prayer_requests TEXT,
    gratitude_items TEXT,

    -- Health and Rest
    exercise_days_this_week INTEGER DEFAULT 0,
    rest_days_this_week INTEGER DEFAULT 0,
    time_with_family DECIMAL(4,1) DEFAULT 0, -- hours per week
    personal_devotion_time DECIMAL(4,1) DEFAULT 0, -- hours per week

    -- Work-Life Balance
    ministry_hours_per_week DECIMAL(4,1),
    non_ministry_hours_per_week DECIMAL(4,1),
    work_life_balance_rating INTEGER CHECK (work_life_balance_rating >= 1 AND work_life_balance_rating <= 10),

    -- Support and Community
    support_system_satisfaction INTEGER CHECK (support_system_satisfaction >= 1 AND support_system_satisfaction <= 10),
    community_connection_rating INTEGER CHECK (community_connection_rating >= 1 AND community_connection_rating <= 10),

    -- Notes and Reflections
    general_notes TEXT,
    concerns_to_address TEXT,
    goals_for_next_period TEXT,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Spiritual Disciplines Tracking
CREATE TABLE IF NOT EXISTS spiritual_disciplines (
    id SERIAL PRIMARY KEY,
    church_id INTEGER NOT NULL REFERENCES churches(id) ON DELETE CASCADE,

    member_id INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    discipline_date DATE NOT NULL,

    -- Daily Disciplines (boolean flags)
    bible_reading BOOLEAN DEFAULT FALSE,
    prayer_time BOOLEAN DEFAULT FALSE,
    meditation BOOLEAN DEFAULT FALSE,
    fasting BOOLEAN DEFAULT FALSE,
    worship BOOLEAN DEFAULT FALSE,
    service BOOLEAN DEFAULT FALSE,

    -- Time Tracking (minutes)
    bible_reading_time INTEGER DEFAULT 0,
    prayer_time_minutes INTEGER DEFAULT 0,
    meditation_time INTEGER DEFAULT 0,
    worship_time INTEGER DEFAULT 0,

    -- Quality and Reflection
    scripture_focus TEXT,
    prayer_focus TEXT,
    spiritual_insights TEXT,
    challenges_encountered TEXT,

    -- Weekly Summary (calculated)
    weekly_bible_reading_days INTEGER DEFAULT 0,
    weekly_prayer_days INTEGER DEFAULT 0,
    weekly_fasting_days INTEGER DEFAULT 0,
    weekly_service_days INTEGER DEFAULT 0,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Personal Development Goals
CREATE TABLE IF NOT EXISTS personal_development_goals (
    id SERIAL PRIMARY KEY,
    church_id INTEGER NOT NULL REFERENCES churches(id) ON DELETE CASCADE,

    member_id INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,

    -- Goal Details
    goal_title VARCHAR(200) NOT NULL,
    goal_description TEXT,
    goal_category VARCHAR(50) DEFAULT 'personal', -- personal, spiritual, professional, relational, health

    -- SMART Framework
    specific_description TEXT,
    measurable_criteria TEXT,
    achievable_action_steps TEXT,
    relevant_reason TEXT,
    time_bound_deadline DATE,

    -- Progress Tracking
    status VARCHAR(30) DEFAULT 'active', -- active, completed, paused, cancelled
    progress_percentage INTEGER DEFAULT 0,
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    target_completion_date DATE,
    actual_completion_date DATE,

    -- Accountability
    accountability_partner INTEGER REFERENCES members(id) ON DELETE SET NULL,
    progress_updates TEXT, -- JSON array of progress entries
    obstacles_encountered TEXT,
    support_needed TEXT,

    -- Review and Reflection
    quarterly_review_date DATE,
    review_notes TEXT,
    lessons_learned TEXT,
    next_steps TEXT,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Seed data for growth categories and burnout risk levels
INSERT INTO lookups (category, name, value, display_order) VALUES
('growth_plan_category', 'Spiritual Growth', 'spiritual', 1),
('growth_plan_category', 'Personal Development', 'personal', 2),
('growth_plan_category', 'Leadership Development', 'leadership', 3),
('growth_plan_category', 'Ministry Skills', 'ministry', 4),
('growth_plan_category', 'Family & Relationships', 'family', 5)
ON CONFLICT (category, name) DO NOTHING;

INSERT INTO lookups (category, name, value, display_order) VALUES
('burnout_risk_level', 'Low Risk', 'low', 1),
('burnout_risk_level', 'Moderate Risk', 'moderate', 2),
('burnout_risk_level', 'High Risk', 'high', 3),
('burnout_risk_level', 'Critical Risk', 'critical', 4)
ON CONFLICT (category, name) DO NOTHING;

INSERT INTO lookups (category, name, value, display_order) VALUES
('intervention_type', 'Counseling', 'counseling', 1),
('intervention_type', 'Sabbatical', 'sabbatical', 2),
('intervention_type', 'Reduced Responsibilities', 'reduced_responsibilities', 3),
('intervention_type', 'Medical Attention', 'medical_attention', 4),
('intervention_type', 'Spiritual Retreat', 'spiritual_retreat', 5)
ON CONFLICT (category, name) DO NOTHING;

-- ============================================
-- 11. ENHANCED CRISIS MANAGEMENT SYSTEM
-- ============================================

-- Crisis Assessment Framework
CREATE TABLE IF NOT EXISTS crisis_assessments (
    id SERIAL PRIMARY KEY,
    church_id INTEGER NOT NULL REFERENCES churches(id) ON DELETE CASCADE,

    crisis_case_id INTEGER REFERENCES crisis_followups(id) ON DELETE CASCADE,
    assessment_type VARCHAR(50) NOT NULL, -- initial, follow_up, risk_reassessment
    assessment_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Risk Assessment (1-10 scale)
    suicide_risk INTEGER CHECK (suicide_risk BETWEEN 1 AND 10),
    self_harm_risk INTEGER CHECK (self_harm_risk BETWEEN 1 AND 10),
    harm_to_others_risk INTEGER CHECK (harm_to_others_risk BETWEEN 1 AND 10),
    medical_risk INTEGER CHECK (medical_risk BETWEEN 1 AND 10),

    -- Emotional State Assessment
    depression_level INTEGER CHECK (depression_level BETWEEN 1 AND 10),
    anxiety_level INTEGER CHECK (anxiety_level BETWEEN 1 AND 10),
    hopelessness_level INTEGER CHECK (hopelessness_level BETWEEN 1 AND 10),
    isolation_level INTEGER CHECK (isolation_level BETWEEN 1 AND 10),

    -- Support Network Assessment
    family_support BOOLEAN DEFAULT FALSE,
    friend_support BOOLEAN DEFAULT FALSE,
    church_support BOOLEAN DEFAULT FALSE,
    professional_help BOOLEAN DEFAULT FALSE,
    support_network_notes TEXT,

    -- Crisis Trigger Assessment
    primary_trigger TEXT,
    contributing_factors TEXT,
    recent_stressors TEXT,

    -- Overall Risk Level
    overall_risk_level VARCHAR(20), -- low, moderate, high, critical
    immediate_action_required BOOLEAN DEFAULT FALSE,
    immediate_action_details TEXT,

    assessed_by INTEGER REFERENCES members(id) ON DELETE SET NULL,
    assessment_notes TEXT,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crisis Intervention Plans
CREATE TABLE IF NOT EXISTS crisis_intervention_plans (
    id SERIAL PRIMARY KEY,
    church_id INTEGER NOT NULL REFERENCES churches(id) ON DELETE CASCADE,

    crisis_case_id INTEGER NOT NULL REFERENCES crisis_followups(id) ON DELETE CASCADE,

    -- Plan Details
    plan_type VARCHAR(50) NOT NULL, -- emergency, short_term, long_term
    plan_status VARCHAR(30) DEFAULT 'active', -- active, completed, discontinued
    plan_start_date DATE NOT NULL,
    plan_end_date DATE,

    -- Immediate Actions (within 24 hours)
    immediate_actions JSONB DEFAULT '[]', -- array of action objects
    immediate_timeline VARCHAR(50), -- within_24h, within_72h, within_week

    -- Short-term Goals (1-4 weeks)
    short_term_goals JSONB DEFAULT '[]',
    short_term_interventions JSONB DEFAULT '[]',

    -- Long-term Goals (ongoing support)
    long_term_goals JSONB DEFAULT '[]',
    long_term_interventions JSONB DEFAULT '[]',

    -- Safety Planning
    safety_plan JSONB DEFAULT '{}', -- crisis signals, coping strategies, support contacts
    emergency_contacts JSONB DEFAULT '[]',

    -- Resource Allocation
    assigned_caregivers JSONB DEFAULT '[]', -- array of member IDs with roles
    external_resources JSONB DEFAULT '[]', -- professional help, counseling, etc.

    -- Monitoring & Review
    review_frequency VARCHAR(30), -- daily, weekly, biweekly, monthly
    next_review_date DATE,

    created_by INTEGER REFERENCES members(id) ON DELETE SET NULL,
    updated_by INTEGER REFERENCES members(id) ON DELETE SET NULL,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crisis Follow-up Sessions
CREATE TABLE IF NOT EXISTS crisis_followup_sessions (
    id SERIAL PRIMARY KEY,
    church_id INTEGER NOT NULL REFERENCES churches(id) ON DELETE CASCADE,

    crisis_case_id INTEGER NOT NULL REFERENCES crisis_followups(id) ON DELETE CASCADE,
    intervention_plan_id INTEGER REFERENCES crisis_intervention_plans(id) ON DELETE SET NULL,

    -- Session Details
    session_date DATE NOT NULL,
    session_time TIME,
    session_duration INTEGER, -- minutes
    session_type VARCHAR(50), -- check_in, counseling, support, assessment
    session_location VARCHAR(100), -- church_office, home_visit, phone, video

    -- Session Content
    session_objectives TEXT,
    discussion_topics TEXT,
    progress_made TEXT,
    challenges_encountered TEXT,

    -- Member's Current State
    emotional_state VARCHAR(50), -- improved, same, worsened
    coping_effectiveness INTEGER CHECK (coping_effectiveness BETWEEN 1 AND 10),
    support_system_effectiveness INTEGER CHECK (support_system_effectiveness BETWEEN 1 AND 10),
    risk_level_change VARCHAR(20), -- decreased, same, increased

    -- Actions Taken
    interventions_applied JSONB DEFAULT '[]',
    referrals_made JSONB DEFAULT '[]',
    resources_provided JSONB DEFAULT '[]',

    -- Follow-up Planning
    next_session_date DATE,
    next_session_objectives TEXT,
    homework_assignments TEXT,

    -- Session Participants
    primary_caregiver INTEGER REFERENCES members(id) ON DELETE SET NULL,
    additional_participants JSONB DEFAULT '[]', -- array of member IDs

    session_notes TEXT,
    member_feedback TEXT,

    created_by INTEGER REFERENCES members(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crisis Resources & Referrals
CREATE TABLE IF NOT EXISTS crisis_resources (
    id SERIAL PRIMARY KEY,
    church_id INTEGER NOT NULL REFERENCES churches(id) ON DELETE CASCADE,

    resource_name VARCHAR(200) NOT NULL,
    resource_type VARCHAR(50) NOT NULL, -- counseling, medical, legal, financial, housing, etc.
    resource_category VARCHAR(50), -- local, national, church, professional

    -- Contact Information
    contact_name VARCHAR(200),
    phone_number VARCHAR(20),
    email VARCHAR(200),
    website TEXT,
    address TEXT,

    -- Service Details
    services_provided TEXT,
    eligibility_requirements TEXT,
    cost_information TEXT,
    availability_hours TEXT,

    -- Church Relationship
    is_church_partner BOOLEAN DEFAULT FALSE,
    partnership_details TEXT,
    referral_process TEXT,

    -- Usage Tracking
    usage_count INTEGER DEFAULT 0,
    last_used_date DATE,

    is_active BOOLEAN DEFAULT TRUE,
    created_by INTEGER REFERENCES members(id) ON DELETE SET NULL,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crisis Case Referrals
CREATE TABLE IF NOT EXISTS crisis_referrals (
    id SERIAL PRIMARY KEY,
    church_id INTEGER NOT NULL REFERENCES churches(id) ON DELETE CASCADE,

    crisis_case_id INTEGER NOT NULL REFERENCES crisis_followups(id) ON DELETE CASCADE,
    resource_id INTEGER REFERENCES crisis_resources(id) ON DELETE SET NULL,

    -- Referral Details
    referral_date DATE NOT NULL,
    referral_type VARCHAR(50), -- professional, community_service, church_resource
    referral_reason TEXT,

    -- External Provider Details (if not using crisis_resources)
    provider_name VARCHAR(200),
    provider_contact VARCHAR(200),
    provider_specialty VARCHAR(100),

    -- Referral Status
    referral_status VARCHAR(30) DEFAULT 'pending', -- pending, accepted, declined, completed, follow_up_needed
    status_notes TEXT,

    -- Follow-up Information
    appointment_date DATE,
    appointment_time TIME,
    follow_up_required BOOLEAN DEFAULT TRUE,
    follow_up_date DATE,

    -- Outcomes
    outcome_notes TEXT,
    satisfaction_rating INTEGER CHECK (satisfaction_rating BETWEEN 1 AND 5),

    referred_by INTEGER REFERENCES members(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crisis Recovery Milestones
CREATE TABLE IF NOT EXISTS crisis_recovery_milestones (
    id SERIAL PRIMARY KEY,
    church_id INTEGER NOT NULL REFERENCES churches(id) ON DELETE CASCADE,

    crisis_case_id INTEGER NOT NULL REFERENCES crisis_followups(id) ON DELETE CASCADE,

    -- Milestone Details
    milestone_name VARCHAR(200) NOT NULL,
    milestone_category VARCHAR(50), -- emotional, spiritual, practical, relational
    milestone_description TEXT,

    -- Progress Tracking
    target_date DATE,
    achieved_date DATE,
    milestone_status VARCHAR(30) DEFAULT 'pending', -- pending, achieved, deferred, cancelled

    -- Measurement
    success_criteria TEXT,
    measurement_method VARCHAR(100), -- self_report, caregiver_assessment, observable_change
    baseline_measurement TEXT,
    current_measurement TEXT,

    -- Support Needed
    support_required TEXT,
    resources_needed TEXT,

    created_by INTEGER REFERENCES members(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Update existing crisis_followups table with enhanced fields
ALTER TABLE crisis_followups ADD COLUMN IF NOT EXISTS severity_level VARCHAR(20) DEFAULT 'moderate';
ALTER TABLE crisis_followups ADD COLUMN IF NOT EXISTS crisis_category VARCHAR(50);
ALTER TABLE crisis_followups ADD COLUMN IF NOT EXISTS immediate_needs TEXT;
ALTER TABLE crisis_followups ADD COLUMN IF NOT EXISTS confidentiality_level VARCHAR(20) DEFAULT 'standard';
ALTER TABLE crisis_followups ADD COLUMN IF NOT EXISTS case_manager INTEGER REFERENCES members(id);
ALTER TABLE crisis_followups ADD COLUMN IF NOT EXISTS case_status VARCHAR(30) DEFAULT 'active';
ALTER TABLE crisis_followups ADD COLUMN IF NOT EXISTS escalation_level INTEGER DEFAULT 1;
ALTER TABLE crisis_followups ADD COLUMN IF NOT EXISTS last_escalation_date DATE;
ALTER TABLE crisis_followups ADD COLUMN IF NOT EXISTS resolution_date DATE;
ALTER TABLE crisis_followups ADD COLUMN IF NOT EXISTS resolution_notes TEXT;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_crisis_assessments_case ON crisis_assessments(crisis_case_id);
CREATE INDEX IF NOT EXISTS idx_crisis_assessments_risk ON crisis_assessments(overall_risk_level);
CREATE INDEX IF NOT EXISTS idx_crisis_intervention_plans_case ON crisis_intervention_plans(crisis_case_id);
CREATE INDEX IF NOT EXISTS idx_crisis_followup_sessions_case ON crisis_followup_sessions(crisis_case_id);
CREATE INDEX IF NOT EXISTS idx_crisis_resources_type ON crisis_resources(resource_type);
CREATE INDEX IF NOT EXISTS idx_crisis_referrals_case ON crisis_referrals(crisis_case_id);
CREATE INDEX IF NOT EXISTS idx_crisis_recovery_milestones_case ON crisis_recovery_milestones(crisis_case_id);

-- Seed data for crisis resources
INSERT INTO crisis_resources (
    church_id, resource_name, resource_type, resource_category,
    contact_name, phone_number, email, services_provided, is_active
) VALUES
(1, 'Local Crisis Hotline', 'counseling', 'national', 'Crisis Support', '988', 'support@988.org', '24/7 crisis counseling and suicide prevention', TRUE),
(1, 'Community Mental Health Center', 'counseling', 'local', 'Mental Health Services', '(555) 123-4567', 'info@communitymh.org', 'Individual and group counseling, psychiatric services', TRUE),
(1, 'Family Support Services', 'social_services', 'local', 'Family Services', '(555) 987-6543', 'help@familysupport.org', 'Family counseling, parenting support, crisis intervention', TRUE),
(1, 'Legal Aid Society', 'legal', 'local', 'Legal Aid', '(555) 456-7890', 'aid@legalaid.org', 'Free legal assistance for low-income individuals', TRUE),
(1, 'Church Counseling Ministry', 'counseling', 'church', 'Pastor John', '(555) 234-5678', 'pastor@church.org', 'Pastoral counseling and spiritual guidance', TRUE);

-- ============================================
-- 12. AUTOMATED REPORTING - CONSOLIDATED MONTHLY REPORTS
-- ============================================

-- Report Templates
CREATE TABLE IF NOT EXISTS report_templates (
    id SERIAL PRIMARY KEY,
    church_id INTEGER NOT NULL REFERENCES churches(id) ON DELETE CASCADE,

    template_name VARCHAR(200) NOT NULL,
    template_type VARCHAR(50) DEFAULT 'monthly', -- monthly, quarterly, annual, custom
    description TEXT,

    -- Report Structure
    report_sections JSONB DEFAULT '[]', -- array of section objects
    default_filters JSONB DEFAULT '{}', -- default filter settings

    -- Generation Settings
    auto_generate BOOLEAN DEFAULT FALSE,
    generation_schedule VARCHAR(50), -- monthly, quarterly, annually
    generation_day INTEGER DEFAULT 1, -- day of month/quarter to generate

    -- Recipients
    email_recipients JSONB DEFAULT '[]', -- array of email addresses
    notification_recipients JSONB DEFAULT '[]', -- array of member IDs

    -- Template Status
    is_active BOOLEAN DEFAULT TRUE,
    last_generated TIMESTAMP WITH TIME ZONE,
    created_by INTEGER REFERENCES members(id) ON DELETE SET NULL,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Generated Reports
CREATE TABLE IF NOT EXISTS generated_reports (
    id SERIAL PRIMARY KEY,
    church_id INTEGER NOT NULL REFERENCES churches(id) ON DELETE CASCADE,

    template_id INTEGER REFERENCES report_templates(id) ON DELETE SET NULL,
    report_name VARCHAR(200) NOT NULL,
    report_type VARCHAR(50) DEFAULT 'monthly', -- monthly, quarterly, annual, custom

    -- Report Period
    report_period_start DATE NOT NULL,
    report_period_end DATE NOT NULL,
    generated_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Report Data
    report_data JSONB DEFAULT '{}', -- consolidated report data
    executive_summary TEXT,
    key_insights TEXT,

    -- File Storage
    file_path TEXT, -- path to generated file
    file_format VARCHAR(20) DEFAULT 'pdf', -- pdf, excel, html
    file_size INTEGER, -- in bytes

    -- Status and Delivery
    generation_status VARCHAR(30) DEFAULT 'pending', -- pending, generating, completed, failed
    delivery_status VARCHAR(30) DEFAULT 'pending', -- pending, sent, failed
    error_message TEXT,

    -- Recipients
    email_recipients JSONB DEFAULT '[]',
    emails_sent INTEGER DEFAULT 0,

    generated_by INTEGER REFERENCES members(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Report Metrics Cache (for faster report generation)
CREATE TABLE IF NOT EXISTS report_metrics_cache (
    id SERIAL PRIMARY KEY,
    church_id INTEGER NOT NULL REFERENCES churches(id) ON DELETE CASCADE,

    metric_key VARCHAR(100) NOT NULL,
    metric_period DATE NOT NULL, -- first day of the period this metric covers
    period_type VARCHAR(20) DEFAULT 'monthly', -- daily, weekly, monthly, quarterly, annual

    metric_value JSONB NOT NULL,
    calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(church_id, metric_key, metric_period, period_type)
);

-- Report Sections Configuration
CREATE TABLE IF NOT EXISTS report_section_configs (
    id SERIAL PRIMARY KEY,
    church_id INTEGER NOT NULL REFERENCES churches(id) ON DELETE CASCADE,

    section_name VARCHAR(100) NOT NULL,
    section_type VARCHAR(50) NOT NULL, -- giving, attendance, growth, health, etc.
    display_order INTEGER DEFAULT 0,

    -- Data Source Configuration
    data_source VARCHAR(100), -- table name or API endpoint
    data_filters JSONB DEFAULT '{}',
    calculation_method VARCHAR(50), -- sum, count, average, percentage, etc.

    -- Display Configuration
    chart_type VARCHAR(30), -- bar, line, pie, table, metric
    show_trend BOOLEAN DEFAULT FALSE,
    show_comparison BOOLEAN DEFAULT FALSE,
    comparison_period VARCHAR(20), -- previous_month, previous_year, etc.

    -- Formatting
    number_format VARCHAR(20) DEFAULT 'decimal', -- decimal, currency, percentage
    date_format VARCHAR(20) DEFAULT 'short',
    color_scheme VARCHAR(30),

    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Seed data for report templates and sections
INSERT INTO report_templates (
    church_id, template_name, template_type, description,
    report_sections, auto_generate, generation_schedule, generation_day,
    email_recipients, is_active
) VALUES (
    1,
    'Monthly Ministry Overview',
    'monthly',
    'Comprehensive monthly report covering all ministry areas',
    '[
        {"name": "Executive Summary", "type": "summary", "order": 1},
        {"name": "Giving & Finances", "type": "finance", "order": 2},
        {"name": "Attendance & Growth", "type": "attendance", "order": 3},
        {"name": "Cell Ministry Health", "type": "cells", "order": 4},
        {"name": "Leadership Development", "type": "leadership", "order": 5},
        {"name": "Discipleship & Spiritual Growth", "type": "discipleship", "order": 6},
        {"name": "Community & Relationships", "type": "community", "order": 7}
    ]'::jsonb,
    TRUE,
    'monthly',
    1,
    '["pastor@church.org", "admin@church.org"]'::jsonb,
    TRUE
);

INSERT INTO report_section_configs (
    church_id, section_name, section_type, display_order,
    data_source, calculation_method, chart_type, show_trend, is_active
) VALUES
(1, 'Total Giving', 'giving', 1, 'giving_log', 'sum', 'metric', TRUE, TRUE),
(1, 'Active Givers', 'giving', 2, 'giving_log', 'count_distinct', 'metric', TRUE, TRUE),
(1, 'Monthly Attendance', 'attendance', 3, 'cell_performance_metrics', 'sum', 'line', TRUE, TRUE),
(1, 'New Conversions', 'growth', 4, 'cell_performance_metrics', 'sum', 'bar', TRUE, TRUE),
(1, 'Cell Health Scores', 'cells', 5, 'cell_health_assessments', 'average', 'gauge', TRUE, TRUE),
(1, 'Leadership Pipeline', 'leadership', 6, 'leadership_pipeline', 'count', 'pie', FALSE, TRUE),
(1, 'Burnout Risk Levels', 'wellness', 7, 'burnout_assessments', 'count_by_risk', 'bar', FALSE, TRUE),
(1, 'Spiritual Disciplines', 'discipleship', 8, 'spiritual_disciplines', 'percentage', 'line', TRUE, TRUE);

-- Exit Audit Log for comprehensive change tracking
CREATE TABLE IF NOT EXISTS exit_audit_log (
    id SERIAL PRIMARY KEY,
    church_id INTEGER NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
    exit_id INTEGER REFERENCES inactive_member_exits(id) ON DELETE CASCADE,
    member_id INTEGER REFERENCES members(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL, -- 'created', 'updated', 'deleted', 'reinstated', 'interview_created', etc.
    old_data JSONB,
    new_data JSONB,
    changed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_exit_audit_log_church_id ON exit_audit_log(church_id);
CREATE INDEX IF NOT EXISTS idx_exit_audit_log_exit_id ON exit_audit_log(exit_id);
CREATE INDEX IF NOT EXISTS idx_exit_audit_log_member_id ON exit_audit_log(member_id);
CREATE INDEX IF NOT EXISTS idx_exit_audit_log_action ON exit_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_exit_audit_log_created_at ON exit_audit_log(created_at);

-- Add interview_type to exit_interviews if it doesn't exist
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'exit_interviews' AND column_name = 'interview_type') THEN
        ALTER TABLE exit_interviews ADD COLUMN interview_type VARCHAR(50) DEFAULT 'exit';
    END IF;
END $$;

-- ============================================
-- 6. MEMBER RELATIONSHIPS & DEPARTMENTS
-- ============================================

-- Departments: organizational units (e.g., Worship, Kids, Admin)
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

-- Ensure case-insensitive uniqueness on department name per church
CREATE UNIQUE INDEX IF NOT EXISTS ux_departments_church_id_lower_name ON departments (church_id, LOWER(name));

-- Member assignments to departments (many-to-many with role)
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

-- Explicit member-to-member relationships (spouse, parent, child, guardian, etc.)
CREATE TABLE IF NOT EXISTS member_relationships (
    id SERIAL PRIMARY KEY,
    church_id INTEGER NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
    member_id INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    related_member_id INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    relationship_type VARCHAR(100), -- spouse, parent, child, sibling, guardian, etc.
    is_primary BOOLEAN DEFAULT FALSE,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_by INTEGER REFERENCES members(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (member_id, related_member_id, relationship_type)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_departments_church_id ON departments(church_id);
CREATE INDEX IF NOT EXISTS idx_member_departments_member_id ON member_departments(member_id);
CREATE INDEX IF NOT EXISTS idx_member_departments_department_id ON member_departments(department_id);
CREATE INDEX IF NOT EXISTS idx_member_relationships_member_id ON member_relationships(member_id);
CREATE INDEX IF NOT EXISTS idx_member_relationships_related_member_id ON member_relationships(related_member_id);

-- Seed some common relationship types
INSERT INTO lookups (category, name, value, display_order) VALUES
('relationship_type', 'Spouse', 'spouse', 1),
('relationship_type', 'Parent', 'parent', 2),
('relationship_type', 'Child', 'child', 3),
('relationship_type', 'Sibling', 'sibling', 4),
('relationship_type', 'Guardian', 'guardian', 5)
ON CONFLICT (category, name) DO NOTHING;
