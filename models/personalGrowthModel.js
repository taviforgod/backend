import db from '../config/db.js';

// Personal Growth Plans CRUD
export async function createGrowthPlan(data) {
  const {
    church_id,
    member_id,
    plan_title,
    plan_description,
    plan_category,
    start_date,
    target_completion_date,
    primary_goal,
    specific_objectives,
    success_metrics,
    required_resources,
    accountability_partner,
    mentorship_support,
    review_frequency,
    created_by
  } = data;

  const result = await db.query(`
    INSERT INTO personal_growth_plans (
      church_id, member_id, plan_title, plan_description, plan_category,
      start_date, target_completion_date, primary_goal, specific_objectives,
      success_metrics, required_resources, accountability_partner,
      mentorship_support, review_frequency, created_by
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15
    ) RETURNING *
  `, [
    church_id, member_id, plan_title, plan_description, plan_category,
    start_date, target_completion_date, primary_goal,
    JSON.stringify(specific_objectives || []),
    JSON.stringify(success_metrics || []),
    required_resources, accountability_partner, mentorship_support,
    review_frequency, created_by
  ]);

  return result.rows[0];
}

export async function getGrowthPlans(churchId, filters = {}) {
  let query = `
    SELECT
      pgp.*,
      m.first_name, m.surname, m.contact_primary,
      ap.first_name as accountability_first_name, ap.surname as accountability_surname,
      ms.first_name as mentorship_first_name, ms.surname as mentorship_surname
    FROM personal_growth_plans pgp
    JOIN members m ON pgp.member_id = m.id
    LEFT JOIN members ap ON pgp.accountability_partner = ap.id
    LEFT JOIN members ms ON pgp.mentorship_support = ms.id
    WHERE pgp.church_id = $1
  `;

  const params = [churchId];
  let paramIndex = 2;

  if (filters.member_id) {
    query += ` AND pgp.member_id = $${paramIndex}`;
    params.push(filters.member_id);
    paramIndex++;
  }

  if (filters.plan_category) {
    query += ` AND pgp.plan_category = $${paramIndex}`;
    params.push(filters.plan_category);
    paramIndex++;
  }

  if (filters.status) {
    query += ` AND pgp.status = $${paramIndex}`;
    params.push(filters.status);
    paramIndex++;
  }

  query += ` ORDER BY pgp.created_at DESC`;

  if (filters.limit) {
    query += ` LIMIT $${paramIndex}`;
    params.push(filters.limit);
    paramIndex++;
  }

  const result = await db.query(query, params);
  return result.rows;
}

export async function updateGrowthPlan(planId, churchId, data) {
  const updates = [];
  const params = [];
  let paramIndex = 1;

  Object.keys(data).forEach(key => {
    if (data[key] !== undefined && key !== 'id' && key !== 'church_id') {
      if (['specific_objectives', 'success_metrics'].includes(key)) {
        updates.push(`${key} = $${paramIndex}`);
        params.push(JSON.stringify(data[key]));
      } else {
        updates.push(`${key} = $${paramIndex}`);
        params.push(data[key]);
      }
      paramIndex++;
    }
  });

  if (updates.length === 0) return null;

  updates.push(`updated_at = NOW()`);

  const query = `
    UPDATE personal_growth_plans
    SET ${updates.join(', ')}
    WHERE id = $${paramIndex} AND church_id = $${paramIndex + 1}
    RETURNING *
  `;

  params.push(planId, churchId);

  const result = await db.query(query, params);
  return result.rows[0];
}

// Growth Plan Milestones CRUD
export async function createPlanMilestone(data) {
  const {
    growth_plan_id,
    milestone_title,
    milestone_description,
    milestone_category,
    target_date,
    required_resources,
    support_needed,
    sort_order
  } = data;

  const result = await db.query(`
    INSERT INTO growth_plan_milestones (
      growth_plan_id, milestone_title, milestone_description, milestone_category,
      target_date, required_resources, support_needed, sort_order
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING *
  `, [
    growth_plan_id, milestone_title, milestone_description, milestone_category,
    target_date, required_resources, support_needed, sort_order
  ]);

  return result.rows[0];
}

