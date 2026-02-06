-- Migration: create_prayer_requests.sql
CREATE TABLE IF NOT EXISTS prayer_requests (
  id SERIAL PRIMARY KEY,
  request_no VARCHAR(40) UNIQUE NOT NULL,
  member_id INTEGER REFERENCES members(id) ON DELETE SET NULL,
  church_id INTEGER NOT NULL,
  created_by INTEGER NULL,
  assigned_to INTEGER NULL,
  category VARCHAR(100),
  sub_category VARCHAR(150),
  urgency VARCHAR(20) DEFAULT 'normal',
  preferred_contact_method VARCHAR(50),
  contact_details TEXT,
  description TEXT,
  status VARCHAR(20) DEFAULT 'open',
  outcome TEXT,
  confidentiality BOOLEAN DEFAULT true,
  resolution_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  last_contacted_at TIMESTAMP WITH TIME ZONE NULL
);

-- Ensure member_id exists on older DBs where table may exist without the column
ALTER TABLE prayer_requests ADD COLUMN IF NOT EXISTS member_id INTEGER REFERENCES members(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS prayer_followups (
  id SERIAL PRIMARY KEY,
  prayer_request_id INTEGER NOT NULL REFERENCES prayer_requests(id) ON DELETE CASCADE,
  note TEXT NOT NULL,
  contacted_by INTEGER NULL,
  method VARCHAR(50),
  contacted_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_prayer_church_status ON prayer_requests (church_id, status);
CREATE INDEX IF NOT EXISTS idx_prayer_member ON prayer_requests (member_id);
CREATE INDEX IF NOT EXISTS idx_prayer_assigned ON prayer_requests (assigned_to); 
