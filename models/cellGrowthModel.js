import db from '../config/db.js';

// Cell Performance Metrics CRUD
export async function createPerformanceMetrics(data) {
  const {
    church_id,
    cell_group_id,
    metric_date,
    week_of_year,
    attendance_count,
    visitor_count,
    member_count,
    first_timers,
    new_conversions,
    baptisms,
    foundation_school_graduates,
    offering_amount,
    testimony_count,
    prayer_requests_count,
    apprentice_leaders,
    potential_leaders_identified,
    multiplication_readiness_score,
    target_multiplication_date,
    multiplication_training_completed,
    recorded_by
  } = data;

  const result = await db.query(`
    INSERT INTO cell_performance_metrics (
      church_id, cell_group_id, metric_date, week_of_year, attendance_count,
      visitor_count, member_count, first_timers, new_conversions, baptisms,
      foundation_school_graduates, offering_amount, testimony_count,
      prayer_requests_count, apprentice_leaders, potential_leaders_identified,
      multiplication_readiness_score, target_multiplication_date,
      multiplication_training_completed, recorded_by
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16,
      $17, $18, $19, $20
    ) RETURNING *
  `, [
    church_id, cell_group_id, metric_date, week_of_year, attendance_count,
    visitor_count, member_count, first_timers, new_conversions, baptisms,
    foundation_school_graduates, offering_amount, testimony_count,
    prayer_requests_count, apprentice_leaders, potential_leaders_identified,
    multiplication_readiness_score, target_multiplication_date,
    multiplication_training_completed, recorded_by
  ]);

  return result.rows[0];
}

export async function getPerformanceMetrics(churchId, filters = {}) {
  let query = `
    SELECT
      cpm.*,
      cg.name as cell_group_name,
      cg.zone_id,
      rb.first_name as recorded_by_first_name, rb.surname as recorded_by_surname
    FROM cell_performance_metrics cpm
    JOIN cell_groups cg ON cpm.cell_group_id = cg.id
    LEFT JOIN members rb ON cpm.recorded_by = rb.id
    WHERE cpm.church_id = $1
  `;

  const params = [churchId];
  let paramIndex = 2;

  if (filters.cell_group_id) {
    query += ` AND cpm.cell_group_id = $${paramIndex}`;
    params.push(filters.cell_group_id);
    paramIndex++;
  }

  if (filters.date_from) {
    query += ` AND cpm.metric_date >= $${paramIndex}`;
    params.push(filters.date_from);
    paramIndex++;
  }

  if (filters.date_to) {
    query += ` AND cpm.metric_date <= $${paramIndex}`;
    params.push(filters.date_to);
    paramIndex++;
  }

  query += ` ORDER BY cpm.metric_date DESC, cpm.cell_group_id ASC`;

  if (filters.limit) {
    query += ` LIMIT $${paramIndex}`;
    params.push(filters.limit);
    paramIndex++;
  }

  const result = await db.query(query, params);
  return result.rows;
}

// Cell Health Assessments CRUD
export async function createHealthAssessment(data) {
  const {
    church_id,
    cell_group_id,
    assessment_date,
    wbs_stage,
    stage_progress_percentage,
    outreach_events_count,
    gospel_presentations_count,
    conversion_rate,
    discipleship_sessions_count,
    foundation_school_completion_rate,
    leadership_development_score,
    leaders_sent_out,
    new_cells_planted,
    multiplication_success_rate,
    overall_health_score,
    health_trends,
    critical_issues,
    recommended_actions,
    next_review_date,
    assessed_by
  } = data;

  const result = await db.query(`
    INSERT INTO cell_health_assessments (
      church_id, cell_group_id, assessment_date, wbs_stage, stage_progress_percentage,
      outreach_events_count, gospel_presentations_count, conversion_rate,
      discipleship_sessions_count, foundation_school_completion_rate,
      leadership_development_score, leaders_sent_out, new_cells_planted,
      multiplication_success_rate, overall_health_score, health_trends,
      critical_issues, recommended_actions, next_review_date, assessed_by
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16,
      $17, $18, $19, $20
    ) RETURNING *
  `, [
    church_id, cell_group_id, assessment_date, wbs_stage, stage_progress_percentage,
    outreach_events_count, gospel_presentations_count, conversion_rate,
    discipleship_sessions_count, foundation_school_completion_rate,
    leadership_development_score, leaders_sent_out, new_cells_planted,
    multiplication_success_rate, overall_health_score, health_trends,
    critical_issues, recommended_actions, next_review_date, assessed_by
  ]);

  return result.rows[0];
}

