import db from './config/db.js';

async function run() {
  const sql = `
CREATE TABLE IF NOT EXISTS leadership_pipeline (
    id SERIAL PRIMARY KEY,
    church_id INTEGER NOT NULL REFERENCES churches(id) ON DELETE CASCADE,

    member_id INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    current_role VARCHAR(50),

    -- Development Stage
    development_stage VARCHAR(30) DEFAULT 'potential',
    development_start_date DATE,

    -- Skills Assessment (1-10 scale)
    leadership_potential INTEGER DEFAULT 5,
    teaching_ability INTEGER DEFAULT 5,
    evangelism_skills INTEGER DEFAULT 5,
    discipleship_capability INTEGER DEFAULT 5,
    administrative_skills INTEGER DEFAULT 5,

    -- Training Progress
    training_completed TEXT,
    training_needed TEXT,
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
`;

  try {
    const res = await db.query(sql);
    console.log('OK:', res.command || res.rowCount);
  } catch (err) {
    console.error('ERROR running leadership_pipeline create:', err.message);
  } finally {
    process.exit(0);
  }
}

run();
