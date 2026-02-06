-- add flags and history table
ALTER TABLE members
  ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id);

ALTER TABLE members
  ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS status_changed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS status_changed_by INTEGER REFERENCES users(id);

CREATE TABLE IF NOT EXISTS member_status_history (
  id SERIAL PRIMARY KEY,
  church_id INT NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  member_id INT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  old_member_status_id INTEGER REFERENCES member_statuses(id),
  new_member_status_id INTEGER REFERENCES member_statuses(id),
  reason TEXT,
  changed_by INTEGER REFERENCES users(id),
  changed_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_member_status_hist_member ON member_status_history (member_id, changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_member_status_hist_church ON member_status_history (church_id);
