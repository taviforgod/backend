-- migrations/20250919_evangelism_contacts.sql
BEGIN;

CREATE TABLE IF NOT EXISTS evangelism_contacts (
  id SERIAL PRIMARY KEY,
  church_id INT NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  first_name VARCHAR(120),
  surname VARCHAR(120),
  contact_primary VARCHAR(64),
  contact_secondary VARCHAR(64),
  email VARCHAR(255),
  area VARCHAR(255),
  latitude NUMERIC,
  longitude NUMERIC,
  date_contacted DATE DEFAULT NOW(),
  response VARCHAR(32),
  assigned_to_user_id INT REFERENCES users(id),
  notes TEXT,
  status VARCHAR(32) DEFAULT 'open',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE visitors ADD COLUMN IF NOT EXISTS evangelism_contact_id INT REFERENCES evangelism_contacts(id);
ALTER TABLE members ADD COLUMN IF NOT EXISTS evangelism_contact_id INT REFERENCES evangelism_contacts(id);

CREATE INDEX IF NOT EXISTS idx_evangelism_church_id ON evangelism_contacts (church_id);

COMMIT;