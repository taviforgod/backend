-- 1001_fix_absentee_templates.sql
-- Ensure absentee follow-up templates are seeded idempotently
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='absentee_followup_templates') THEN
    IF NOT EXISTS (SELECT 1 FROM absentee_followup_templates WHERE church_id=1 AND name='Standard Follow-up') THEN
      INSERT INTO absentee_followup_templates (church_id, name, description, default_priority, default_frequency, default_actions, is_active, created_by)
      VALUES (1, 'Standard Follow-up', 'Regular follow-up for normal absences', 'normal', 'weekly', '[]'::jsonb, true, NULL);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM absentee_followup_templates WHERE church_id=1 AND name='High Priority Follow-up') THEN
      INSERT INTO absentee_followup_templates (church_id, name, description, default_priority, default_frequency, default_actions, is_active, created_by)
      VALUES (1, 'High Priority Follow-up', 'Urgent follow-up for concerning absences', 'high', 'as_needed', '[]'::jsonb, true, NULL);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM absentee_followup_templates WHERE church_id=1 AND name='New Convert Care') THEN
      INSERT INTO absentee_followup_templates (church_id, name, description, default_priority, default_frequency, default_actions, is_active, created_by)
      VALUES (1, 'New Convert Care', 'Special care for new believers who are absent', 'high', 'weekly', '[]'::jsonb, true, NULL);
    END IF;
  END IF;
END $$;