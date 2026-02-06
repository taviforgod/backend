import pool from '../config/db.js';

// List all (with optional filters)
export async function getAllCrisisFollowups(filters = {}) {
  const {
    church_id, is_active, crisis_type, severity_level,
    case_status, case_manager, limit = 50, offset = 0,
    start_date, end_date, cell_group_ids
  } = filters;

  const clauses = [];
  const values = [];
  let i = 1;

  // If leader requested their cell cases, filter by active cell_membership
  if (cell_group_ids && Array.isArray(cell_group_ids) && cell_group_ids.length) {
    clauses.push(`EXISTS (
      SELECT 1 FROM cell_members cmf
      WHERE cmf.member_id = c.member_id
        AND cmf.cell_group_id = ANY($${i++})
        AND cmf.is_active = TRUE
    )`);
    values.push(cell_group_ids);
  }

  if (church_id) { clauses.push(`c.church_id = $${i++}`); values.push(church_id); }
  if (typeof is_active === 'boolean') { clauses.push(`c.is_active = $${i++}`); values.push(is_active); }
  if (crisis_type) { clauses.push(`c.crisis_type ILIKE $${i++}`); values.push(`%${crisis_type}%`); }
  if (severity_level) { clauses.push(`c.severity_level = $${i++}`); values.push(severity_level); }
  if (case_status) { clauses.push(`c.case_status = $${i++}`); values.push(case_status); }
  if (case_manager) { clauses.push(`c.case_manager = $${i++}`); values.push(case_manager); }

  // Add date filtering
  if (start_date) {
    clauses.push(`c.date_reported >= $${i++}`);
    values.push(start_date);
  }
  if (end_date) {
    clauses.push(`c.date_reported <= $${i++}`);
    values.push(end_date);
  }

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const sql = `
    SELECT c.*,
           m.first_name AS member_first_name, m.surname AS member_surname,
           m.contact_primary, m.email,
           fp.first_name AS followup_first_name, fp.surname AS followup_surname,
           cm.first_name AS case_manager_first_name, cm.surname AS case_manager_surname,
           -- Get latest assessment risk level
           (SELECT ca.overall_risk_level FROM crisis_assessments ca
            WHERE ca.crisis_case_id = c.id ORDER BY ca.assessment_date DESC LIMIT 1) as current_risk_level,
           -- Get latest intervention plan
           (SELECT cip.plan_type FROM crisis_intervention_plans cip
            WHERE cip.crisis_case_id = c.id AND cip.plan_status = 'active' LIMIT 1) as active_plan_type,
           -- Count of follow-up sessions
           (SELECT COUNT(*) FROM crisis_followup_sessions cfs WHERE cfs.crisis_case_id = c.id) as session_count
    FROM crisis_followups c
    LEFT JOIN members m ON c.member_id = m.id
    LEFT JOIN members fp ON c.followup_person_id = fp.id
    LEFT JOIN members cm ON c.case_manager = cm.id
    ${where}
    ORDER BY
      CASE WHEN c.severity_level = 'critical' THEN 1
           WHEN c.severity_level = 'high' THEN 2
           WHEN c.severity_level = 'moderate' THEN 3
           WHEN c.severity_level = 'low' THEN 4
           ELSE 5 END,
      c.date_reported DESC
    LIMIT $${i} OFFSET $${i + 1}
  `;

  values.push(limit, offset);
  const { rows } = await pool.query(sql, values);
  return rows;
}

// Get one
export async function getCrisisFollowupById(id) {
  const { rows } = await pool.query('SELECT * FROM crisis_followups WHERE id = $1', [id]);
  return rows[0];
}

