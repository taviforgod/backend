-- PRAYER REQUESTS
CREATE TABLE prayer_requests (
    id SERIAL PRIMARY KEY,
    request_no VARCHAR(50) UNIQUE NOT NULL,
    member_id INT REFERENCES members(id) ON DELETE SET NULL,
    church_id INT NOT NULL,
    created_by INT REFERENCES users(id) ON DELETE SET NULL,
    category VARCHAR(100),
    sub_category VARCHAR(100),
    urgency VARCHAR(20) DEFAULT 'normal', -- normal | urgent
    preferred_contact_method VARCHAR(50),
    contact_details VARCHAR(255),
    description TEXT,
    confidentiality BOOLEAN DEFAULT TRUE,
    status VARCHAR(20) DEFAULT 'open', -- open | in_progress | closed
    outcome VARCHAR(50),               -- answered | referred | not_applicable
    resolution_notes TEXT,
    assigned_to INT REFERENCES members(id) ON DELETE SET NULL,
    last_contacted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now()
);

-- PRAYER FOLLOWUPS
CREATE TABLE prayer_followups (
    id SERIAL PRIMARY KEY,
    prayer_request_id INT NOT NULL REFERENCES prayer_requests(id) ON DELETE CASCADE,
    note TEXT NOT NULL,
    contacted_by INT REFERENCES users(id) ON DELETE SET NULL,
    method VARCHAR(50),
    contacted_at TIMESTAMP DEFAULT now(),
    created_at TIMESTAMP DEFAULT now()
);

-- PRAYER AUDIT LOGS
CREATE TABLE prayer_audit_logs (
    id SERIAL PRIMARY KEY,
    prayer_request_id INT NOT NULL REFERENCES prayer_requests(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL,       -- e.g., created, assigned, followup_added, closed
    details JSONB,
    performed_by INT REFERENCES users(id) ON DELETE SET NULL,
    performed_at TIMESTAMP DEFAULT now()
);