export async function getPlanMilestones(planId) {
  const result = await db.query(`
    SELECT * FROM growth_plan_milestones
    WHERE growth_plan_id = $1
    ORDER BY sort_order ASC, target_date ASC
  `, [planId]);

  return result.rows;
}

export async function updatePlanMilestone(milestoneId, data) {
  const updates = [];
  const params = [];
  let paramIndex = 1;

  Object.keys(data).forEach(key => {
    if (data[key] !== undefined && key !== 'id') {
      updates.push(`${key} = $${paramIndex}`);
      params.push(data[key]);
      paramIndex++;
    }
  });

  if (updates.length === 0) return null;

  updates.push(`updated_at = NOW()`);

  const query = `
    UPDATE growth_plan_milestones
    SET ${updates.join(', ')}
    WHERE id = $${paramIndex}
    RETURNING *
  `;

  params.push(milestoneId);

  const result = await db.query(query, params);
  return result.rows[0];
}

// Burnout Assessment CRUD
export async function createBurnoutAssessment(data) {
  const {
    church_id,
    member_id,
    assessment_date,
    emotional_exhaustion,
    depersonalization,
    reduced_accomplishment,
    work_hours_per_week,
    sleep_hours_per_night,
    stress_factors,
    support_system_rating,
    physical_health_rating,
    mental_health_rating,
    spiritual_health_rating,
    recommended_actions,
    intervention_needed,
    intervention_type,
    follow_up_date,
    assessed_by
  } = data;

  // Calculate overall risk level
  const avgScore = (emotional_exhaustion + depersonalization + reduced_accomplishment) / 3;
  let overall_risk_level = 'low';
  if (avgScore >= 8) overall_risk_level = 'critical';
  else if (avgScore >= 6) overall_risk_level = 'high';
  else if (avgScore >= 4) overall_risk_level = 'moderate';

  const result = await db.query(`
    INSERT INTO burnout_assessments (
      church_id, member_id, assessment_date, emotional_exhaustion, depersonalization,
      reduced_accomplishment, overall_risk_level, work_hours_per_week, sleep_hours_per_night,
      stress_factors, support_system_rating, physical_health_rating, mental_health_rating,
      spiritual_health_rating, recommended_actions, intervention_needed, intervention_type,
      follow_up_date, assessed_by
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19
    ) RETURNING *
  `, [
    church_id, member_id, assessment_date, emotional_exhaustion, depersonalization,
    reduced_accomplishment, overall_risk_level, work_hours_per_week, sleep_hours_per_night,
    stress_factors, support_system_rating, physical_health_rating, mental_health_rating,
    spiritual_health_rating, recommended_actions, intervention_needed, intervention_type,
    follow_up_date, assessed_by
  ]);

  return result.rows[0];
}

export async function getBurnoutAssessments(churchId, filters = {}) {
  let query = `
    SELECT
      ba.*,
      m.first_name, m.surname, m.contact_primary,
      ab.first_name as assessed_by_first_name, ab.surname as assessed_by_surname
    FROM burnout_assessments ba
    JOIN members m ON ba.member_id = m.id
    LEFT JOIN members ab ON ba.assessed_by = ab.id
    WHERE ba.church_id = $1
  `;

  const params = [churchId];
  let paramIndex = 2;

  if (filters.member_id) {
    query += ` AND ba.member_id = $${paramIndex}`;
    params.push(filters.member_id);
    paramIndex++;
  }

  if (filters.risk_level) {
    query += ` AND ba.overall_risk_level = $${paramIndex}`;
    params.push(filters.risk_level);
    paramIndex++;
  }

  if (filters.intervention_needed !== undefined) {
    query += ` AND ba.intervention_needed = $${paramIndex}`;
    params.push(filters.intervention_needed);
    paramIndex++;
  }

  query += ` ORDER BY ba.assessment_date DESC`;

  if (filters.limit) {
    query += ` LIMIT $${paramIndex}`;
    params.push(filters.limit);
    paramIndex++;
  }

  const result = await db.query(query, params);
  return result.rows;
}