// Create
export async function createCrisisFollowup(data) {
  const {
    church_id, member_id, reported_by, crisis_type, crisis_category,
    emotional_state, severity_level, immediate_needs, confidentiality_level,
    support_provided, external_referral, followup_person_id, case_manager,
    followup_frequency, recovery_progress, comments, next_followup_date
  } = data;

  // Convert empty strings to null for integer fields
  const followupPersonId = followup_person_id && followup_person_id.trim() ? followup_person_id : null;
  const recoveryProgress = recovery_progress != null && recovery_progress !== '' ? recovery_progress : null;

  const { rows } = await pool.query(
    `INSERT INTO crisis_followups
      (church_id, member_id, reported_by, crisis_type, crisis_category,
       emotional_state, severity_level, immediate_needs, confidentiality_level,
       support_provided, external_referral, followup_person_id, case_manager,
       followup_frequency, recovery_progress, comments, next_followup_date)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
     RETURNING *`,
    [church_id, member_id, reported_by, crisis_type, crisis_category,
     emotional_state, severity_level, immediate_needs, confidentiality_level,
     support_provided, external_referral, followupPersonId, case_manager,
     followup_frequency, recoveryProgress, comments, next_followup_date]
  );
  return rows[0];
}

// Update
export async function updateCrisisFollowup(id, data) {
  const fields = Object.keys(data);
  if (!fields.length) return null;

  const values = Object.values(data);
  const setClause = fields.map((f, i) => `${f} = $${i + 1}`).join(', ');
  const { rows } = await pool.query(
    `UPDATE crisis_followups
     SET ${setClause}, updated_at = NOW()
     WHERE id = $${fields.length + 1}
     RETURNING *`,
    [...values, id]
  );
  return rows[0];
}

// Soft delete (mark inactive)
export async function deleteCrisisFollowup(id) {
  const { rowCount } = await pool.query(
    'UPDATE crisis_followups SET is_active = FALSE, closed_date = CURRENT_DATE WHERE id = $1',
    [id]
  );
  return rowCount > 0;
}

// Enhanced Summary per church
export async function getCrisisSummary(church_id) {
  const { rows } = await pool.query(`
    SELECT
      COUNT(*) FILTER (WHERE is_active) AS active,
      COUNT(*) FILTER (WHERE NOT is_active) AS closed,
      COUNT(*) FILTER (WHERE next_followup_date = CURRENT_DATE) AS due_today,
      COUNT(*) FILTER (WHERE severity_level = 'critical') AS critical_cases,
      COUNT(*) FILTER (WHERE severity_level = 'high') AS high_priority,
      COUNT(*) FILTER (WHERE case_status = 'escalated') AS escalated_cases,
      AVG(CASE WHEN recovery_progress IS NOT NULL THEN recovery_progress END) as avg_recovery_progress,
      COUNT(*) FILTER (WHERE date_reported >= CURRENT_DATE - INTERVAL '30 days') AS new_this_month
    FROM crisis_followups
    WHERE church_id = $1;
  `, [church_id]);
  return rows[0];
}

// Crisis Assessments CRUD
export async function createCrisisAssessment(data) {
  const {
    church_id, crisis_case_id, assessment_type, suicide_risk, self_harm_risk,
    harm_to_others_risk, medical_risk, depression_level, anxiety_level,
    hopelessness_level, isolation_level, family_support, friend_support,
    church_support, professional_help, support_network_notes,
    primary_trigger, contributing_factors, recent_stressors,
    overall_risk_level, immediate_action_required, immediate_action_details,
    assessed_by, assessment_notes
  } = data;

  const { rows } = await pool.query(`
    INSERT INTO crisis_assessments (
      church_id, crisis_case_id, assessment_type, suicide_risk, self_harm_risk,
      harm_to_others_risk, medical_risk, depression_level, anxiety_level,
      hopelessness_level, isolation_level, family_support, friend_support,
      church_support, professional_help, support_network_notes,
      primary_trigger, contributing_factors, recent_stressors,
      overall_risk_level, immediate_action_required, immediate_action_details,
      assessed_by, assessment_notes
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24)
    RETURNING *
  `, [
    church_id, crisis_case_id, assessment_type, suicide_risk, self_harm_risk,
    harm_to_others_risk, medical_risk, depression_level, anxiety_level,
    hopelessness_level, isolation_level, family_support, friend_support,
    church_support, professional_help, support_network_notes,
    primary_trigger, contributing_factors, recent_stressors,
    overall_risk_level, immediate_action_required, immediate_action_details,
    assessed_by, assessment_notes
  ]);

  return rows[0];
}

