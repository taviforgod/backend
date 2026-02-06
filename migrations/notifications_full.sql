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
  name VARCHAR(100) NOT NULL,
  channel VARCHAR(32) NOT NULL, -- 'email','sms','whatsapp','inapp'
  subject TEXT,
  body TEXT NOT NULL,
  description TEXT,
  variables JSONB DEFAULT '[]', -- available template variables
  is_default BOOLEAN DEFAULT FALSE,
  created_by INTEGER REFERENCES members(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Ensure table has all required columns (in case it was created by an earlier migration)
ALTER TABLE notification_templates ADD COLUMN IF NOT EXISTS church_id INTEGER REFERENCES churches(id) ON DELETE CASCADE;
ALTER TABLE notification_templates ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE notification_templates ADD COLUMN IF NOT EXISTS variables JSONB DEFAULT '[]';
ALTER TABLE notification_templates ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT FALSE;
ALTER TABLE notification_templates ADD COLUMN IF NOT EXISTS created_at TIMESTAMP NOT NULL DEFAULT NOW();
ALTER TABLE notification_templates ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NOT NULL DEFAULT NOW();

-- Set church_id to 1 for existing records that don't have it (assuming default church)
UPDATE notification_templates SET church_id = 1 WHERE church_id IS NULL;

-- ==============
--  7. NOTIFICATION JOBS
-- ==============
CREATE TABLE IF NOT EXISTS notification_jobs (
  id SERIAL PRIMARY KEY,
  church_id INTEGER NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  type VARCHAR(50) NOT NULL, -- 'reminder', 'digest', 'alert', 'broadcast'
  schedule_cron VARCHAR(100), -- cron expression for recurring jobs
  next_run TIMESTAMP,
  last_run TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE,
  config JSONB, -- job-specific configuration
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ==============
--  8. NOTIFICATION LOGS
-- ==============
CREATE TABLE IF NOT EXISTS notification_logs (
  id SERIAL PRIMARY KEY,
  church_id INTEGER NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  job_id INTEGER REFERENCES notification_jobs(id) ON DELETE SET NULL,
  notification_id INTEGER REFERENCES notifications(id) ON DELETE SET NULL,
  recipient_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  recipient_member_id INTEGER REFERENCES members(id) ON DELETE SET NULL,
  channel VARCHAR(32) NOT NULL,
  status VARCHAR(32) NOT NULL, -- 'pending', 'sent', 'delivered', 'failed', 'read'
  subject TEXT,
  body TEXT,
  error_message TEXT,
  sent_at TIMESTAMP,
  delivered_at TIMESTAMP,
  read_at TIMESTAMP,
  metadata JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ==============
--  9. REMINDERS
-- ==============
CREATE TABLE IF NOT EXISTS reminders (
  id SERIAL PRIMARY KEY,
  church_id INTEGER NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  reminder_type VARCHAR(50) NOT NULL, -- 'prayer', 'meeting', 'event', 'birthday', 'anniversary'
  target_type VARCHAR(50) NOT NULL, -- 'user', 'member', 'group', 'all'
  target_id INTEGER, -- user_id, member_id, or group_id depending on target_type
  schedule_type VARCHAR(20) NOT NULL, -- 'once', 'daily', 'weekly', 'monthly', 'yearly'
  scheduled_at TIMESTAMP,
  recurring_rule JSONB, -- for complex recurring schedules
  channels JSONB DEFAULT '["in_app"]', -- notification channels
  template_id INTEGER REFERENCES notification_templates(id),
  is_active BOOLEAN DEFAULT TRUE,
  last_sent_at TIMESTAMP,
  next_send_at TIMESTAMP,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ==============
--  10. SMS/EMAIL CONFIGURATION
-- ==============
CREATE TABLE IF NOT EXISTS communication_providers (
  id SERIAL PRIMARY KEY,
  provider_type VARCHAR(20) NOT NULL, -- 'twilio', 'sendgrid', 'aws_ses', 'firebase'
  name VARCHAR(100) NOT NULL,
  config JSONB NOT NULL, -- API keys, endpoints, etc.
  is_active BOOLEAN DEFAULT TRUE,
  priority INTEGER DEFAULT 1, -- for failover
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ==============
--  11. SEED DATA
-- ==============

-- Default Notification Templates
INSERT INTO notification_templates (church_id, name, channel, subject, body, description, variables, is_default) VALUES
(1, 'Welcome Email', 'email', 'Welcome to {{church_name}}!', '<h1>Welcome {{first_name}}!</h1><p>Welcome to {{church_name}}. We''re excited to have you join our community.</p><p>Visit us at: {{meeting_location}}</p><p>Service Times: {{service_times}}</p>', 'Welcome message for new members', '["first_name", "church_name", "meeting_location", "service_times"]', true),
(1, 'Prayer Reminder', 'email', 'Prayer Reminder: {{prayer_subject}}', '<h2>Prayer Reminder</h2><p>Dear {{first_name}},</p><p>This is a reminder to pray for: <strong>{{prayer_subject}}</strong></p><p>{{prayer_details}}</p><p>God bless you!</p>', 'Reminder for prayer requests', '["first_name", "prayer_subject", "prayer_details"]', true),
(1, 'Meeting Reminder', 'sms', NULL, 'Hi {{first_name}}! Don''t forget: {{meeting_name}} at {{church_name}} on {{meeting_date}} at {{meeting_time}}. See you there!', 'SMS reminder for church meetings', '["first_name", "meeting_name", "church_name", "meeting_date", "meeting_time"]', true),
(1, 'Birthday Blessing', 'email', 'Happy Birthday {{first_name}}!', '<h1>Happy Birthday {{first_name}}!</h1><p>Wishing you a blessed day filled with God''s love and favor.</p><p>{{church_name}} Family</p>', 'Birthday greeting for members', '["first_name", "church_name"]', true),
(1, 'Event Announcement', 'push', NULL, '{{event_name}} - {{event_date}} at {{church_name}}', 'Push notification for church events', '["event_name", "event_date", "church_name"]', true),
(1, 'Foundation School Reminder', 'email', 'Foundation School Progress Update', '<h2>Foundation School Reminder</h2><p>Dear {{pastor_name}},</p><p>This is a reminder to check on the progress of our foundation school students.</p><p>Students enrolled: {{student_count}}</p><p>Expected completion: {{completion_date}}</p><p>Please review their spiritual growth and provide guidance.</p>', 'Monthly reminder for foundation school oversight', '["pastor_name", "student_count", "completion_date"]', true),
(1, 'Follow-up Alert', 'email', 'Members Needing Follow-up', '<h2>Follow-up Alert</h2><p>Dear {{pastor_name}},</p><p>The following members haven''t been followed up with in the last 30 days:</p><ul>{{member_list}}</ul><p>Please reach out to ensure their spiritual well-being.</p>', 'Alert for members needing pastoral follow-up', '["pastor_name", "member_list"]', true),
(1, 'Crisis Alert', 'sms', NULL, 'URGENT: Crisis situation reported - {{member_name}} needs immediate pastoral care. Details: {{crisis_description}}', 'Immediate SMS alert for crisis situations', '["member_name", "crisis_description"]', true),
(1, 'Report Submission Reminder', 'email', 'Report Submission Due', '<h2>Report Submission Reminder</h2><p>Dear {{recipient_name}},</p><p>This is a reminder that your {{report_type}} report is due by {{due_date}}.</p><p>Please submit your report through the church management system.</p><p>Thank you for your timely submission.</p>', 'Reminder for report submissions', '["recipient_name", "report_type", "due_date"]', true),
(1, 'Crisis Care Notification', 'push', NULL, 'Crisis Care Alert: {{member_name}} - {{crisis_type}}', 'Push notification for crisis care situations', '["member_name", "crisis_type"]', true);

-- Sample Communication Providers (with placeholder configs)
INSERT INTO communication_providers (provider_type, name, config, is_active, priority) VALUES
('twilio', 'Twilio SMS', '{"accountSid": "YOUR_TWILIO_ACCOUNT_SID", "authToken": "YOUR_TWILIO_AUTH_TOKEN", "fromNumber": "+1234567890"}', false, 1),
('sendgrid', 'SendGrid Email', '{"apiKey": "YOUR_SENDGRID_API_KEY", "fromEmail": "noreply@yourchurch.com", "fromName": "Your Church"}', false, 1),
('aws_ses', 'AWS SES Email', '{"accessKeyId": "YOUR_AWS_ACCESS_KEY", "secretAccessKey": "YOUR_AWS_SECRET_KEY", "region": "us-east-1", "fromEmail": "noreply@yourchurch.com"}', false, 2),
('firebase', 'Firebase Push', '{"serverKey": "YOUR_FIREBASE_SERVER_KEY"}', false, 1);

-- Sample Reminders for Church Activities
DO $$
BEGIN
  -- Use an existing user for created_by (safe for DBs without user id 1)
  IF NOT EXISTS (SELECT 1 FROM reminders WHERE church_id=1 AND title='Sunday Service Reminder') THEN
    INSERT INTO reminders (church_id, title, description, reminder_type, target_type, target_id, schedule_type, scheduled_at, recurring_rule, channels, is_active, created_by)
    VALUES (1, 'Sunday Service Reminder', 'Weekly reminder for Sunday morning service', 'meeting', 'all', NULL, 'weekly', NULL, '{"days": [0], "time": "08:30"}', '["email", "sms"]', true, (SELECT id FROM users ORDER BY id LIMIT 1));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM reminders WHERE church_id=1 AND title='Wednesday Prayer Meeting') THEN
    INSERT INTO reminders (church_id, title, description, reminder_type, target_type, target_id, schedule_type, scheduled_at, recurring_rule, channels, is_active, created_by)
    VALUES (1, 'Wednesday Prayer Meeting', 'Mid-week prayer and bible study', 'prayer', 'all', NULL, 'weekly', NULL, '{"days": [3], "time": "19:00"}', '["in_app", "push"]', true, (SELECT id FROM users ORDER BY id LIMIT 1));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM reminders WHERE church_id=1 AND title='Monthly Fasting Reminder') THEN
    INSERT INTO reminders (church_id, title, description, reminder_type, target_type, target_id, schedule_type, scheduled_at, recurring_rule, channels, is_active, created_by)
    VALUES (1, 'Monthly Fasting Reminder', 'Monthly fasting and prayer focus', 'prayer', 'all', NULL, 'monthly', NULL, '{"day": 1, "time": "06:00"}', '["email"]', true, (SELECT id FROM users ORDER BY id LIMIT 1));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM reminders WHERE church_id=1 AND title='Youth Service Reminder') THEN
    INSERT INTO reminders (church_id, title, description, reminder_type, target_type, target_id, schedule_type, scheduled_at, recurring_rule, channels, is_active, created_by)
    VALUES (1, 'Youth Service Reminder', 'Weekly youth service for young adults', 'meeting', 'group', 1, 'weekly', NULL, '{"days": [6], "time": "18:00"}', '["sms", "push"]', true, (SELECT id FROM users ORDER BY id LIMIT 1));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM reminders WHERE church_id=1 AND title='Foundation School Progress Reminder') THEN
    INSERT INTO reminders (church_id, title, description, reminder_type, target_type, target_id, schedule_type, scheduled_at, recurring_rule, channels, is_active, created_by)
    VALUES (1, 'Foundation School Progress Reminder', 'Monthly reminder for foundation school students progress', 'education', 'role', 2, 'monthly', NULL, '{"day": 15, "time": "09:00"}', '["email", "in_app"]', true, (SELECT id FROM users ORDER BY id LIMIT 1));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM reminders WHERE church_id=1 AND title='Follow-up Needed Reminder') THEN
    INSERT INTO reminders (church_id, title, description, reminder_type, target_type, target_id, schedule_type, scheduled_at, recurring_rule, channels, is_active, created_by)
    VALUES (1, 'Follow-up Needed Reminder', 'Weekly reminder for members who haven''t been followed up in 30+ days', 'followup', 'role', 3, 'weekly', NULL, '{"days": [1], "time": "10:00"}', '["email", "sms"]', true, (SELECT id FROM users ORDER BY id LIMIT 1));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM reminders WHERE church_id=1 AND title='Crisis Care Alert') THEN
    INSERT INTO reminders (church_id, title, description, reminder_type, target_type, target_id, schedule_type, scheduled_at, recurring_rule, channels, is_active, created_by)
    VALUES (1, 'Crisis Care Alert', 'Immediate notification for crisis situations requiring pastoral care', 'crisis', 'role', 4, 'immediate', NULL, '{}', '["email", "sms", "push"]', true, (SELECT id FROM users ORDER BY id LIMIT 1));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM reminders WHERE church_id=1 AND title='Weekly Report Submission Reminder') THEN
    INSERT INTO reminders (church_id, title, description, reminder_type, target_type, target_id, schedule_type, scheduled_at, recurring_rule, channels, is_active, created_by)
    VALUES (1, 'Weekly Report Submission Reminder', 'Reminder for weekly report submission before deadline', 'report', 'role', 5, 'weekly', NULL, '{"days": [5], "time": "17:00"}', '["email", "in_app"]', true, (SELECT id FROM users ORDER BY id LIMIT 1));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM reminders WHERE church_id=1 AND title='Monthly Ministry Report Reminder') THEN
    INSERT INTO reminders (church_id, title, description, reminder_type, target_type, target_id, schedule_type, scheduled_at, recurring_rule, channels, is_active, created_by)
    VALUES (1, 'Monthly Ministry Report Reminder', 'End-of-month reminder for ministry reports', 'report', 'role', 6, 'monthly', NULL, '{"day": 28, "time": "16:00"}', '["email", "sms"]', true, (SELECT id FROM users ORDER BY id LIMIT 1));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM reminders WHERE church_id=1 AND title='Foundation School Graduation Reminder') THEN
    INSERT INTO reminders (church_id, title, description, reminder_type, target_type, target_id, schedule_type, scheduled_at, recurring_rule, channels, is_active, created_by)
    VALUES (1, 'Foundation School Graduation Reminder', '6-month reminder for foundation school completion', 'education', 'role', 2, 'custom', NULL, '{"months": 6, "time": "09:00"}', '["email"]', true, (SELECT id FROM users ORDER BY id LIMIT 1));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM reminders WHERE church_id=1 AND title='Inactive Member Follow-up') THEN
    INSERT INTO reminders (church_id, title, description, reminder_type, target_type, target_id, schedule_type, scheduled_at, recurring_rule, channels, is_active, created_by)
    VALUES (1, 'Inactive Member Follow-up', 'Monthly reminder to follow up with inactive members', 'followup', 'role', 3, 'monthly', NULL, '{"day": 10, "time": "11:00"}', '["email", "sms"]', true, (SELECT id FROM users ORDER BY id LIMIT 1));
  END IF;
END $$;

-- Removed stray fragment that caused syntax error


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