export async function getHealthAssessments(churchId, filters = {}) {
  let query = `
    SELECT
      cha.*,
      cg.name as cell_group_name,
      ab.first_name as assessed_by_first_name, ab.surname as assessed_by_surname
    FROM cell_health_assessments cha
    JOIN cell_groups cg ON cha.cell_group_id = cg.id
    LEFT JOIN members ab ON cha.assessed_by = ab.id
    WHERE cha.church_id = $1
  `;

  const params = [churchId];
  let paramIndex = 2;

  if (filters.cell_group_id) {
    query += ` AND cha.cell_group_id = $${paramIndex}`;
    params.push(filters.cell_group_id);
    paramIndex++;
  }

  if (filters.wbs_stage) {
    query += ` AND cha.wbs_stage = $${paramIndex}`;
    params.push(filters.wbs_stage);
    paramIndex++;
  }

  query += ` ORDER BY cha.assessment_date DESC, cha.cell_group_id ASC`;

  if (filters.limit) {
    query += ` LIMIT $${paramIndex}`;
    params.push(filters.limit);
    paramIndex++;
  }

  const result = await db.query(query, params);
  return result.rows;
}

// Leadership Pipeline CRUD
export async function createLeadershipEntry(data) {
  const {
    church_id,
    member_id,
    current_role,
    development_stage,
    development_start_date,
    leadership_potential,
    teaching_ability,
    evangelism_skills,
    discipleship_capability,
    administrative_skills,
    training_completed,
    training_needed,
    mentorship_assigned,
    ready_for_multiplication,
    multiplication_date,
    cells_led,
    development_notes,
    next_review_date,
    follow_up_actions,
    identified_by
  } = data;

  const result = await db.query(`
    INSERT INTO leadership_pipeline (
      church_id, member_id, current_role, development_stage, development_start_date,
      leadership_potential, teaching_ability, evangelism_skills, discipleship_capability,
      administrative_skills, training_completed, training_needed, mentorship_assigned,
      ready_for_multiplication, multiplication_date, cells_led, development_notes,
      next_review_date, follow_up_actions, identified_by
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16,
      $17, $18, $19, $20
    ) RETURNING *
  `, [
    church_id, member_id, current_role, development_stage, development_start_date,
    leadership_potential, teaching_ability, evangelism_skills, discipleship_capability,
    administrative_skills, JSON.stringify(training_completed || []),
    JSON.stringify(training_needed || []), mentorship_assigned,
    ready_for_multiplication, multiplication_date, cells_led, development_notes,
    next_review_date, follow_up_actions, identified_by
  ]);

  return result.rows[0];
}

export async function getLeadershipPipeline(churchId, filters = {}) {
  let query = `
    SELECT
      lp.*,
      m.first_name, m.surname, m.contact_primary,
      ma.first_name as mentor_first_name, ma.surname as mentor_surname,
      idb.first_name as identified_by_first_name, idb.surname as identified_by_surname
    FROM leadership_pipeline lp
    JOIN members m ON lp.member_id = m.id
    LEFT JOIN members ma ON lp.mentorship_assigned = ma.id
    LEFT JOIN members idb ON lp.identified_by = idb.id
    WHERE lp.church_id = $1
  `;

  const params = [churchId];
  let paramIndex = 2;

  if (filters.development_stage) {
    query += ` AND lp.development_stage = $${paramIndex}`;
    params.push(filters.development_stage);
    paramIndex++;
  }

  if (filters.ready_for_multiplication !== undefined) {
    query += ` AND lp.ready_for_multiplication = $${paramIndex}`;
    params.push(filters.ready_for_multiplication);
    paramIndex++;
  }

  query += ` ORDER BY lp.development_stage ASC, lp.created_at ASC`;

  const result = await db.query(query, params);
  return result.rows;
}