// Wellness Check-ins CRUD
export async function createWellnessCheckin(data) {
  const {
    church_id,
    member_id,
    checkin_date,
    energy_level,
    stress_level,
    sleep_quality,
    spiritual_connection,
    accomplishments_this_period,
    challenges_this_period,
    prayer_requests,
    gratitude_items,
    exercise_days_this_week,
    rest_days_this_week,
    time_with_family,
    personal_devotion_time,
    ministry_hours_per_week,
    non_ministry_hours_per_week,
    work_life_balance_rating,
    support_system_satisfaction,
    community_connection_rating,
    general_notes,
    concerns_to_address,
    goals_for_next_period
  } = data;

  const result = await db.query(`
    INSERT INTO wellness_checkins (
      church_id, member_id, checkin_date, energy_level, stress_level, sleep_quality,
      spiritual_connection, accomplishments_this_period, challenges_this_period,
      prayer_requests, gratitude_items, exercise_days_this_week, rest_days_this_week,
      time_with_family, personal_devotion_time, ministry_hours_per_week,
      non_ministry_hours_per_week, work_life_balance_rating, support_system_satisfaction,
      community_connection_rating, general_notes, concerns_to_address, goals_for_next_period
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17,
      $18, $19, $20, $21, $22, $23
    ) RETURNING *
  `, [
    church_id, member_id, checkin_date, energy_level, stress_level, sleep_quality,
    spiritual_connection, accomplishments_this_period, challenges_this_period,
    prayer_requests, gratitude_items, exercise_days_this_week, rest_days_this_week,
    time_with_family, personal_devotion_time, ministry_hours_per_week,
    non_ministry_hours_per_week, work_life_balance_rating, support_system_satisfaction,
    community_connection_rating, general_notes, concerns_to_address, goals_for_next_period
  ]);

  return result.rows[0];
}

export async function getWellnessCheckins(churchId, filters = {}) {
  let query = `
    SELECT
      wc.*,
      m.first_name, m.surname, m.contact_primary
    FROM wellness_checkins wc
    JOIN members m ON wc.member_id = m.id
    WHERE wc.church_id = $1
  `;

  const params = [churchId];
  let paramIndex = 2;

  if (filters.member_id) {
    query += ` AND wc.member_id = $${paramIndex}`;
    params.push(filters.member_id);
    paramIndex++;
  }

  if (filters.date_from) {
    query += ` AND wc.checkin_date >= $${paramIndex}`;
    params.push(filters.date_from);
    paramIndex++;
  }

  if (filters.date_to) {
    query += ` AND wc.checkin_date <= $${paramIndex}`;
    params.push(filters.date_to);
    paramIndex++;
  }

  query += ` ORDER BY wc.checkin_date DESC`;

  if (filters.limit) {
    query += ` LIMIT $${paramIndex}`;
    params.push(filters.limit);
    paramIndex++;
  }

  const result = await db.query(query, params);
  return result.rows;
}

// Spiritual Disciplines CRUD
export async function createSpiritualDiscipline(data) {
  const {
    church_id,
    member_id,
    discipline_date,
    bible_reading,
    prayer_time,
    meditation,
    fasting,
    worship,
    service,
    bible_reading_time,
    prayer_time_minutes,
    meditation_time,
    worship_time,
    scripture_focus,
    prayer_focus,
    spiritual_insights,
    challenges_encountered
  } = data;

  const result = await db.query(`
    INSERT INTO spiritual_disciplines (
      church_id, member_id, discipline_date, bible_reading, prayer_time, meditation,
      fasting, worship, service, bible_reading_time, prayer_time_minutes,
      meditation_time, worship_time, scripture_focus, prayer_focus,
      spiritual_insights, challenges_encountered
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17
    ) RETURNING *
  `, [
    church_id, member_id, discipline_date, bible_reading, prayer_time, meditation,
    fasting, worship, service, bible_reading_time, prayer_time_minutes,
    meditation_time, worship_time, scripture_focus, prayer_focus,
    spiritual_insights, challenges_encountered
  ]);

  return result.rows[0];
}