export async function getCrisisAssessments(crisisCaseId) {
  const { rows } = await pool.query(`
    SELECT ca.*,
           m.first_name as assessed_by_first_name, m.surname as assessed_by_surname
    FROM crisis_assessments ca
    LEFT JOIN members m ON ca.assessed_by = m.id
    WHERE ca.crisis_case_id = $1
    ORDER BY ca.assessment_date DESC
  `, [crisisCaseId]);

  return rows;
}

// Intervention Plans CRUD
export async function createInterventionPlan(data) {
  const {
    church_id, crisis_case_id, plan_type, plan_start_date, plan_end_date,
    immediate_actions, immediate_timeline, short_term_goals, short_term_interventions,
    long_term_goals, long_term_interventions, safety_plan, emergency_contacts,
    assigned_caregivers, external_resources, review_frequency, next_review_date,
    created_by
  } = data;

  const { rows } = await pool.query(`
    INSERT INTO crisis_intervention_plans (
      church_id, crisis_case_id, plan_type, plan_start_date, plan_end_date,
      immediate_actions, immediate_timeline, short_term_goals, short_term_interventions,
      long_term_goals, long_term_interventions, safety_plan, emergency_contacts,
      assigned_caregivers, external_resources, review_frequency, next_review_date,
      created_by, updated_by
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
    RETURNING *
  `, [
    church_id, crisis_case_id, plan_type, plan_start_date, plan_end_date,
    JSON.stringify(immediate_actions || []),
    immediate_timeline,
    JSON.stringify(short_term_goals || []),
    JSON.stringify(short_term_interventions || []),
    JSON.stringify(long_term_goals || []),
    JSON.stringify(long_term_interventions || []),
    JSON.stringify(safety_plan || {}),
    JSON.stringify(emergency_contacts || []),
    JSON.stringify(assigned_caregivers || []),
    JSON.stringify(external_resources || []),
    review_frequency, next_review_date, created_by, created_by
  ]);

  return rows[0];
}

export async function getInterventionPlans(crisisCaseId) {
  const { rows } = await pool.query(`
    SELECT cip.*,
           cb.first_name as created_by_first_name, cb.surname as created_by_surname
    FROM crisis_intervention_plans cip
    LEFT JOIN members cb ON cip.created_by = cb.id
    WHERE cip.crisis_case_id = $1
    ORDER BY cip.created_at DESC
  `, [crisisCaseId]);

  return rows;
}

// Follow-up Sessions CRUD
export async function createFollowupSession(data) {
  const {
    church_id, crisis_case_id, intervention_plan_id, session_date, session_time,
    session_duration, session_type, session_location, session_objectives,
    discussion_topics, progress_made, challenges_encountered, emotional_state,
    coping_effectiveness, support_system_effectiveness, risk_level_change,
    interventions_applied, referrals_made, resources_provided,
    next_session_date, next_session_objectives, homework_assignments,
    primary_caregiver, additional_participants, session_notes, member_feedback,
    created_by
  } = data;

  const { rows } = await pool.query(`
    INSERT INTO crisis_followup_sessions (
      church_id, crisis_case_id, intervention_plan_id, session_date, session_time,
      session_duration, session_type, session_location, session_objectives,
      discussion_topics, progress_made, challenges_encountered, emotional_state,
      coping_effectiveness, support_system_effectiveness, risk_level_change,
      interventions_applied, referrals_made, resources_provided,
      next_session_date, next_session_objectives, homework_assignments,
      primary_caregiver, additional_participants, session_notes, member_feedback,
      created_by
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27)
    RETURNING *
  `, [
    church_id, crisis_case_id, intervention_plan_id, session_date, session_time,
    session_duration, session_type, session_location, session_objectives,
    discussion_topics, progress_made, challenges_encountered, emotional_state,
    coping_effectiveness, support_system_effectiveness, risk_level_change,
    JSON.stringify(interventions_applied || []),
    JSON.stringify(referrals_made || []),
    JSON.stringify(resources_provided || []),
    next_session_date, next_session_objectives, homework_assignments,
    primary_caregiver, JSON.stringify(additional_participants || []),
    session_notes, member_feedback, created_by
  ]);

  return rows[0];
}

