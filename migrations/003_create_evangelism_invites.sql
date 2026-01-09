-- backend/migrations/003_create_evangelism_invites.sql
CREATE TABLE IF NOT EXISTS evangelism_invites (
  id SERIAL PRIMARY KEY,
  event_id INT REFERENCES evangelism_events(id) ON DELETE CASCADE,
  contact_id INT REFERENCES evangelism_contacts(id) ON DELETE CASCADE,
  invited_by_user_id INT,
  response VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW()
);
