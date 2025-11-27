-- =========================
--  1. CHURCHES & USERS TABLES (minimal for references)
-- =========================
CREATE TABLE IF NOT EXISTS churches (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  church_id INTEGER REFERENCES churches(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT
);

CREATE TABLE IF NOT EXISTS members (
  id SERIAL PRIMARY KEY,
  church_id INTEGER REFERENCES churches(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT
);

-- =========================
--  2. IN-APP NOTIFICATIONS
-- =========================
CREATE TABLE IF NOT EXISTS in_app_notifications (
  id SERIAL PRIMARY KEY,
  church_id INTEGER NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  member_id INTEGER REFERENCES members(id) ON DELETE SET NULL,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  channel VARCHAR(24) NOT NULL DEFAULT 'in_app',
  metadata JSONB,
  read BOOLEAN NOT NULL DEFAULT FALSE,
  read_at TIMESTAMP,
  starred BOOLEAN NOT NULL DEFAULT FALSE,
  link TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ==========================
--  3. EMAIL/SMS/WHATSAPP LOGS
-- ==========================
CREATE TABLE IF NOT EXISTS notification_logs (
  id SERIAL PRIMARY KEY,
  church_id INTEGER NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  notification_id INTEGER REFERENCES in_app_notifications(id) ON DELETE CASCADE,
  channel VARCHAR(24) NOT NULL,
  status VARCHAR(24) NOT NULL DEFAULT 'sent',
  sender_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  recipient_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  recipient_member_id INTEGER REFERENCES members(id) ON DELETE SET NULL,
  response JSONB,
  error TEXT,
  sent_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ===============
--  4. REMINDERS/JOBS
-- ===============
CREATE TABLE IF NOT EXISTS notification_jobs (
  id SERIAL PRIMARY KEY,
  church_id INTEGER NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  job_type VARCHAR(32) NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  schedule TEXT,
  next_run TIMESTAMP,
  last_run TIMESTAMP,
  status VARCHAR(24) NOT NULL DEFAULT 'active',
  config JSONB,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ====================
--  5. USER PREFERENCES
-- ====================
CREATE TABLE IF NOT EXISTS user_notification_preferences (
  id SERIAL PRIMARY KEY,
  church_id INTEGER NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  member_id INTEGER REFERENCES members(id) ON DELETE SET NULL,
  channels JSONB NOT NULL DEFAULT '{"in_app":true,"email":true,"sms":false,"whatsapp":false}',
  digest_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  quiet_hours JSONB,
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ==============
--  6. NOTIFICATION TEMPLATES
-- ==============
CREATE TABLE IF NOT EXISTS notification_templates (
  id SERIAL PRIMARY KEY,
  church_id INTEGER NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  name VARCHAR(60) NOT NULL,
  channel VARCHAR(24) NOT NULL,
  subject TEXT,
  body TEXT NOT NULL,
  description TEXT,
  config JSONB,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ================
--  7. MESSAGE BOARD
-- ================
CREATE TABLE IF NOT EXISTS message_board_posts (
  id SERIAL PRIMARY KEY,
  church_id INTEGER NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  member_id INTEGER REFERENCES members(id) ON DELETE SET NULL,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  starred BOOLEAN NOT NULL DEFAULT FALSE,
  metadata JSONB,
  link TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- =============
-- IDX/Optimizations
-- =============
CREATE INDEX IF NOT EXISTS idx_in_app_notif_church_user ON in_app_notifications (church_id, user_id, member_id, channel, read, starred);
CREATE INDEX IF NOT EXISTS idx_notifications_logs_church ON notification_logs (church_id, channel, status);
CREATE INDEX IF NOT EXISTS idx_user_prefs_church_user ON user_notification_preferences (church_id, user_id, member_id);
CREATE INDEX IF NOT EXISTS idx_mb_posts_church ON message_board_posts (church_id, user_id, member_id, starred);