export async function getSpiritualDisciplines(churchId, filters = {}) {
  let query = `
    SELECT
      sd.*,
      m.first_name, m.surname
    FROM spiritual_disciplines sd
    JOIN members m ON sd.member_id = m.id
    WHERE sd.church_id = $1
  `;

  const params = [churchId];
  let paramIndex = 2;

  if (filters.member_id) {
    query += ` AND sd.member_id = $${paramIndex}`;
    params.push(filters.member_id);
    paramIndex++;
  }

  if (filters.date_from) {
    query += ` AND sd.discipline_date >= $${paramIndex}`;
    params.push(filters.date_from);
    paramIndex++;
  }

  if (filters.date_to) {
    query += ` AND sd.discipline_date <= $${paramIndex}`;
    params.push(filters.date_to);
    paramIndex++;
  }

  query += ` ORDER BY sd.discipline_date DESC`;

  if (filters.limit) {
    query += ` LIMIT $${paramIndex}`;
    params.push(filters.limit);
    paramIndex++;
  }

  const result = await db.query(query, params);
  return result.rows;
}

// Personal Development Goals CRUD
export async function createPersonalDevelopmentGoal(data) {
  const {
    church_id,
    member_id,
    goal_title,
    goal_description,
    goal_category,
    specific_description,
    measurable_criteria,
    achievable_action_steps,
    relevant_reason,
    time_bound_deadline,
    accountability_partner,
    start_date,
    target_completion_date
  } = data;

  const result = await db.query(`
    INSERT INTO personal_development_goals (
      church_id, member_id, goal_title, goal_description, goal_category,
      specific_description, measurable_criteria, achievable_action_steps,
      relevant_reason, time_bound_deadline, accountability_partner,
      start_date, target_completion_date
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13
    ) RETURNING *
  `, [
    church_id, member_id, goal_title, goal_description, goal_category,
    specific_description, measurable_criteria,
    JSON.stringify(achievable_action_steps || []),
    relevant_reason, time_bound_deadline, accountability_partner,
    start_date, target_completion_date
  ]);

  return result.rows[0];
}

export async function getPersonalDevelopmentGoals(churchId, filters = {}) {
  let query = `
    SELECT
      pdg.*,
      m.first_name, m.surname, m.contact_primary,
      ap.first_name as accountability_first_name, ap.surname as accountability_surname
    FROM personal_development_goals pdg
    JOIN members m ON pdg.member_id = m.id
    LEFT JOIN members ap ON pdg.accountability_partner = ap.id
    WHERE pdg.church_id = $1
  `;

  const params = [churchId];
  let paramIndex = 2;

  if (filters.member_id) {
    query += ` AND pdg.member_id = $${paramIndex}`;
    params.push(filters.member_id);
    paramIndex++;
  }

  if (filters.goal_category) {
    query += ` AND pdg.goal_category = $${paramIndex}`;
    params.push(filters.goal_category);
    paramIndex++;
  }

  if (filters.status) {
    query += ` AND pdg.status = $${paramIndex}`;
    params.push(filters.status);
    paramIndex++;
  }

  query += ` ORDER BY pdg.created_at DESC`;

  if (filters.limit) {
    query += ` LIMIT $${paramIndex}`;
    params.push(filters.limit);
    paramIndex++;
  }

  const result = await db.query(query, params);
  return result.rows;
}

