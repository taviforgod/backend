import db from '../config/db.js';

// Report Templates CRUD
export async function createReportTemplate(data) {
  const {
    church_id,
    template_name,
    template_type,
    description,
    report_sections,
    default_filters,
    auto_generate,
    generation_schedule,
    generation_day,
    email_recipients,
    notification_recipients,
    created_by
  } = data;

  const result = await db.query(`
    INSERT INTO report_templates (
      church_id, template_name, template_type, description, report_sections,
      default_filters, auto_generate, generation_schedule, generation_day,
      email_recipients, notification_recipients, created_by
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12
    ) RETURNING *
  `, [
    church_id, template_name, template_type, description,
    JSON.stringify(report_sections || []),
    JSON.stringify(default_filters || {}),
    auto_generate, generation_schedule, generation_day,
    JSON.stringify(email_recipients || []),
    JSON.stringify(notification_recipients || []),
    created_by
  ]);

  return result.rows[0];
}

export async function getReportTemplates(churchId, filters = {}) {
  let query = `
    SELECT
      rt.*,
      cb.first_name as created_by_first_name, cb.surname as created_by_surname
    FROM report_templates rt
    LEFT JOIN members cb ON rt.created_by = cb.id
    WHERE rt.church_id = $1
  `;

  const params = [churchId];
  let paramIndex = 2;

  if (filters.template_type) {
    query += ` AND rt.template_type = $${paramIndex}`;
    params.push(filters.template_type);
    paramIndex++;
  }

  if (filters.is_active !== undefined) {
    query += ` AND rt.is_active = $${paramIndex}`;
    params.push(filters.is_active);
    paramIndex++;
  }

  query += ` ORDER BY rt.template_name ASC`;

  if (filters.limit) {
    query += ` LIMIT $${paramIndex}`;
    params.push(filters.limit);
    paramIndex++;
  }

  const result = await db.query(query, params);
  return result.rows;
}

// Generated Reports CRUD
export async function createGeneratedReport(data) {
  const {
    church_id,
    template_id,
    report_name,
    report_type,
    report_period_start,
    report_period_end,
    report_data,
    executive_summary,
    key_insights,
    file_path,
    file_format,
    file_size,
    generation_status,
    delivery_status,
    email_recipients,
    generated_by
  } = data;

  const result = await db.query(`
    INSERT INTO generated_reports (
      church_id, template_id, report_name, report_type, report_period_start,
      report_period_end, report_data, executive_summary, key_insights,
      file_path, file_format, file_size, generation_status, delivery_status,
      email_recipients, generated_by
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16
    ) RETURNING *
  `, [
    church_id, template_id, report_name, report_type, report_period_start,
    report_period_end, JSON.stringify(report_data || {}),
    executive_summary, key_insights, file_path, file_format, file_size,
    generation_status, delivery_status, JSON.stringify(email_recipients || []),
    generated_by
  ]);

  return result.rows[0];
}

export async function getGeneratedReports(churchId, filters = {}) {
  let query = `
    SELECT
      gr.*,
      rt.template_name,
      gb.first_name as generated_by_first_name, gb.surname as generated_by_surname
    FROM generated_reports gr
    LEFT JOIN report_templates rt ON gr.template_id = rt.id
    LEFT JOIN members gb ON gr.generated_by = gb.id
    WHERE gr.church_id = $1
  `;

  const params = [churchId];
  let paramIndex = 2;

  if (filters.report_type) {
    query += ` AND gr.report_type = $${paramIndex}`;
    params.push(filters.report_type);
    paramIndex++;
  }

  if (filters.generation_status) {
    query += ` AND gr.generation_status = $${paramIndex}`;
    params.push(filters.generation_status);
    paramIndex++;
  }

  if (filters.template_id) {
    query += ` AND gr.template_id = $${paramIndex}`;
    params.push(filters.template_id);
    paramIndex++;
  }

  query += ` ORDER BY gr.generated_date DESC`;

  if (filters.limit) {
    query += ` LIMIT $${paramIndex}`;
    params.push(filters.limit);
    paramIndex++;
  }

  const result = await db.query(query, params);
  return result.rows;
}

export async function updateReportStatus(reportId, churchId, status, errorMessage = null) {
  const result = await db.query(`
    UPDATE generated_reports
    SET generation_status = $1, error_message = $2, updated_at = NOW()
    WHERE id = $3 AND church_id = $4
    RETURNING *
  `, [status, errorMessage, reportId, churchId]);

  return result.rows[0];
}

