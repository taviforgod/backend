-- backend/migrations/005_seed_evangelism.sql
INSERT INTO evangelism_contacts (church_id, first_name, surname, phone, how_met, contact_date, status)
VALUES (1, 'John', 'Doe', '+27123456789', 'Door-to-door', CURRENT_DATE - INTERVAL '3 days', 'new'),
       (1, 'Jane', 'Smith', '+27119876543', 'Event', CURRENT_DATE - INTERVAL '1 day', 'interested');

INSERT INTO evangelism_events (church_id, title, description, event_date, location)
VALUES (1, 'Community Outreach', 'Street evangelism and invite', NOW() + INTERVAL '7 days', 'Park');

INSERT INTO notifications (church_id, user_id, title, message, type)
VALUES (1, 1, 'Evangelism ready', 'Sample notification for evangelism module', 'Evangelism');