export async function getFollowupSessions(crisisCaseId) {
  const { rows } = await pool.query(`
    SELECT cfs.*,
           pc.first_name as caregiver_first_name, pc.surname as caregiver_surname,
           cb.first_name as created_by_first_name, cb.surname as created_by_surname
    FROM crisis_followup_sessions cfs
    LEFT JOIN members pc ON cfs.primary_caregiver = pc.id
    LEFT JOIN members cb ON cfs.created_by = cb.id
    WHERE cfs.crisis_case_id = $1
    ORDER BY cfs.session_date DESC, cfs.session_time DESC
  `, [crisisCaseId]);

  return rows;
}

// Crisis Resources CRUD
export async function getCrisisResources(churchId, filters = {}) {
  const { resource_type, is_active = true } = filters;
  const clauses = ['cr.church_id = $1'];
  const values = [churchId];
  let i = 2;

  if (resource_type) { clauses.push(`cr.resource_type = $${i++}`); values.push(resource_type); }
  if (typeof is_active === 'boolean') { clauses.push(`cr.is_active = $${i++}`); values.push(is_active); }

  const where = clauses.join(' AND ');
  const { rows } = await pool.query(`
    SELECT cr.* FROM crisis_resources cr
    WHERE ${where}
    ORDER BY cr.usage_count DESC, cr.resource_name ASC
  `, values);

  return rows;
}

// Crisis Referrals CRUD
export async function createCrisisReferral(data) {
  const {
    church_id, crisis_case_id, resource_id, referral_date, referral_type,
    referral_reason, provider_name, provider_contact, provider_specialty,
    referred_by
  } = data;

  const { rows } = await pool.query(`
    INSERT INTO crisis_referrals (
      church_id, crisis_case_id, resource_id, referral_date, referral_type,
      referral_reason, provider_name, provider_contact, provider_specialty, referred_by
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
    RETURNING *
  `, [
    church_id, crisis_case_id, resource_id, referral_date, referral_type,
    referral_reason, provider_name, provider_contact, provider_specialty, referred_by
  ]);

  return rows[0];
}

export async function getCrisisReferrals(crisisCaseId) {
  const { rows } = await pool.query(`
    SELECT cr.*,
           crs.resource_name, crs.resource_type, crs.contact_name as resource_contact,
           m.first_name as referred_by_first_name, m.surname as referred_by_surname
    FROM crisis_referrals cr
    LEFT JOIN crisis_resources crs ON cr.resource_id = crs.id
    LEFT JOIN members m ON cr.referred_by = m.id
    WHERE cr.crisis_case_id = $1
    ORDER BY cr.referral_date DESC
  `, [crisisCaseId]);

  return rows;
}

// Recovery Milestones CRUD
export async function createRecoveryMilestone(data) {
  const {
    church_id, crisis_case_id, milestone_name, milestone_category,
    milestone_description, target_date, success_criteria, measurement_method,
    baseline_measurement, support_required, resources_needed, created_by
  } = data;

  const { rows } = await pool.query(`
    INSERT INTO crisis_recovery_milestones (
      church_id, crisis_case_id, milestone_name, milestone_category,
      milestone_description, target_date, success_criteria, measurement_method,
      baseline_measurement, support_required, resources_needed, created_by
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
    RETURNING *
  `, [
    church_id, crisis_case_id, milestone_name, milestone_category,
    milestone_description, target_date, success_criteria, measurement_method,
    baseline_measurement, support_required, resources_needed, created_by
  ]);

  return rows[0];
}

