CREATE TABLE IF NOT EXISTS crisis_followups (
  id SERIAL PRIMARY KEY,
  church_id INTEGER NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  member_id INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  reported_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  date_reported DATE NOT NULL DEFAULT CURRENT_DATE,
  crisis_type VARCHAR(100) NOT NULL,             -- e.g., illness, bereavement, addiction
  emotional_state VARCHAR(50),                   -- stable / anxious / depressed
  support_provided TEXT,                         -- narrative log
  external_referral TEXT,                        -- e.g., referred to pastor
  followup_person_id INTEGER REFERENCES members(id) ON DELETE SET NULL,
  followup_frequency VARCHAR(50),                -- daily / weekly / monthly
  recovery_progress INTEGER CHECK (recovery_progress BETWEEN 1 AND 5),
  comments TEXT,
  next_followup_date DATE,
  is_active BOOLEAN DEFAULT TRUE,
  closed_date DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_crisis_followups_church ON crisis_followups(church_id);
CREATE INDEX IF NOT EXISTS idx_crisis_followups_active ON crisis_followups(is_active);

-- Create inactive_member_exits table
CREATE TABLE IF NOT EXISTS inactive_member_exits (
  id SERIAL PRIMARY KEY,
  church_id INTEGER NOT NULL,
  member_id INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  exit_type VARCHAR(50) NOT NULL DEFAULT 'inactive',
  exit_reason TEXT,
  exit_date DATE NOT NULL,
  notes TEXT,
  is_suggestion BOOLEAN DEFAULT TRUE,
  processed_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  soft_deleted BOOLEAN DEFAULT FALSE
);

-- Create exit_interviews table
CREATE TABLE IF NOT EXISTS exit_interviews (
  id SERIAL PRIMARY KEY,
  exit_id INTEGER NOT NULL REFERENCES inactive_member_exits(id) ON DELETE CASCADE,
  member_id INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  church_id INTEGER NOT NULL,
  interviewer_id INTEGER REFERENCES users(id),
  summary TEXT,
  interview_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  soft_deleted BOOLEAN DEFAULT FALSE
);

-- Create exit_interview_answers table
CREATE TABLE IF NOT EXISTS exit_interview_answers (
  id SERIAL PRIMARY KEY,
  interview_id INTEGER NOT NULL REFERENCES exit_interviews(id) ON DELETE CASCADE,
  question_key VARCHAR(100),
  question_text TEXT,
  answer_text TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_inactive_exits_church ON inactive_member_exits(church_id);
CREATE INDEX IF NOT EXISTS idx_inactive_exits_member ON inactive_member_exits(member_id);
CREATE INDEX IF NOT EXISTS idx_exit_interviews_exit ON exit_interviews(exit_id);
CREATE INDEX IF NOT EXISTS idx_exit_interviews_church ON exit_interviews(church_id);
CREATE INDEX IF NOT EXISTS idx_exit_interview_answers_interview ON exit_interview_answers(interview_id);