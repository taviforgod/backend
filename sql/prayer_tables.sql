-- PRAYER TABLES (ESM)
CREATE TABLE IF NOT EXISTS prayer_requests (
  id SERIAL PRIMARY KEY,
  request_no VARCHAR(32),
  church_id INTEGER NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  created_by_member_id INTEGER REFERENCES members(id) ON DELETE SET NULL,
  assigned_to INTEGER REFERENCES members(id) ON DELETE SET NULL,
  category VARCHAR(100),
  sub_category VARCHAR(100),
  urgency VARCHAR(32) DEFAULT 'normal',
  preferred_contact_method VARCHAR(50),
  contact_details JSONB DEFAULT '{}'::jsonb,
  description TEXT,
  confidential BOOLEAN DEFAULT FALSE,
  metadata JSONB DEFAULT '{}'::jsonb,
  status VARCHAR(50) DEFAULT 'open',
  last_contacted_at TIMESTAMP WITH TIME ZONE,
  closed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS prayer_followups (
  id SERIAL PRIMARY KEY,
  church_id INTEGER NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  prayer_id INTEGER NOT NULL REFERENCES prayer_requests(id) ON DELETE CASCADE,
  created_by_member_id INTEGER REFERENCES members(id) ON DELETE SET NULL,
  note TEXT NOT NULL,
  method VARCHAR(50),
  contacted_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS prayer_audits (
  id SERIAL PRIMARY KEY,
  prayer_id INTEGER NOT NULL REFERENCES prayer_requests(id) ON DELETE CASCADE,
  action VARCHAR(64) NOT NULL,
  payload JSONB DEFAULT '{}'::jsonb,
  performed_by_member_id INTEGER REFERENCES members(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