export async function getRecoveryMilestones(crisisCaseId) {
  const { rows } = await pool.query(`
    SELECT crm.*,
           cb.first_name as created_by_first_name, cb.surname as created_by_surname
    FROM crisis_recovery_milestones crm
    LEFT JOIN members cb ON crm.created_by = cb.id
    WHERE crm.crisis_case_id = $1
    ORDER BY crm.target_date ASC, crm.created_at ASC
  `, [crisisCaseId]);

  return rows;
}

// Update recovery milestone progress
export async function updateMilestoneProgress(milestoneId, progressData) {
  const { achieved_date, milestone_status, current_measurement, updated_by } = progressData;

  const { rows } = await pool.query(`
    UPDATE crisis_recovery_milestones
    SET achieved_date = $1, milestone_status = $2, current_measurement = $3,
        updated_at = NOW()
    WHERE id = $4
    RETURNING *
  `, [achieved_date, milestone_status, current_measurement, milestoneId]);

  return rows[0];
}

// Get cases requiring immediate attention
export async function getUrgentCases(churchId) {
  const { rows } = await pool.query(`
    SELECT c.*,
           m.first_name, m.surname, m.contact_primary,
           (SELECT ca.overall_risk_level FROM crisis_assessments ca
            WHERE ca.crisis_case_id = c.id ORDER BY ca.assessment_date DESC LIMIT 1) as current_risk_level,
           (SELECT ca.immediate_action_required FROM crisis_assessments ca
            WHERE ca.crisis_case_id = c.id ORDER BY ca.assessment_date DESC LIMIT 1) as immediate_action_required
    FROM crisis_followups c
    LEFT JOIN members m ON c.member_id = m.id
    WHERE c.church_id = $1
      AND c.is_active = true
      AND (
        c.severity_level = 'critical'
        OR c.case_status = 'escalated'
        OR c.next_followup_date <= CURRENT_DATE
        OR EXISTS (
          SELECT 1 FROM crisis_assessments ca
          WHERE ca.crisis_case_id = c.id
            AND ca.immediate_action_required = true
            AND ca.assessment_date >= CURRENT_DATE - INTERVAL '7 days'
        )
      )
    ORDER BY
      CASE WHEN c.severity_level = 'critical' THEN 1
           WHEN c.next_followup_date <= CURRENT_DATE THEN 2
           ELSE 3 END,
      c.date_reported DESC
  `, [churchId]);

  return rows;
}

// Get comprehensive case details
export async function getCaseDetails(caseId) {
  const { rows } = await pool.query(`
    SELECT c.*,
           m.first_name, m.surname, m.contact_primary, m.email, m.date_of_birth,
           fp.first_name as followup_first_name, fp.surname as followup_surname,
           cm.first_name as case_manager_first_name, cm.surname as case_manager_surname
    FROM crisis_followups c
    LEFT JOIN members m ON c.member_id = m.id
    LEFT JOIN members fp ON c.followup_person_id = fp.id
    LEFT JOIN members cm ON c.case_manager = cm.id
    WHERE c.id = $1
  `, [caseId]);

  if (!rows[0]) return null;

  const caseData = rows[0];

  // Get related data
  const [assessments, plans, sessions, referrals, milestones] = await Promise.all([
    getCrisisAssessments(caseId),
    getInterventionPlans(caseId),
    getFollowupSessions(caseId),
    getCrisisReferrals(caseId),
    getRecoveryMilestones(caseId)
  ]);

  return {
    ...caseData,
    assessments,
    intervention_plans: plans,
    followup_sessions: sessions,
    referrals,
    recovery_milestones: milestones
  };
}
