-- Add table to store approval requests and decisions for leadership readiness
CREATE TABLE IF NOT EXISTS leadership_readiness_approvals (
  id SERIAL PRIMARY KEY,
  church_id INTEGER NOT NULL,
  leader_id INTEGER NOT NULL,
  actor_id INTEGER, -- user who performed the action (requester or approver)
  action VARCHAR(32) NOT NULL, -- 'requested', 'approved', 'rejected'
  reason TEXT,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT (NOW())
);

CREATE INDEX IF NOT EXISTS idx_leadership_readiness_approvals_church_leader ON leadership_readiness_approvals (church_id, leader_id);
