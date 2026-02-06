-- 1002_fix_notifications_groups.sql
-- Create/repair notifications-related tables safely and add FK to groups only if groups exists

-- notification_templates (safe create/alter)
CREATE TABLE IF NOT EXISTS notification_templates (
  id SERIAL PRIMARY KEY,
  church_id INTEGER REFERENCES churches(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  subject TEXT,
  body TEXT NOT NULL,
  channel VARCHAR(32) NOT NULL,
  description TEXT,
  variables JSONB DEFAULT '[]',
  is_default BOOLEAN DEFAULT FALSE,
  created_by INTEGER REFERENCES members(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notification_templates_church_id ON notification_templates(church_id);

-- notification_recipients (create without group FK initially)
CREATE TABLE IF NOT EXISTS notification_recipients (
  id SERIAL PRIMARY KEY,
  notification_id INTEGER NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  group_id INTEGER,
  recipient_type VARCHAR(16) NOT NULL CHECK (recipient_type IN ('user','group','all'))
);

CREATE INDEX IF NOT EXISTS idx_notification_recipients_user ON notification_recipients(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_recipients_group ON notification_recipients(group_id);

-- notification_deliveries
CREATE TABLE IF NOT EXISTS notification_deliveries (
  id SERIAL PRIMARY KEY,
  notification_id INTEGER NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  channel VARCHAR(32) NOT NULL,
  delivery_status VARCHAR(24) NOT NULL DEFAULT 'pending',
  delivered_at TIMESTAMP,
  error_message TEXT
);

CREATE INDEX IF NOT EXISTS idx_notification_deliveries_user ON notification_deliveries(user_id);

-- user_notification_preferences
CREATE TABLE IF NOT EXISTS user_notification_preferences (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  channel VARCHAR(32) NOT NULL,
  notification_type VARCHAR(40),
  group_id INTEGER,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE (user_id, channel, notification_type, group_id)
);

-- If the groups table exists in this DB, add foreign key constraints for group_id columns
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='groups') THEN
    -- add FK on notification_recipients.group_id if not present
    BEGIN
      ALTER TABLE notification_recipients
        ADD CONSTRAINT fk_notification_recipients_group FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;

    -- add FK on user_notification_preferences.group_id if not present
    BEGIN
      ALTER TABLE user_notification_preferences
        ADD CONSTRAINT fk_user_notification_preferences_group FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END IF;
END $$;