// Cell Multiplication Planning CRUD
export async function createMultiplicationPlan(data) {
  const {
    church_id,
    parent_cell_id,
    target_multiplication_date,
    planned_launch_date,
    multiplication_type,
    target_location,
    target_audience,
    primary_leader_id,
    apprentice_leader_id,
    support_team_members,
    milestones,
    budget_allocated,
    materials_needed,
    training_required,
    status,
    coordinator
  } = data;

  const result = await db.query(`
    INSERT INTO cell_multiplication_plans (
      church_id, parent_cell_id, target_multiplication_date, planned_launch_date,
      multiplication_type, target_location, target_audience, primary_leader_id,
      apprentice_leader_id, support_team_members, milestones, budget_allocated,
      materials_needed, training_required, status, coordinator
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16
    ) RETURNING *
  `, [
    church_id, parent_cell_id, target_multiplication_date, planned_launch_date,
    multiplication_type, target_location, target_audience, primary_leader_id,
    apprentice_leader_id, JSON.stringify(support_team_members || []),
    JSON.stringify(milestones || []), budget_allocated, materials_needed,
    training_required, status, coordinator
  ]);

  return result.rows[0];
}

export async function getMultiplicationPlans(churchId, filters = {}) {
  let query = `
    SELECT
      cmp.*,
      pcg.name as parent_cell_name,
      pl.first_name as primary_leader_first_name, pl.surname as primary_leader_surname,
      al.first_name as apprentice_leader_first_name, al.surname as apprentice_leader_surname,
      coord.first_name as coordinator_first_name, coord.surname as coordinator_surname
    FROM cell_multiplication_plans cmp
    JOIN cell_groups pcg ON cmp.parent_cell_id = pcg.id
    LEFT JOIN members pl ON cmp.primary_leader_id = pl.id
    LEFT JOIN members al ON cmp.apprentice_leader_id = al.id
    LEFT JOIN members coord ON cmp.coordinator = coord.id
    WHERE cmp.church_id = $1
  `;

  const params = [churchId];
  let paramIndex = 2;

  if (filters.status) {
    query += ` AND cmp.status = $${paramIndex}`;
    params.push(filters.status);
    paramIndex++;
  }

  if (filters.parent_cell_id) {
    query += ` AND cmp.parent_cell_id = $${paramIndex}`;
    params.push(filters.parent_cell_id);
    paramIndex++;
  }

  query += ` ORDER BY cmp.target_multiplication_date ASC, cmp.status ASC`;

  const result = await db.query(query, params);
  return result.rows;
}

// Growth Targets CRUD
export async function createGrowthTarget(data) {
  const {
    church_id,
    target_year,
    target_period,
    target_members,
    target_cells,
    target_conversions,
    target_baptisms,
    target_leaders_developed,
    target_cells_multiplied,
    target_disciples_made,
    target_giving,
    target_missions_giving,
    set_by
  } = data;

  const result = await db.query(`
    INSERT INTO growth_targets (
      church_id, target_year, target_period, target_members, target_cells,
      target_conversions, target_baptisms, target_leaders_developed,
      target_cells_multiplied, target_disciples_made, target_giving,
      target_missions_giving, set_by
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13
    ) RETURNING *
  `, [
    church_id, target_year, target_period, target_members, target_cells,
    target_conversions, target_baptisms, target_leaders_developed,
    target_cells_multiplied, target_disciples_made, target_giving,
    target_missions_giving, set_by
  ]);

  return result.rows[0];
}

