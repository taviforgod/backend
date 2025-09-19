-- 0001_create_notifications.sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS in_app_notifications (
  id SERIAL PRIMARY KEY,
  church_id INTEGER NOT NULL,
  user_id INTEGER NULL,
  member_id INTEGER NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  channel VARCHAR(32) DEFAULT 'in_app' NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_church_created ON in_app_notifications (church_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON in_app_notifications (user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_member ON in_app_notifications (member_id);

CREATE TABLE IF NOT EXISTS notification_preferences (
  id SERIAL PRIMARY KEY,
  church_id INTEGER NOT NULL,
  member_id INTEGER NULL,
  user_id INTEGER NULL,
  channels JSONB DEFAULT jsonb_build_object('in_app', true, 'email', true, 'sms', false, 'whatsapp', false),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_prefs_church_member ON notification_preferences (church_id, member_id);
CREATE INDEX IF NOT EXISTS idx_prefs_church_user ON notification_preferences (church_id, user_id);

CREATE TABLE IF NOT EXISTS notification_rate_limits_log (
  id SERIAL PRIMARY KEY,
  church_id INTEGER NOT NULL,
  user_id INTEGER NULL,
  window_start TIMESTAMPTZ NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);


CREATE TABLE notifications (
  id SERIAL PRIMARY KEY,
  church_id INT NOT NULL,
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT now()
);