// Report Section Configurations
export async function getReportSectionConfigs(churchId, sectionType = null) {
  let query = `
    SELECT * FROM report_section_configs
    WHERE church_id = $1 AND is_active = TRUE
  `;

  const params = [churchId];

  if (sectionType) {
    query += ` AND section_type = $2`;
    params.push(sectionType);
  }

  query += ` ORDER BY display_order ASC`;

  const result = await db.query(query, params);
  return result.rows;
}

// Consolidated Report Data Generation Functions
export async function generateMonthlyReportData(churchId, reportPeriod) {
  const { start_date, end_date } = reportPeriod;

  // Parallel data collection from all modules
  const [
    givingData,
    attendanceData,
    growthData,
    cellHealthData,
    leadershipData,
    wellnessData,
    discipleshipData,
    conflictData,
    celebrationData
  ] = await Promise.all([
    getGivingReportData(churchId, { start_date, end_date }),
    getAttendanceReportData(churchId, { start_date, end_date }),
    getGrowthReportData(churchId, { start_date, end_date }),
    getCellHealthReportData(churchId, { start_date, end_date }),
    getLeadershipReportData(churchId),
    getWellnessReportData(churchId, { start_date, end_date }),
    getDiscipleshipReportData(churchId, { start_date, end_date }),
    getConflictReportData(churchId, { start_date, end_date }),
    getCelebrationReportData(churchId, { start_date, end_date })
  ]);

  return {
    giving: givingData,
    attendance: attendanceData,
    growth: growthData,
    cell_health: cellHealthData,
    leadership: leadershipData,
    wellness: wellnessData,
    discipleship: discipleshipData,
    conflicts: conflictData,
    celebrations: celebrationData,
    generated_at: new Date(),
    report_period: { start_date, end_date }
  };
}

// Individual module data collection functions
async function getGivingReportData(churchId, dateRange) {
  const result = await db.query(`
    SELECT
      SUM(amount) as total_giving,
      COUNT(*) as total_contributions,
      COUNT(DISTINCT member_id) as active_givers,
      AVG(amount) as average_gift,
      SUM(CASE WHEN giving_type = 'tithe' THEN amount ELSE 0 END) as tithe_total,
      SUM(CASE WHEN giving_type = 'offering' THEN amount ELSE 0 END) as offering_total,
      SUM(CASE WHEN giving_type = 'special_offering' THEN amount ELSE 0 END) as special_offering_total
    FROM giving_log
    WHERE church_id = $1 AND giving_date BETWEEN $2 AND $3 AND is_anonymous = FALSE
  `, [churchId, dateRange.start_date, dateRange.end_date]);

  return result.rows[0] || {};
}

async function getAttendanceReportData(churchId, dateRange) {
  const result = await db.query(`
    SELECT
      SUM(attendance_count) as total_attendance,
      AVG(attendance_count) as average_attendance,
      SUM(visitor_count) as total_visitors,
      COUNT(DISTINCT cell_group_id) as active_cells,
      SUM(member_count) as total_members_reached
    FROM cell_performance_metrics
    WHERE church_id = $1 AND metric_date BETWEEN $2 AND $3
  `, [churchId, dateRange.start_date, dateRange.end_date]);

  return result.rows[0] || {};
}

async function getGrowthReportData(churchId, dateRange) {
  const result = await db.query(`
    SELECT
      SUM(new_conversions) as total_conversions,
      SUM(baptisms) as total_baptisms,
      SUM(foundation_school_graduates) as foundation_graduates,
      AVG(multiplication_readiness_score) as avg_multiplication_readiness
    FROM cell_performance_metrics
    WHERE church_id = $1 AND metric_date BETWEEN $2 AND $3
  `, [churchId, dateRange.start_date, dateRange.end_date]);

  return result.rows[0] || {};
}

async function getCellHealthReportData(churchId, dateRange) {
  const result = await db.query(`
    SELECT
      AVG(overall_health_score) as avg_health_score,
      COUNT(CASE WHEN wbs_stage = 'win' THEN 1 END) as cells_in_win_stage,
      COUNT(CASE WHEN wbs_stage = 'build' THEN 1 END) as cells_in_build_stage,
      COUNT(CASE WHEN wbs_stage = 'send' THEN 1 END) as cells_in_send_stage,
      COUNT(CASE WHEN wbs_stage = 'multiply' THEN 1 END) as cells_in_multiply_stage
    FROM cell_health_assessments
    WHERE church_id = $1 AND assessment_date BETWEEN $2 AND $3
  `, [churchId, dateRange.start_date, dateRange.end_date]);

  return result.rows[0] || {};
}

