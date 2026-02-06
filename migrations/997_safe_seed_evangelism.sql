-- 997_safe_seed_evangelism.sql
-- Safe, idempotent seeding for evangelism-related sample data
DO $$
BEGIN
  -- evangelism_contacts
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='evangelism_contacts') THEN
    IF NOT EXISTS (SELECT 1 FROM evangelism_contacts WHERE church_id=1 AND phone='+27123456789') THEN
      INSERT INTO evangelism_contacts (church_id, first_name, surname, phone, how_met, contact_date, status)
      VALUES (1, 'John', 'Doe', '+27123456789', 'Door-to-door', CURRENT_DATE - INTERVAL '3 days', 'new');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM evangelism_contacts WHERE church_id=1 AND phone='+27119876543') THEN
      INSERT INTO evangelism_contacts (church_id, first_name, surname, phone, how_met, contact_date, status)
      VALUES (1, 'Jane', 'Smith', '+27119876543', 'Event', CURRENT_DATE - INTERVAL '1 day', 'interested');
    END IF;
  END IF;

  -- evangelism_events
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='evangelism_events') THEN
    IF NOT EXISTS (SELECT 1 FROM evangelism_events WHERE church_id=1 AND title='Community Outreach') THEN
      INSERT INTO evangelism_events (church_id, title, description, event_date, location)
      VALUES (1, 'Community Outreach', 'Street evangelism and invite', NOW() + INTERVAL '7 days', 'Park');
    END IF;
  END IF;

  -- notifications (guard column existence because schema varies)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='notifications') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='notifications' AND column_name='title') THEN
      IF NOT EXISTS (SELECT 1 FROM notifications WHERE church_id=1 AND message LIKE '%Sample notification for evangelism module%') THEN
        INSERT INTO notifications (church_id, user_id, title, message, type)
        VALUES (1, 1, 'Evangelism ready', 'Sample notification for evangelism module', 'Evangelism');
      END IF;
    END IF;
  END IF;
END $$;