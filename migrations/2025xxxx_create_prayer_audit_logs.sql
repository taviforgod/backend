-- Migration: create_prayer_audit_logs.sql
CREATE TABLE IF NOT EXISTS prayer_audit_logs (
  id SERIAL PRIMARY KEY,
  prayer_request_id INTEGER NOT NULL REFERENCES prayer_requests(id) ON DELETE CASCADE,
  action VARCHAR(80) NOT NULL,
  details JSONB NULL,
  performed_by INTEGER NULL,
  performed_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_prayer_audit_prayer ON prayer_audit_logs (prayer_request_id);
CREATE INDEX IF NOT EXISTS idx_prayer_audit_action ON prayer_audit_logs (action);