export async function getGrowthTargets(churchId, filters = {}) {
  let query = `
    SELECT
      gt.*,
      sb.first_name as set_by_first_name, sb.surname as set_by_surname
    FROM growth_targets gt
    LEFT JOIN members sb ON gt.set_by = sb.id
    WHERE gt.church_id = $1
  `;

  const params = [churchId];
  let paramIndex = 2;

  if (filters.target_year) {
    query += ` AND gt.target_year = $${paramIndex}`;
    params.push(filters.target_year);
    paramIndex++;
  }

  if (filters.target_period) {
    query += ` AND gt.target_period = $${paramIndex}`;
    params.push(filters.target_period);
    paramIndex++;
  }

  query += ` ORDER BY gt.target_year DESC, gt.target_period ASC`;

  const result = await db.query(query, params);
  return result.rows;
}

// Analytics and Reporting Functions
export async function getCellGrowthAnalytics(churchId, dateRange = {}) {
  const { start_date, end_date } = dateRange;

  let dateFilter = '';
  const params = [churchId];
  let paramIndex = 2;

  if (start_date) {
    dateFilter += ` AND metric_date >= $${paramIndex}`;
    params.push(start_date);
    paramIndex++;
  }

  if (end_date) {
    dateFilter += ` AND metric_date <= $${paramIndex}`;
    params.push(end_date);
    paramIndex++;
  }

  const result = await db.query(`
    SELECT
      COUNT(DISTINCT cell_group_id) as active_cells,
      SUM(attendance_count) as total_attendance,
      SUM(visitor_count) as total_visitors,
      SUM(new_conversions) as total_conversions,
      SUM(baptisms) as total_baptisms,
      AVG(multiplication_readiness_score) as avg_multiplication_readiness,
      COUNT(CASE WHEN multiplication_readiness_score >= 8 THEN 1 END) as cells_ready_to_multiply
    FROM cell_performance_metrics
    WHERE church_id = $1 ${dateFilter}
  `, params);

  return result.rows[0];
}

export async function getLeadershipDevelopmentStats(churchId) {
  const result = await db.query(`
    SELECT
      development_stage,
      COUNT(*) as count,
      AVG(leadership_potential) as avg_potential,
      COUNT(CASE WHEN ready_for_multiplication = true THEN 1 END) as ready_for_multiplication
    FROM leadership_pipeline
    WHERE church_id = $1
    GROUP BY development_stage
    ORDER BY development_stage ASC
  `, [churchId]);

  return result.rows;
}

export async function getMultiplicationSuccessRate(churchId) {
  const result = await db.query(`
    SELECT
      COUNT(*) as total_plans,
      COUNT(CASE WHEN status = 'completed' THEN 1 END) as successful_multiplications,
      AVG(launch_success_rating) as avg_success_rating,
      COUNT(CASE WHEN status = 'launched' THEN 1 END) as active_plans
    FROM cell_multiplication_plans
    WHERE church_id = $1
  `, [churchId]);

  return result.rows[0];
}

export async function getCellsNeedingAttention(churchId) {
  // Get cells with declining health or overdue assessments
  const result = await db.query(`
    SELECT DISTINCT
      cg.id, cg.name,
      cha.overall_health_score,
      cha.health_trends,
      cha.next_review_date,
      cha.assessment_date
    FROM cell_groups cg
    LEFT JOIN cell_health_assessments cha ON cg.id = cha.cell_group_id
      AND cha.assessment_date = (
        SELECT MAX(assessment_date)
        FROM cell_health_assessments
        WHERE cell_group_id = cg.id
      )
    WHERE cg.church_id = $1
    AND (
      cha.overall_health_score < 6
      OR cha.health_trends = 'declining'
      OR cha.next_review_date <= CURRENT_DATE
      OR cha.id IS NULL
    )
  `, [churchId]);

  return result.rows;
}