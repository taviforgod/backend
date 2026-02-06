-- backend/migrations/005_seed_evangelism.sql
INSERT INTO evangelism_contacts (church_id, first_name, surname, phone, how_met, contact_date, status)
VALUES (1, 'John', 'Doe', '+27123456789', 'Door-to-door', CURRENT_DATE - INTERVAL '3 days', 'new'),
       (1, 'Jane', 'Smith', '+27119876543', 'Event', CURRENT_DATE - INTERVAL '1 day', 'interested');

INSERT INTO evangelism_events (church_id, title, description, event_date, location)
VALUES (1, 'Community Outreach', 'Street evangelism and invite', NOW() + INTERVAL '7 days', 'Park');

DO $$
BEGIN
  -- Insert depending on schema version (some installs don't have a title column on notifications)
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='notifications' AND column_name='title') THEN
    IF NOT EXISTS (SELECT 1 FROM notifications WHERE church_id=1 AND message='Sample notification for evangelism module') THEN
      INSERT INTO notifications (church_id, user_id, title, message, type)
      VALUES (1, (SELECT id FROM users ORDER BY id LIMIT 1), 'Evangelism ready', 'Sample notification for evangelism module', 'Evangelism');
    END IF;
  ELSE
    IF NOT EXISTS (SELECT 1 FROM notifications WHERE church_id=1 AND message='Sample notification for evangelism module') THEN
      INSERT INTO notifications (church_id, user_id, message, type)
      VALUES (1, (SELECT id FROM users ORDER BY id LIMIT 1), 'Sample notification for evangelism module', 'Evangelism');
    END IF;
  END IF;
END $$;
