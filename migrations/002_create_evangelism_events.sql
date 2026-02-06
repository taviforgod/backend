-- backend/migrations/002_create_evangelism_events.sql
CREATE TABLE IF NOT EXISTS evangelism_events (
  id SERIAL PRIMARY KEY,
  church_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  event_date TIMESTAMP,
  location VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
