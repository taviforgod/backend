-- USERS and GROUPS must exist already.

CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255),
  message TEXT NOT NULL,
  type VARCHAR(32), -- e.g. 'alert', 'reminder', 'digest'
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  scheduled_for TIMESTAMP,
  is_broadcast BOOLEAN NOT NULL DEFAULT FALSE,
  template VARCHAR(100),
  channel VARCHAR(32), -- 'email','sms','whatsapp','inapp','all'
  meta JSONB
);

CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

CREATE TABLE IF NOT EXISTS notification_recipients (
  id SERIAL PRIMARY KEY,
  notification_id INTEGER NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  group_id INTEGER REFERENCES groups(id) ON DELETE CASCADE,
  recipient_type VARCHAR(16) NOT NULL CHECK (recipient_type IN ('user','group','all'))
);

CREATE INDEX IF NOT EXISTS idx_notification_recipients_user ON notification_recipients(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_recipients_group ON notification_recipients(group_id);

CREATE TABLE IF NOT EXISTS notification_deliveries (
  id SERIAL PRIMARY KEY,
  notification_id INTEGER NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  channel VARCHAR(32) NOT NULL, -- 'email','inapp','sms','whatsapp'
  delivery_status VARCHAR(24) NOT NULL DEFAULT 'pending', -- sent/failed/read
  delivered_at TIMESTAMP,
  error_message TEXT
);

CREATE INDEX IF NOT EXISTS idx_notification_deliveries_user ON notification_deliveries(user_id);

CREATE TABLE IF NOT EXISTS user_notification_preferences (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  channel VARCHAR(32) NOT NULL, -- 'email','inapp','sms','whatsapp'
  notification_type VARCHAR(40), -- NULL = all types
  group_id INTEGER REFERENCES groups(id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE (user_id, channel, notification_type, group_id)
);

CREATE TABLE IF NOT EXISTS notification_templates (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  subject_template TEXT,
  body_template TEXT,
  channel VARCHAR(32) NOT NULL, -- 'email','sms','whatsapp','inapp'
  created_by INTEGER REFERENCES users(id)
);