async function getLeadershipReportData(churchId) {
  const result = await db.query(`
    SELECT
      COUNT(*) as total_leaders,
      COUNT(CASE WHEN development_stage = 'potential' THEN 1 END) as potential_leaders,
      COUNT(CASE WHEN development_stage = 'apprentice' THEN 1 END) as apprentice_leaders,
      COUNT(CASE WHEN development_stage = 'trained' THEN 1 END) as trained_leaders,
      COUNT(CASE WHEN development_stage = 'leading' THEN 1 END) as active_leaders,
      COUNT(CASE WHEN development_stage = 'multiplying' THEN 1 END) as multiplying_leaders,
      COUNT(CASE WHEN ready_for_multiplication = true THEN 1 END) as ready_for_multiplication
    FROM leadership_pipeline
    WHERE church_id = $1
  `, [churchId]);

  return result.rows[0] || {};
}

async function getWellnessReportData(churchId, dateRange) {
  const burnoutResult = await db.query(`
    SELECT
      COUNT(CASE WHEN overall_risk_level = 'critical' THEN 1 END) as critical_risk,
      COUNT(CASE WHEN overall_risk_level = 'high' THEN 1 END) as high_risk,
      COUNT(CASE WHEN overall_risk_level = 'moderate' THEN 1 END) as moderate_risk,
      COUNT(CASE WHEN overall_risk_level = 'low' THEN 1 END) as low_risk
    FROM burnout_assessments
    WHERE church_id = $1 AND assessment_date BETWEEN $2 AND $3
  `, [churchId, dateRange.start_date, dateRange.end_date]);

  const wellnessResult = await db.query(`
    SELECT
      AVG(energy_level) as avg_energy,
      AVG(stress_level) as avg_stress,
      AVG(spiritual_connection) as avg_spiritual_connection,
      COUNT(*) as wellness_checkins
    FROM wellness_checkins
    WHERE church_id = $1 AND checkin_date BETWEEN $2 AND $3
  `, [churchId, dateRange.start_date, dateRange.end_date]);

  return {
    burnout_risk: burnoutResult.rows[0] || {},
    wellness_checkins: wellnessResult.rows[0] || {}
  };
}

async function getDiscipleshipReportData(churchId, dateRange) {
  const plansResult = await db.query(`
    SELECT
      COUNT(*) as total_plans,
      COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_plans,
      COUNT(CASE WHEN status = 'active' THEN 1 END) as active_plans
    FROM personal_growth_plans
    WHERE church_id = $1
  `, [churchId]);

  const disciplinesResult = await db.query(`
    SELECT
      AVG(CASE WHEN bible_reading THEN 1 ELSE 0 END) * 100 as bible_reading_percentage,
      AVG(CASE WHEN prayer_time THEN 1 ELSE 0 END) * 100 as prayer_percentage,
      AVG(CASE WHEN fasting THEN 1 ELSE 0 END) * 100 as fasting_percentage,
      COUNT(*) as discipline_records
    FROM spiritual_disciplines
    WHERE church_id = $1 AND discipline_date BETWEEN $2 AND $3
  `, [churchId, dateRange.start_date, dateRange.end_date]);

  return {
    growth_plans: plansResult.rows[0] || {},
    spiritual_disciplines: disciplinesResult.rows[0] || {}
  };
}

async function getConflictReportData(churchId, dateRange) {
  const result = await db.query(`
    SELECT
      COUNT(*) as total_conflicts,
      COUNT(CASE WHEN status = 'resolved' THEN 1 END) as resolved_conflicts,
      COUNT(CASE WHEN status = 'investigating' THEN 1 END) as investigating_conflicts,
      COUNT(CASE WHEN status = 'mediating' THEN 1 END) as mediating_conflicts,
      AVG(resolution_date::date - reported_date::date) FILTER (WHERE resolution_date IS NOT NULL AND reported_date IS NOT NULL) as avg_resolution_days
    FROM conflict_logs
    WHERE church_id = $1 AND reported_date BETWEEN $2 AND $3
  `, [churchId, dateRange.start_date, dateRange.end_date]);

  return result.rows[0] || {};
}