// Analytics and Reporting Functions
export async function getBurnoutRiskSummary(churchId) {
  const result = await db.query(`
    SELECT
      overall_risk_level,
      COUNT(*) as count,
      ROUND(AVG(emotional_exhaustion), 1) as avg_emotional_exhaustion,
      ROUND(AVG(depersonalization), 1) as avg_depersonalization,
      ROUND(AVG(reduced_accomplishment), 1) as avg_reduced_accomplishment
    FROM burnout_assessments
    WHERE church_id = $1
    GROUP BY overall_risk_level
    ORDER BY
      CASE overall_risk_level
        WHEN 'critical' THEN 1
        WHEN 'high' THEN 2
        WHEN 'moderate' THEN 3
        WHEN 'low' THEN 4
      END
  `, [churchId]);

  return result.rows;
}

export async function getWellnessTrends(churchId, memberId, days = 30) {
  const result = await db.query(`
    SELECT
      AVG(energy_level) as avg_energy,
      AVG(stress_level) as avg_stress,
      AVG(sleep_quality) as avg_sleep,
      AVG(spiritual_connection) as avg_spiritual,
      AVG(work_life_balance_rating) as avg_balance,
      COUNT(*) as checkin_count
    FROM wellness_checkins
    WHERE church_id = $1 AND member_id = $2
    AND checkin_date >= CURRENT_DATE - INTERVAL '${days} days'
  `, [churchId, memberId]);

  return result.rows[0];
}

export async function getSpiritualDisciplineSummary(churchId, memberId, weeks = 4) {
  const result = await db.query(`
    SELECT
      AVG(CASE WHEN bible_reading THEN 1 ELSE 0 END) * 100 as bible_reading_percentage,
      AVG(CASE WHEN prayer_time THEN 1 ELSE 0 END) * 100 as prayer_percentage,
      AVG(CASE WHEN meditation THEN 1 ELSE 0 END) * 100 as meditation_percentage,
      AVG(CASE WHEN fasting THEN 1 ELSE 0 END) * 100 as fasting_percentage,
      AVG(CASE WHEN worship THEN 1 ELSE 0 END) * 100 as worship_percentage,
      AVG(CASE WHEN service THEN 1 ELSE 0 END) * 100 as service_percentage,
      AVG(bible_reading_time) as avg_bible_time,
      AVG(prayer_time_minutes) as avg_prayer_time
    FROM spiritual_disciplines
    WHERE church_id = $1 AND member_id = $2
    AND discipline_date >= CURRENT_DATE - INTERVAL '${weeks} weeks'
  `, [churchId, memberId]);

  return result.rows[0];
}

export async function getMembersNeedingAttention(churchId) {
  // Members with high burnout risk or wellness concerns
  const result = await db.query(`
    SELECT DISTINCT
      m.id, m.first_name, m.surname, m.contact_primary,
      ba.overall_risk_level,
      ba.assessment_date as last_assessment,
      wc.stress_level,
      wc.energy_level
    FROM members m
    LEFT JOIN burnout_assessments ba ON m.id = ba.member_id
      AND ba.assessment_date = (
        SELECT MAX(assessment_date)
        FROM burnout_assessments
        WHERE member_id = m.id
      )
    LEFT JOIN wellness_checkins wc ON m.id = wc.member_id
      AND wc.checkin_date = (
        SELECT MAX(checkin_date)
        FROM wellness_checkins
        WHERE member_id = m.id
      )
    WHERE m.church_id = $1
    AND (
      ba.overall_risk_level IN ('high', 'critical')
      OR wc.stress_level >= 8
      OR wc.energy_level <= 3
      OR ba.id IS NULL -- No assessment done
    )
  `, [churchId]);

  return result.rows;
}

export async function getGrowthPlanProgress(churchId, memberId) {
  const result = await db.query(`
    SELECT
      COUNT(*) as total_plans,
      COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_plans,
      COUNT(CASE WHEN status = 'active' THEN 1 END) as active_plans,
      ROUND(AVG(overall_progress_percentage), 1) as avg_progress
    FROM personal_growth_plans
    WHERE church_id = $1 AND member_id = $2
  `, [churchId, memberId]);

  return result.rows[0];
}