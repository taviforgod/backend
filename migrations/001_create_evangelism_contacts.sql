-- backend/migrations/001_create_evangelism_contacts.sql
CREATE TABLE IF NOT EXISTS evangelism_contacts (
  id SERIAL PRIMARY KEY,
  church_id INT NOT NULL,
  first_name VARCHAR(100),
  surname VARCHAR(100),
  phone VARCHAR(50),
  whatsapp VARCHAR(50),
  email VARCHAR(255),
  area VARCHAR(255),
  lat NUMERIC,
  lon NUMERIC,
  contact_date DATE,
  contacted_by_user_id INT,
  how_met VARCHAR(100),
  response VARCHAR(50),
  notes TEXT,
  assigned_cell_group_id INT,
  next_follow_up_date DATE,
  assigned_to_user_id INT,
  tags TEXT[],
  status VARCHAR(50) DEFAULT 'new',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
ALTER TABLE evangelism_contacts ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT FALSE;