async function getCelebrationReportData(churchId, dateRange) {
  const eventsResult = await db.query(`
    SELECT
      COUNT(*) as total_events,
      COUNT(CASE WHEN planning_status = 'completed' THEN 1 END) as completed_events,
      COUNT(DISTINCT primary_member) as members_celebrated
    FROM celebration_events
    WHERE church_id = $1 AND event_date BETWEEN $2 AND $3
  `, [churchId, dateRange.start_date, dateRange.end_date]);

  const testimoniesResult = await db.query(`
    SELECT
      COUNT(*) as total_testimonies,
      COUNT(CASE WHEN is_approved = true THEN 1 END) as approved_testimonies,
      COUNT(CASE WHEN is_published = true THEN 1 END) as published_testimonies
    FROM testimony_log
    WHERE church_id = $1 AND testimony_date BETWEEN $2 AND $3
  `, [churchId, dateRange.start_date, dateRange.end_date]);

  return {
    celebration_events: eventsResult.rows[0] || {},
    testimonies: testimoniesResult.rows[0] || {}
  };
}

// Executive Summary Generation
export function generateExecutiveSummary(reportData) {
  const { giving, attendance, growth, cell_health, leadership, wellness } = reportData;

  let summary = `Monthly Ministry Overview Report\n\n`;

  summary += `FINANCIAL PERFORMANCE:\n`;
  summary += `- Total Giving: $${giving.total_giving?.toFixed(2) || '0.00'}\n`;
  summary += `- Active Givers: ${giving.active_givers || 0}\n`;
  summary += `- Average Gift: $${giving.average_gift?.toFixed(2) || '0.00'}\n\n`;

  summary += `ATTENDANCE & GROWTH:\n`;
  summary += `- Total Attendance: ${attendance.total_attendance || 0}\n`;
  summary += `- Average Attendance: ${attendance.average_attendance?.toFixed(0) || 0}\n`;
  summary += `- New Conversions: ${growth.total_conversions || 0}\n`;
  summary += `- Baptisms: ${growth.total_baptisms || 0}\n\n`;

  summary += `CELL MINISTRY HEALTH:\n`;
  summary += `- Average Health Score: ${cell_health.avg_health_score?.toFixed(1) || 'N/A'}/10\n`;
  summary += `- Cells in Win Stage: ${cell_health.cells_in_win_stage || 0}\n`;
  summary += `- Cells in Build Stage: ${cell_health.cells_in_build_stage || 0}\n`;
  summary += `- Cells Ready to Multiply: ${cell_health.cells_in_send_stage || 0}\n\n`;

  summary += `LEADERSHIP DEVELOPMENT:\n`;
  summary += `- Total Leaders in Pipeline: ${leadership.total_leaders || 0}\n`;
  summary += `- Active Leaders: ${leadership.active_leaders || 0}\n`;
  summary += `- Ready for Multiplication: ${leadership.ready_for_multiplication || 0}\n\n`;

  summary += `WELLNESS & BURNOUT PREVENTION:\n`;
  summary += `- Critical Burnout Risk: ${wellness.burnout_risk?.critical_risk || 0}\n`;
  summary += `- High Burnout Risk: ${wellness.burnout_risk?.high_risk || 0}\n`;
  summary += `- Wellness Check-ins: ${wellness.wellness_checkins?.wellness_checkins || 0}\n`;

  return summary;
}

// Key Insights Generation
export function generateKeyInsights(reportData) {
  const insights = [];

  const { giving, attendance, growth, cell_health, leadership, wellness } = reportData;

  // Financial insights
  if (giving.total_giving > 0) {
    insights.push(`💰 Financial Health: ${giving.active_givers} active givers contributing $${giving.total_giving?.toFixed(2)}`);
  }

  // Growth insights
  if (growth.total_conversions > 0) {
    insights.push(`📈 Evangelism Impact: ${growth.total_conversions} new conversions this month`);
  }

  // Cell health insights
  if (cell_health.avg_health_score >= 7) {
    insights.push(`✅ Strong Cell Health: Average health score of ${cell_health.avg_health_score?.toFixed(1)}/10`);
  } else if (cell_health.avg_health_score < 6) {
    insights.push(`⚠️ Cell Health Concern: Average health score of ${cell_health.avg_health_score?.toFixed(1)}/10 requires attention`);
  }

  // Leadership insights
  if (leadership.ready_for_multiplication > 0) {
    insights.push(`🚀 Leadership Growth: ${leadership.ready_for_multiplication} leaders ready for multiplication`);
  }

  // Wellness insights
  const totalHighRisk = (wellness.burnout_risk?.critical_risk || 0) + (wellness.burnout_risk?.high_risk || 0);
  if (totalHighRisk > 0) {
    insights.push(`🩺 Wellness Alert: ${totalHighRisk} leaders at high/critical burnout risk`);
  }

  return insights.join('\n');
}