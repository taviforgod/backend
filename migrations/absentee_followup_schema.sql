-- ============================================
-- Absentee Follow-Up System
-- ============================================

-- Main absentee follow-up table
CREATE TABLE IF NOT EXISTS absentee_followups (
    id SERIAL PRIMARY KEY,

    -- Links to the original absence
    church_id INTEGER NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
    weekly_report_id INTEGER REFERENCES weekly_reports(id) ON DELETE CASCADE,
    member_id INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,

    -- Absence details
    absence_date DATE NOT NULL,
    consecutive_absences INTEGER DEFAULT 1,
    reported_reason VARCHAR(100), -- sick, travel, work, unknown, etc.
    priority_level VARCHAR(20) DEFAULT 'normal', -- low, normal, high, urgent

    -- Follow-up assignment
    assigned_to INTEGER REFERENCES members(id) ON DELETE SET NULL,
    assigned_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    due_date DATE,

    -- Contact attempts and responses
    contact_attempts JSONB DEFAULT '[]'::jsonb, -- Array of contact attempt records

    -- Current status
    status VARCHAR(50) DEFAULT 'pending', -- pending, contacted, resolved, escalated, inactive
    last_contact_date TIMESTAMP WITH TIME ZONE,
    last_response VARCHAR(500),

    -- Member's situation/needs identified
    identified_needs JSONB DEFAULT '[]'::jsonb, -- Array of identified needs/issues
    recommended_actions JSONB DEFAULT '[]'::jsonb, -- Suggested follow-up actions

    -- Resolution details
    resolution_date TIMESTAMP WITH TIME ZONE,
    resolution_notes TEXT,
    resolution_type VARCHAR(100), -- reconciled, transferred, inactive, deceased, etc.

    -- Follow-up schedule
    next_followup_date DATE,
    followup_frequency VARCHAR(50), -- weekly, biweekly, monthly, as_needed

    -- Audit fields (using members since everything is member-based)
    created_by INTEGER REFERENCES members(id) ON DELETE SET NULL,
    updated_by INTEGER REFERENCES members(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Contact attempts log (more detailed than JSONB)
CREATE TABLE IF NOT EXISTS absentee_contact_attempts (
    id SERIAL PRIMARY KEY,
    followup_id INTEGER NOT NULL REFERENCES absentee_followups(id) ON DELETE CASCADE,

    contact_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    contact_method VARCHAR(50) NOT NULL, -- phone, whatsapp, visit, sms, email
    contact_person INTEGER REFERENCES members(id) ON DELETE SET NULL,

    contact_success BOOLEAN DEFAULT FALSE,
    response_received VARCHAR(500),
    notes TEXT,

    created_by INTEGER REFERENCES members(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Absentee follow-up templates
CREATE TABLE IF NOT EXISTS absentee_followup_templates (
    id SERIAL PRIMARY KEY,
    church_id INTEGER NOT NULL REFERENCES churches(id) ON DELETE CASCADE,

    name VARCHAR(200) NOT NULL,
    description TEXT,

    -- Default settings for this template
    default_priority VARCHAR(20) DEFAULT 'normal',
    default_frequency VARCHAR(50) DEFAULT 'weekly',
    default_actions JSONB DEFAULT '[]'::jsonb,

    -- Template for notifications
    notification_subject TEXT,
    notification_body TEXT,

    is_active BOOLEAN DEFAULT TRUE,
    created_by INTEGER REFERENCES members(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(church_id, name)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_absentee_followups_church_id ON absentee_followups(church_id);
CREATE INDEX IF NOT EXISTS idx_absentee_followups_member_id ON absentee_followups(member_id);
CREATE INDEX IF NOT EXISTS idx_absentee_followups_weekly_report_id ON absentee_followups(weekly_report_id);
CREATE INDEX IF NOT EXISTS idx_absentee_followups_status ON absentee_followups(status);
CREATE INDEX IF NOT EXISTS idx_absentee_followups_assigned_to ON absentee_followups(assigned_to);
CREATE INDEX IF NOT EXISTS idx_absentee_followups_due_date ON absentee_followups(due_date);
CREATE INDEX IF NOT EXISTS idx_absentee_followups_next_followup_date ON absentee_followups(next_followup_date);

CREATE INDEX IF NOT EXISTS idx_absentee_contact_attempts_followup_id ON absentee_contact_attempts(followup_id);
CREATE INDEX IF NOT EXISTS idx_absentee_contact_attempts_contact_date ON absentee_contact_attempts(contact_date);

CREATE INDEX IF NOT EXISTS idx_absentee_followup_templates_church_id ON absentee_followup_templates(church_id);

-- ============================================
-- Seed Data for Absentee Follow-Up System
-- ============================================

-- Default follow-up templates
INSERT INTO absentee_followup_templates (church_id, name, description, default_priority, default_frequency, default_actions, is_active, created_by) VALUES
(1, 'Standard Follow-up', 'Regular follow-up for normal absences', 'normal', 'weekly', '["phone_call", "whatsapp_message"]', true, NULL),
(1, 'High Priority Follow-up', 'Urgent follow-up for concerning absences', 'high', 'as_needed', '["visit_home", "phone_call", "whatsapp_message"]', true, NULL),
(1, 'New Convert Care', 'Special care for new believers who are absent', 'high', 'weekly', '["phone_call", "whatsapp_message", "visit_home"]', true, NULL);

-- Update notification templates to include absentee follow-up
INSERT INTO notification_templates (church_id, name, channel, subject, body, description, variables, is_default, created_by) VALUES
(1, 'Absentee Follow-up Assignment', 'email', 'Follow-up Assignment: {{member_name}}', '<h2>Follow-up Assignment</h2><p>Dear {{assignee_name}},</p><p>You have been assigned to follow up with <strong>{{member_name}}</strong> who has been absent for {{consecutive_absences}} consecutive meetings.</p><p><strong>Last attendance:</strong> {{last_attendance_date}}</p><p><strong>Reason:</strong> {{reported_reason}}</p><p><strong>Due date:</strong> {{due_date}}</p><p>Please contact them using the preferred method and update the follow-up record.</p><p>Cell Leader: {{cell_leader_name}}</p>', 'Email notification for follow-up assignments', '["assignee_name", "member_name", "consecutive_absences", "last_attendance_date", "reported_reason", "due_date", "cell_leader_name"]', true, NULL),

(1, 'Absentee Follow-up Reminder', 'email', 'REMINDER: Pending Follow-up for {{member_name}}', '<h2>Follow-up Reminder</h2><p>Dear {{assignee_name}},</p><p>This is a reminder that you have a pending follow-up for <strong>{{member_name}}</strong>.</p><p><strong>Status:</strong> {{status}}</p><p><strong>Due date:</strong> {{due_date}}</p><p><strong>Last contact:</strong> {{last_contact_date}}</p><p>Please complete this follow-up as soon as possible.</p><p>Cell Leader: {{cell_leader_name}}</p>', 'Reminder for pending follow-ups', '["assignee_name", "member_name", "status", "due_date", "last_contact_date", "cell_leader_name"]', true, NULL),

(1, 'Overdue Absentee Alert', 'email', 'OVERDUE: Urgent Follow-up Required for {{member_name}}', '<h2>Urgent: Overdue Follow-up</h2><p>Dear {{cell_leader_name}},</p><p>The follow-up for <strong>{{member_name}}</strong> is now OVERDUE.</p><p><strong>Originally due:</strong> {{due_date}}</p><p><strong>Days overdue:</strong> {{days_overdue}}</p><p><strong>Assigned to:</strong> {{assignee_name}}</p><p>Please ensure this follow-up is completed urgently.</p><p>Cell Leader: {{cell_leader_name}}</p>', 'Alert for overdue follow-ups', '["cell_leader_name", "member_name", "due_date", "days_overdue", "assignee_name"]', true, NULL);