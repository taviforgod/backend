import pool from '../config/db.js';

// Report Types and Categories
const REPORT_CATEGORIES = {
  FINANCIAL: 'financial',
  ATTENDANCE: 'attendance',
  MINISTRY_HEALTH: 'ministry_health',
  LEADERSHIP: 'leadership',
  DISCIPLESHIP: 'discipleship',
  CRISIS_CARE: 'crisis_care',
  PERSONAL_GROWTH: 'personal_growth',
  RELATIONSHIPS: 'relationships',
  OUTREACH: 'outreach',
  COMPREHENSIVE: 'comprehensive'
};

const REPORT_TYPES = {
  // Financial Reports
  GIVING_SUMMARY: 'giving_summary',
  GIVING_TRENDS: 'giving_trends',
  FINANCIAL_OVERVIEW: 'financial_overview',

  // Attendance & Growth Reports
  ATTENDANCE_REPORT: 'attendance_report',
  GROWTH_METRICS: 'growth_metrics',
  CELL_PERFORMANCE: 'cell_performance',

  // Ministry Health Reports
  CELL_HEALTH_ASSESSMENT: 'cell_health_assessment',
  MINISTRY_EFFECTIVENESS: 'ministry_effectiveness',
  HEALTH_TRENDS: 'health_trends',

  // Leadership Reports
  LEADERSHIP_PIPELINE: 'leadership_pipeline',
  LEADERSHIP_DEVELOPMENT: 'leadership_development',
  MULTIPLICATION_READINESS: 'multiplication_readiness',

  // Discipleship Reports
  FOUNDATION_SCHOOL_PROGRESS: 'foundation_school_progress',
  SPIRITUAL_GROWTH_TRACKING: 'spiritual_growth_tracking',
  BAPTISM_PREPARATION: 'baptism_preparation',

  // Crisis Care Reports
  CRISIS_CASE_SUMMARY: 'crisis_case_summary',
  CRISIS_INTERVENTION_OUTCOMES: 'crisis_intervention_outcomes',
  CRISIS_RESOURCE_UTILIZATION: 'crisis_resource_utilization',

  // Personal Growth Reports
  GROWTH_PLAN_PROGRESS: 'growth_plan_progress',
  BURNOUT_RISK_ASSESSMENT: 'burnout_risk_assessment',
  WELLNESS_TRACKING: 'wellness_tracking',

  // Relationship Reports
  CONFLICT_RESOLUTION: 'conflict_resolution',
  CELEBRATION_EVENTS: 'celebration_events',
  COMMUNITY_ENGAGEMENT: 'community_engagement',

  // Outreach Reports
  OUTREACH_EVENTS: 'outreach_events',
  EVANGELISM_IMPACT: 'evangelism_impact',
  BAPTISM_REGISTER: 'baptism_register',

  // Comprehensive Reports
  MONTHLY_MINISTRY_OVERVIEW: 'monthly_ministry_overview',
  QUARTERLY_CHURCH_REPORT: 'quarterly_church_report',
  ANNUAL_MINISTRY_REVIEW: 'annual_ministry_review'
};

function withTitle(report, title) {
  if (!report || typeof report !== 'object') return report;
  return { ...report, title: title || report.title };
}

// Generate reports based on type and parameters
export async function generateReport(reportType, params) {
  const { church_id, start_date, end_date, filters = {} } = params;

  // Validate and parse dates
  if (!start_date || !end_date) {
    throw new Error('Start date and end date are required for report generation');
  }

  // Ensure dates are in proper format
  let parsedStartDate, parsedEndDate;
  try {
    parsedStartDate = new Date(start_date).toISOString().split('T')[0];
    parsedEndDate = new Date(end_date).toISOString().split('T')[0];
  } catch (error) {
    throw new Error('Invalid date format provided');
  }

  const validatedParams = {
    ...params,
    start_date: parsedStartDate,
    end_date: parsedEndDate
  };

  switch (reportType) {
    // Financial
    case REPORT_TYPES.GIVING_SUMMARY:
      return await generateGivingSummaryReport(church_id, { ...validatedParams, ...filters });
    case REPORT_TYPES.GIVING_TRENDS:
      return withTitle(
        await generateGivingSummaryReport(church_id, { ...validatedParams, ...filters }),
        'Giving Trends Report'
      );
    case REPORT_TYPES.FINANCIAL_OVERVIEW:
      return withTitle(
        await generateGivingSummaryReport(church_id, { ...validatedParams, ...filters }),
        'Financial Overview Report'
      );

    // Attendance & Growth
    case REPORT_TYPES.ATTENDANCE_REPORT:
      return await generateAttendanceReport(church_id, { ...validatedParams, ...filters });
    case REPORT_TYPES.GROWTH_METRICS:
      return withTitle(
        await generateAttendanceReport(church_id, { ...validatedParams, ...filters }),
        'Growth Metrics Report'
      );
    case REPORT_TYPES.CELL_PERFORMANCE:
      return withTitle(
        await generateAttendanceReport(church_id, { ...validatedParams, ...filters }),
        'Cell Performance Report'
      );

    // Ministry Health
    case REPORT_TYPES.CELL_HEALTH_ASSESSMENT:
      return await generateCellHealthReport(church_id, { ...validatedParams, ...filters });
    case REPORT_TYPES.MINISTRY_EFFECTIVENESS:
      return withTitle(
        await generateCellHealthReport(church_id, { ...validatedParams, ...filters }),
        'Ministry Effectiveness Report'
      );
    case REPORT_TYPES.HEALTH_TRENDS:
      return withTitle(
        await generateCellHealthReport(church_id, { ...validatedParams, ...filters }),
        'Health Trends Report'
      );

    // Leadership
    case REPORT_TYPES.LEADERSHIP_PIPELINE:
      return await generateLeadershipReport(church_id, { ...validatedParams, ...filters });
    case REPORT_TYPES.LEADERSHIP_DEVELOPMENT:
      return withTitle(
        await generateLeadershipReport(church_id, { ...validatedParams, ...filters }),
        'Leadership Development Report'
      );
    case REPORT_TYPES.MULTIPLICATION_READINESS:
      return withTitle(
        await generateLeadershipReport(church_id, { ...validatedParams, ...filters }),
        'Multiplication Readiness Report'
      );

    // Discipleship
    case REPORT_TYPES.FOUNDATION_SCHOOL_PROGRESS:
      return await generateDiscipleshipReport(church_id, { ...validatedParams, ...filters });
    case REPORT_TYPES.SPIRITUAL_GROWTH_TRACKING:
      return withTitle(
        await generateDiscipleshipReport(church_id, { ...validatedParams, ...filters }),
        'Spiritual Growth Tracking Report'
      );
    case REPORT_TYPES.BAPTISM_PREPARATION:
      return withTitle(
        await generateDiscipleshipReport(church_id, { ...validatedParams, ...filters }),
        'Baptism Preparation Report'
      );

    // Crisis Care
    case REPORT_TYPES.CRISIS_CASE_SUMMARY:
      return await generateCrisisCareReport(church_id, { ...validatedParams, ...filters });
    case REPORT_TYPES.CRISIS_INTERVENTION_OUTCOMES:
      return withTitle(
        await generateCrisisCareReport(church_id, { ...validatedParams, ...filters }),
        'Crisis Intervention Outcomes Report'
      );
    case REPORT_TYPES.CRISIS_RESOURCE_UTILIZATION:
      return withTitle(
        await generateCrisisCareReport(church_id, { ...validatedParams, ...filters }),
        'Crisis Resource Utilization Report'
      );

    // Personal Growth
    case REPORT_TYPES.GROWTH_PLAN_PROGRESS:
      return await generatePersonalGrowthReport(church_id, { ...validatedParams, ...filters });
    case REPORT_TYPES.BURNOUT_RISK_ASSESSMENT:
      return withTitle(
        await generatePersonalGrowthReport(church_id, { ...validatedParams, ...filters }),
        'Burnout Risk Assessment Report'
      );
    case REPORT_TYPES.WELLNESS_TRACKING:
      return withTitle(
        await generatePersonalGrowthReport(church_id, { ...validatedParams, ...filters }),
        'Wellness Tracking Report'
      );

    // Relationships
    case REPORT_TYPES.CONFLICT_RESOLUTION:
      return await generateConflictResolutionReport(church_id, { ...validatedParams, ...filters });
    case REPORT_TYPES.CELEBRATION_EVENTS:
      return await generateCelebrationEventsReport(church_id, { ...validatedParams, ...filters });
    case REPORT_TYPES.COMMUNITY_ENGAGEMENT:
      return await generateCommunityEngagementReport(church_id, { ...validatedParams, ...filters });

    // Outreach
    case REPORT_TYPES.OUTREACH_EVENTS:
      return await generateOutreachReport(church_id, { ...validatedParams, ...filters });
    case REPORT_TYPES.EVANGELISM_IMPACT:
      return withTitle(
        await generateOutreachReport(church_id, { ...validatedParams, ...filters }),
        'Evangelism Impact Report'
      );
    case REPORT_TYPES.BAPTISM_REGISTER:
      return withTitle(
        await generateOutreachReport(church_id, { ...validatedParams, ...filters }),
        'Baptism Register Report'
      );

    // Comprehensive
    case REPORT_TYPES.MONTHLY_MINISTRY_OVERVIEW:
      return await generateMonthlyOverviewReport(church_id, { ...validatedParams, ...filters });
    case REPORT_TYPES.QUARTERLY_CHURCH_REPORT:
      return withTitle(
        await generateMonthlyOverviewReport(church_id, { ...validatedParams, ...filters }),
        'Quarterly Church Report'
      );
    case REPORT_TYPES.ANNUAL_MINISTRY_REVIEW:
      return withTitle(
        await generateMonthlyOverviewReport(church_id, { ...validatedParams, ...filters }),
        'Annual Ministry Review'
      );
    default:
      throw new Error(`Unknown report type: ${reportType}`);
  }
}

// FINANCIAL REPORTS

async function generateGivingSummaryReport(churchId, params) {
  const { start_date, end_date, member_id, giving_type } = params;

  // Validate required parameters
  if (!start_date || !end_date) {
    throw new Error('Start date and end date are required for giving summary report');
  }

  let query = `
    SELECT
      DATE_TRUNC('month', giving_date) as month,
      COUNT(*) as total_contributions,
      COUNT(DISTINCT member_id) as active_givers,
      SUM(amount) as total_amount,
      AVG(amount) as average_gift,
      SUM(CASE WHEN giving_type = 'tithe' THEN amount ELSE 0 END) as tithe_amount,
      SUM(CASE WHEN giving_type = 'offering' THEN amount ELSE 0 END) as offering_amount,
      SUM(CASE WHEN giving_type = 'special_offering' THEN amount ELSE 0 END) as special_offering_amount
    FROM giving_log
    WHERE church_id = $1 AND giving_date BETWEEN $2 AND $3
  `;

  const values = [churchId, start_date, end_date];
  let paramIndex = 4;

  if (member_id) {
    query += ` AND member_id = $${paramIndex++}`;
    values.push(member_id);
  }

  if (giving_type) {
    query += ` AND giving_type = $${paramIndex++}`;
    values.push(giving_type);
  }

  query += ` GROUP BY DATE_TRUNC('month', giving_date) ORDER BY month DESC`;

  const { rows } = await pool.query(query, values);

  // Get top givers
  const topGiversQuery = `
    SELECT
      m.first_name, m.surname,
      SUM(gl.amount) as total_given,
      COUNT(gl.id) as contribution_count
    FROM giving_log gl
    JOIN members m ON gl.member_id = m.id
    WHERE gl.church_id = $1 AND gl.giving_date BETWEEN $2 AND $3 AND gl.is_anonymous = FALSE
    GROUP BY m.id, m.first_name, m.surname
    ORDER BY total_given DESC
    LIMIT 10
  `;

  const topGivers = await pool.query(topGiversQuery, [churchId, start_date, end_date]);

  return {
    title: 'Giving Summary Report',
    period: { start_date, end_date },
    summary: {
      total_contributions: rows.reduce((sum, row) => sum + parseInt(row.total_contributions), 0),
      total_amount: rows.reduce((sum, row) => sum + parseFloat(row.total_amount), 0),
      active_givers: rows.length > 0 ? Math.max(...rows.map(row => parseInt(row.active_givers || 0))) : 0,
      average_gift: rows.length > 0 ? rows.reduce((sum, row) => sum + parseFloat(row.average_gift || 0), 0) / rows.length : 0
    },
    monthly_data: rows,
    top_givers: topGivers.rows,
    generated_at: new Date()
  };
}

// ATTENDANCE & GROWTH REPORTS

async function generateAttendanceReport(churchId, params) {
  const { start_date, end_date } = params;

  const attendanceQuery = `
    SELECT
      DATE_TRUNC('week', cm.metric_date) as week,
      SUM(cm.attendance_count) as total_attendance,
      AVG(cm.attendance_count) as avg_weekly_attendance,
      SUM(cm.visitor_count) as total_visitors,
      SUM(cm.member_count) as total_members_reached,
      COUNT(DISTINCT cm.cell_group_id) as active_cells
    FROM cell_performance_metrics cm
    WHERE cm.church_id = $1 AND cm.metric_date BETWEEN $2 AND $3
    GROUP BY DATE_TRUNC('week', cm.metric_date)
    ORDER BY week DESC
  `;

  const growthQuery = `
    SELECT
      DATE_TRUNC('month', cm.metric_date) as month,
      SUM(cm.new_conversions) as new_conversions,
      SUM(cm.baptisms) as baptisms,
      SUM(cm.foundation_school_graduates) as foundation_graduates,
      AVG(cm.multiplication_readiness_score) as avg_multiplication_readiness
    FROM cell_performance_metrics cm
    WHERE cm.church_id = $1 AND cm.metric_date BETWEEN $2 AND $3
    GROUP BY DATE_TRUNC('month', cm.metric_date)
    ORDER BY month DESC
  `;

  const [attendanceResult, growthResult] = await Promise.all([
    pool.query(attendanceQuery, [churchId, start_date, end_date]),
    pool.query(growthQuery, [churchId, start_date, end_date])
  ]);

  return {
    title: 'Attendance & Growth Report',
    period: { start_date, end_date },
    attendance: {
      summary: {
        total_attendance: attendanceResult.rows.reduce((sum, row) => sum + parseInt(row.total_attendance || 0), 0),
        average_weekly: attendanceResult.rows.length > 0 ?
          attendanceResult.rows.reduce((sum, row) => sum + parseFloat(row.avg_weekly_attendance || 0), 0) / attendanceResult.rows.length : 0,
        total_visitors: attendanceResult.rows.reduce((sum, row) => sum + parseInt(row.total_visitors || 0), 0),
        active_cells: attendanceResult.rows.length > 0 ? Math.max(...attendanceResult.rows.map(row => parseInt(row.active_cells || 0))) : 0
      },
      weekly_data: attendanceResult.rows
    },
    growth: {
      summary: {
        total_conversions: growthResult.rows.reduce((sum, row) => sum + parseInt(row.new_conversions || 0), 0),
        total_baptisms: growthResult.rows.reduce((sum, row) => sum + parseInt(row.baptisms || 0), 0),
        foundation_graduates: growthResult.rows.reduce((sum, row) => sum + parseInt(row.foundation_school_graduates || 0), 0)
      },
      monthly_data: growthResult.rows
    },
    generated_at: new Date()
  };
}

// CELL HEALTH REPORTS

async function generateCellHealthReport(churchId, params) {
  const { start_date, end_date } = params;

  const healthQuery = `
    SELECT
      DATE_TRUNC('month', cha.assessment_date) as month,
      AVG(cha.overall_health_score) as avg_health_score,
      COUNT(CASE WHEN cha.wbs_stage = 'win' THEN 1 END) as cells_in_win,
      COUNT(CASE WHEN cha.wbs_stage = 'build' THEN 1 END) as cells_in_build,
      COUNT(CASE WHEN cha.wbs_stage = 'send' THEN 1 END) as cells_in_send,
      COUNT(CASE WHEN cha.wbs_stage = 'multiply' THEN 1 END) as cells_in_multiply,
      COUNT(*) as total_assessments
    FROM cell_health_assessments cha
    WHERE cha.church_id = $1 AND cha.assessment_date BETWEEN $2 AND $3
    GROUP BY DATE_TRUNC('month', cha.assessment_date)
    ORDER BY month DESC
  `;

  const { rows } = await pool.query(healthQuery, [churchId, start_date, end_date]);

  // Get cell distribution by WBS stage
  const stageDistributionQuery = `
    SELECT
      wbs_stage,
      COUNT(*) as cell_count,
      AVG(overall_health_score) as avg_health_score
    FROM cell_health_assessments
    WHERE church_id = $1 AND assessment_date >= $2
    GROUP BY wbs_stage
    ORDER BY cell_count DESC
  `;

  const stageDistribution = await pool.query(stageDistributionQuery, [churchId, start_date]);

  return {
    title: 'Cell Health Assessment Report',
    period: { start_date, end_date },
    summary: {
      overall_health_score: rows.length > 0 ? rows.reduce((sum, row) => sum + parseFloat(row.avg_health_score || 0), 0) / rows.length : 0,
      total_assessments: rows.reduce((sum, row) => sum + parseInt(row.total_assessments), 0),
      cells_in_multiplication: rows.length > 0 ? Math.max(...rows.map(row => parseInt(row.cells_in_multiply || 0))) : 0
    },
    monthly_trends: rows,
    stage_distribution: stageDistribution.rows,
    generated_at: new Date()
  };
}

// LEADERSHIP REPORTS

async function generateLeadershipReport(churchId, params) {
  const { start_date, end_date } = params;

  const pipelineQuery = `
    SELECT
      development_stage,
      COUNT(*) as leader_count,
      AVG((COALESCE(leadership_potential, 0) + COALESCE(teaching_ability, 0) + COALESCE(evangelism_skills, 0) + COALESCE(discipleship_capability, 0) + COALESCE(administrative_skills, 0)) / 5.0) as avg_leadership_score,
      COUNT(CASE WHEN ready_for_multiplication = true THEN 1 END) as ready_for_multiplication
    FROM leadership_pipeline
    WHERE church_id = $1
    GROUP BY development_stage
    ORDER BY leader_count DESC
  `;

  const { rows: pipelineData } = await pool.query(pipelineQuery, [churchId]);

  // Leadership development progress over time
  const progressQuery = `
    SELECT
      DATE_TRUNC('month', created_at) as month,
      COUNT(*) as new_leaders_identified,
      COUNT(CASE WHEN development_stage IN ('trained', 'leading', 'multiplying') THEN 1 END) as leaders_developed
    FROM leadership_pipeline
    WHERE church_id = $1 AND created_at BETWEEN $2 AND $3
    GROUP BY DATE_TRUNC('month', created_at)
    ORDER BY month DESC
  `;

  const { rows: progressData } = await pool.query(progressQuery, [churchId, start_date, end_date]);

  return {
    title: 'Leadership Development Report',
    period: { start_date, end_date },
    pipeline_summary: {
      total_leaders: pipelineData.reduce((sum, row) => sum + parseInt(row.leader_count), 0),
      ready_for_multiplication: pipelineData.reduce((sum, row) => sum + parseInt(row.ready_for_multiplication), 0),
      avg_leadership_score: pipelineData.length > 0 ?
        pipelineData.reduce((sum, row) => sum + parseFloat(row.avg_leadership_score || 0), 0) / pipelineData.length : 0
    },
    pipeline_distribution: pipelineData,
    development_progress: progressData,
    generated_at: new Date()
  };
}

// DISCIPLESHIP REPORTS

async function generateDiscipleshipReport(churchId, params) {
  const { start_date, end_date } = params;

  // Foundation School Progress
  const foundationQuery = `
    SELECT
      COALESCE(fs.level, 1) as level,
      COUNT(*) as enrollment_count,
      COUNT(CASE WHEN fs.status = 'completed' THEN 1 END) as completed_count,
      AVG(COALESCE(fs.module_number, fs.current_module, 0)) as avg_progress,
      COUNT(CASE WHEN fs.next_session_date IS NOT NULL AND fs.next_session_date < CURRENT_DATE THEN 1 END) as overdue_sessions
    FROM foundation_school_enrollments fs
    WHERE fs.church_id = $1
    GROUP BY COALESCE(fs.level, 1)
    ORDER BY level
  `;

  // Spiritual Disciplines
  const disciplinesQuery = `
    SELECT
      DATE_TRUNC('month', sd.discipline_date) as month,
      COUNT(DISTINCT sd.member_id) as active_practitioners,
      AVG(CASE WHEN sd.bible_reading THEN 1 ELSE 0 END) * 100 as bible_reading_percentage,
      AVG(CASE WHEN sd.prayer_time THEN 1 ELSE 0 END) * 100 as prayer_percentage,
      AVG(CASE WHEN sd.fasting THEN 1 ELSE 0 END) * 100 as fasting_percentage
    FROM spiritual_disciplines sd
    WHERE sd.church_id = $1 AND sd.discipline_date BETWEEN $2 AND $3
    GROUP BY DATE_TRUNC('month', sd.discipline_date)
    ORDER BY month DESC
  `;

  // Baptism Preparation
  const baptismPrepQuery = `
    SELECT
      bc.status,
      COUNT(DISTINCT bc.id) as candidate_count,
      AVG(COALESCE(chk.completion_percentage, 0)) as avg_completion,
      COUNT(CASE WHEN br.baptism_date IS NOT NULL THEN 1 END) as baptized_count
    FROM baptism_candidates bc
    LEFT JOIN (
      SELECT
        candidate_id,
        CASE
          WHEN COUNT(*) = 0 THEN 0
          ELSE (COUNT(*) FILTER (WHERE is_completed) * 100.0 / COUNT(*))
        END as completion_percentage
      FROM baptism_prep_checklist
      GROUP BY candidate_id
    ) chk ON chk.candidate_id = bc.id
    LEFT JOIN baptism_records br ON br.candidate_id = bc.id
    WHERE bc.church_id = $1
    GROUP BY bc.status
  `;

  const [foundationResult, disciplinesResult, baptismResult] = await Promise.all([
    pool.query(foundationQuery, [churchId]),
    pool.query(disciplinesQuery, [churchId, start_date, end_date]),
    pool.query(baptismPrepQuery, [churchId])
  ]);

  return {
    title: 'Discipleship & Spiritual Growth Report',
    period: { start_date, end_date },
    foundation_school: {
      summary: {
        total_enrollments: foundationResult.rows.reduce((sum, row) => sum + parseInt(row.enrollment_count), 0),
        total_completions: foundationResult.rows.reduce((sum, row) => sum + parseInt(row.completed_count), 0),
        overdue_sessions: foundationResult.rows.reduce((sum, row) => sum + parseInt(row.overdue_sessions), 0)
      },
      by_level: foundationResult.rows
    },
    spiritual_disciplines: {
      summary: {
        active_practitioners: disciplinesResult.rows.length > 0 ?
          Math.max(...disciplinesResult.rows.map(row => parseInt(row.active_practitioners))) : 0,
        avg_bible_reading: disciplinesResult.rows.length > 0 ?
          disciplinesResult.rows.reduce((sum, row) => sum + parseFloat(row.bible_reading_percentage || 0), 0) / disciplinesResult.rows.length : 0
      },
      monthly_data: disciplinesResult.rows
    },
    baptism_preparation: {
      summary: {
        total_candidates: baptismResult.rows.reduce((sum, row) => sum + parseInt(row.candidate_count), 0),
        baptized_candidates: baptismResult.rows.reduce((sum, row) => sum + parseInt(row.baptized_count), 0)
      },
      by_status: baptismResult.rows
    },
    generated_at: new Date()
  };
}

// CRISIS CARE REPORTS

async function generateCrisisCareReport(churchId, params) {
  const { start_date, end_date } = params;

  // Crisis cases summary
  const crisisSummaryQuery = `
    SELECT
      DATE_TRUNC('month', cf.date_reported) as month,
      COUNT(*) as total_cases,
      COUNT(CASE WHEN cf.severity_level = 'critical' THEN 1 END) as critical_cases,
      COUNT(CASE WHEN cf.case_status = 'resolved' THEN 1 END) as resolved_cases,
      COUNT(CASE WHEN cf.case_status = 'closed' THEN 1 END) as closed_cases,
      AVG(cf.resolution_date::date - cf.date_reported::date) FILTER (WHERE cf.resolution_date IS NOT NULL AND cf.date_reported IS NOT NULL) as avg_resolution_days
    FROM crisis_followups cf
    WHERE cf.church_id = $1 AND cf.date_reported BETWEEN $2 AND $3
    GROUP BY DATE_TRUNC('month', cf.date_reported)
    ORDER BY month DESC
  `;

  // Risk assessment trends
  const riskAssessmentQuery = `
    SELECT
      DATE_TRUNC('month', ca.assessment_date) as month,
      COUNT(*) as total_assessments,
      COUNT(CASE WHEN ca.overall_risk_level = 'critical' THEN 1 END) as critical_risk,
      COUNT(CASE WHEN ca.overall_risk_level = 'high' THEN 1 END) as high_risk,
      COUNT(CASE WHEN ca.immediate_action_required = true THEN 1 END) as immediate_actions_required
    FROM crisis_assessments ca
    WHERE ca.church_id = $1 AND ca.assessment_date BETWEEN $2 AND $3
    GROUP BY DATE_TRUNC('month', ca.assessment_date)
    ORDER BY month DESC
  `;

  // Intervention outcomes
  const interventionQuery = `
    SELECT
      cip.plan_type,
      COUNT(*) as total_plans,
      COUNT(CASE WHEN cip.plan_status = 'completed' THEN 1 END) as completed_plans,
      AVG(CURRENT_DATE - cip.plan_start_date) FILTER (WHERE cip.plan_start_date IS NOT NULL) as avg_plan_duration_days
    FROM crisis_intervention_plans cip
    WHERE cip.church_id = $1 AND cip.created_at BETWEEN $2 AND $3
    GROUP BY cip.plan_type
  `;

  const [crisisSummary, riskAssessments, interventions] = await Promise.all([
    pool.query(crisisSummaryQuery, [churchId, start_date, end_date]),
    pool.query(riskAssessmentQuery, [churchId, start_date, end_date]),
    pool.query(interventionQuery, [churchId, start_date, end_date])
  ]);

  return {
    title: 'Crisis Care Report',
    period: { start_date, end_date },
    crisis_cases: {
      summary: {
        total_cases: crisisSummary.rows.reduce((sum, row) => sum + parseInt(row.total_cases), 0),
        critical_cases: crisisSummary.rows.reduce((sum, row) => sum + parseInt(row.critical_cases), 0),
        resolved_cases: crisisSummary.rows.reduce((sum, row) => sum + parseInt(row.resolved_cases), 0),
        avg_resolution_days: crisisSummary.rows.length > 0 ?
          crisisSummary.rows.reduce((sum, row) => sum + parseFloat(row.avg_resolution_days || 0), 0) / crisisSummary.rows.length : 0
      },
      monthly_data: crisisSummary.rows
    },
    risk_assessments: {
      summary: {
        total_assessments: riskAssessments.rows.reduce((sum, row) => sum + parseInt(row.total_assessments), 0),
        critical_risk_cases: riskAssessments.rows.reduce((sum, row) => sum + parseInt(row.critical_risk), 0),
        immediate_actions: riskAssessments.rows.reduce((sum, row) => sum + parseInt(row.immediate_actions_required), 0)
      },
      monthly_data: riskAssessments.rows
    },
    interventions: interventions.rows,
    generated_at: new Date()
  };
}

// PERSONAL GROWTH REPORTS

async function generatePersonalGrowthReport(churchId, params) {
  const { start_date, end_date } = params;

  // Growth plans progress
  const growthPlansQuery = `
    SELECT
      pgp.status,
      COUNT(*) as plan_count,
      AVG(pgp.overall_progress_percentage) as avg_completion,
      COUNT(CASE WHEN pgp.target_completion_date < CURRENT_DATE AND pgp.status <> 'completed' THEN 1 END) as overdue_plans
    FROM personal_growth_plans pgp
    WHERE pgp.church_id = $1
    GROUP BY pgp.status
  `;

  // Burnout risk assessment
  const burnoutQuery = `
    SELECT
      DATE_TRUNC('month', ba.assessment_date) as month,
      COUNT(*) as total_assessments,
      COUNT(CASE WHEN ba.overall_risk_level = 'critical' THEN 1 END) as critical_risk,
      COUNT(CASE WHEN ba.overall_risk_level = 'high' THEN 1 END) as high_risk,
      AVG(ba.emotional_exhaustion) as avg_emotional_exhaustion,
      AVG(ba.depersonalization) as avg_depersonalization
    FROM burnout_assessments ba
    WHERE ba.church_id = $1 AND ba.assessment_date BETWEEN $2 AND $3
    GROUP BY DATE_TRUNC('month', ba.assessment_date)
    ORDER BY month DESC
  `;

  // Wellness check-ins
  const wellnessQuery = `
    SELECT
      DATE_TRUNC('month', wc.checkin_date) as month,
      COUNT(*) as total_checkins,
      AVG(wc.energy_level) as avg_energy,
      AVG(wc.stress_level) as avg_stress,
      AVG(wc.spiritual_connection) as avg_spiritual_connection
    FROM wellness_checkins wc
    WHERE wc.church_id = $1 AND wc.checkin_date BETWEEN $2 AND $3
    GROUP BY DATE_TRUNC('month', wc.checkin_date)
    ORDER BY month DESC
  `;

  const [growthPlans, burnoutData, wellnessData] = await Promise.all([
    pool.query(growthPlansQuery, [churchId]),
    pool.query(burnoutQuery, [churchId, start_date, end_date]),
    pool.query(wellnessQuery, [churchId, start_date, end_date])
  ]);

  return {
    title: 'Personal Growth & Wellness Report',
    period: { start_date, end_date },
    growth_plans: {
      summary: {
        total_plans: growthPlans.rows.reduce((sum, row) => sum + parseInt(row.plan_count), 0),
        completed_plans: growthPlans.rows.find(row => row.status === 'completed')?.plan_count || 0,
        overdue_plans: growthPlans.rows.reduce((sum, row) => sum + parseInt(row.overdue_plans || 0), 0)
      },
      by_status: growthPlans.rows
    },
    burnout_risk: {
      summary: {
        total_assessments: burnoutData.rows.reduce((sum, row) => sum + parseInt(row.total_assessments), 0),
        critical_risk: burnoutData.rows.reduce((sum, row) => sum + parseInt(row.critical_risk), 0),
        high_risk: burnoutData.rows.reduce((sum, row) => sum + parseInt(row.high_risk), 0)
      },
      monthly_data: burnoutData.rows
    },
    wellness_tracking: {
      summary: {
        total_checkins: wellnessData.rows.reduce((sum, row) => sum + parseInt(row.total_checkins), 0),
        avg_energy: wellnessData.rows.length > 0 ?
          wellnessData.rows.reduce((sum, row) => sum + parseFloat(row.avg_energy || 0), 0) / wellnessData.rows.length : 0,
        avg_stress: wellnessData.rows.length > 0 ?
          wellnessData.rows.reduce((sum, row) => sum + parseFloat(row.avg_stress || 0), 0) / wellnessData.rows.length : 0
      },
      monthly_data: wellnessData.rows
    },
    generated_at: new Date()
  };
}

// OUTREACH REPORTS

async function generateOutreachReport(churchId, params) {
  const { start_date, end_date } = params;

  // Outreach events
  const eventsQuery = `
    SELECT
      DATE_TRUNC('month', oe.event_date) as month,
      COUNT(*) as total_events,
      SUM(oe.expected_attendance) as total_expected_attendance,
      SUM(oe.actual_attendance) as total_actual_attendance,
      COUNT(CASE WHEN oe.status = 'completed' THEN 1 END) as completed_events,
      AVG(COALESCE(oe.decisions_made, 0)) as avg_impact_rating
    FROM outreach_events oe
    WHERE oe.church_id = $1 AND oe.event_date BETWEEN $2 AND $3
    GROUP BY DATE_TRUNC('month', oe.event_date)
    ORDER BY month DESC
  `;

  // Evangelism impact
  const evangelismQuery = `
    SELECT
      DATE_TRUNC('month', cvj.created_at) as month,
      COUNT(CASE WHEN cvj.current_stage = 'cell_visitor' THEN 1 END) as new_visitors,
      COUNT(CASE WHEN cvj.current_stage = 'church_attendee' THEN 1 END) as regular_attendees,
      COUNT(CASE WHEN cvj.current_stage = 'member' THEN 1 END) as new_members,
      COUNT(CASE WHEN cvj.baptized = true THEN 1 END) as baptized_visitors
    FROM cell_visitor_journeys cvj
    WHERE cvj.church_id = $1 AND cvj.created_at BETWEEN $2 AND $3
    GROUP BY DATE_TRUNC('month', cvj.created_at)
    ORDER BY month DESC
  `;

  // Baptism register
  const baptismQuery = `
    SELECT
      DATE_TRUNC('month', bc.created_at) as month,
      COUNT(*) as total_candidates,
      COUNT(CASE WHEN bc.status = 'completed' OR br.baptism_date IS NOT NULL THEN 1 END) as baptized_candidates,
      COUNT(CASE WHEN br.baptism_method = 'immersion' THEN 1 END) as immersion_baptisms,
      COUNT(CASE WHEN br.baptism_method = 'sprinkling' THEN 1 END) as sprinkling_baptisms
    FROM baptism_candidates bc
    LEFT JOIN baptism_records br ON br.candidate_id = bc.id
    WHERE bc.church_id = $1 AND bc.created_at BETWEEN $2 AND $3
    GROUP BY DATE_TRUNC('month', bc.created_at)
    ORDER BY month DESC
  `;

  const [eventsData, evangelismData, baptismData] = await Promise.all([
    pool.query(eventsQuery, [churchId, start_date, end_date]),
    pool.query(evangelismQuery, [churchId, start_date, end_date]),
    pool.query(baptismQuery, [churchId, start_date, end_date])
  ]);

  return {
    title: 'Outreach & Evangelism Report',
    period: { start_date, end_date },
    outreach_events: {
      summary: {
        total_events: eventsData.rows.reduce((sum, row) => sum + parseInt(row.total_events), 0),
        total_attendance: eventsData.rows.reduce((sum, row) => sum + parseInt(row.total_actual_attendance || 0), 0),
        completed_events: eventsData.rows.reduce((sum, row) => sum + parseInt(row.completed_events), 0),
        avg_impact: eventsData.rows.length > 0 ?
          eventsData.rows.reduce((sum, row) => sum + parseFloat(row.avg_impact_rating || 0), 0) / eventsData.rows.length : 0
      },
      monthly_data: eventsData.rows
    },
    evangelism_impact: {
      summary: {
        total_new_visitors: evangelismData.rows.reduce((sum, row) => sum + parseInt(row.new_visitors), 0),
        total_regular_attendees: evangelismData.rows.reduce((sum, row) => sum + parseInt(row.regular_attendees), 0),
        total_new_members: evangelismData.rows.reduce((sum, row) => sum + parseInt(row.new_members), 0),
        total_baptisms: evangelismData.rows.reduce((sum, row) => sum + parseInt(row.baptized_visitors), 0)
      },
      monthly_data: evangelismData.rows
    },
    baptism_register: {
      summary: {
        total_candidates: baptismData.rows.reduce((sum, row) => sum + parseInt(row.total_candidates), 0),
        baptized_candidates: baptismData.rows.reduce((sum, row) => sum + parseInt(row.baptized_candidates), 0),
        immersion_baptisms: baptismData.rows.reduce((sum, row) => sum + parseInt(row.immersion_baptisms), 0)
      },
      monthly_data: baptismData.rows
    },
    generated_at: new Date()
  };
}

// RELATIONSHIPS REPORTS

async function generateConflictResolutionReport(churchId, params) {
  const { start_date, end_date } = params;

  const summaryQuery = `
    SELECT
      DATE_TRUNC('month', COALESCE(reported_date, created_at::date)) as month,
      COUNT(*) as total_conflicts,
      COUNT(CASE WHEN status IN ('resolved', 'closed') THEN 1 END) as resolved_conflicts,
      COUNT(CASE WHEN severity IN ('high', 'critical') THEN 1 END) as high_severity_conflicts
    FROM conflict_logs
    WHERE church_id = $1
      AND COALESCE(reported_date, created_at::date) BETWEEN $2 AND $3
    GROUP BY DATE_TRUNC('month', COALESCE(reported_date, created_at::date))
    ORDER BY month DESC
  `;

  const typeQuery = `
    SELECT conflict_type, COUNT(*) as conflict_count
    FROM conflict_logs
    WHERE church_id = $1
      AND COALESCE(reported_date, created_at::date) BETWEEN $2 AND $3
    GROUP BY conflict_type
    ORDER BY conflict_count DESC
  `;

  const [summaryRes, typeRes] = await Promise.all([
    pool.query(summaryQuery, [churchId, start_date, end_date]),
    pool.query(typeQuery, [churchId, start_date, end_date])
  ]);

  return {
    title: 'Conflict Resolution Report',
    period: { start_date, end_date },
    summary: {
      total_conflicts: summaryRes.rows.reduce((sum, row) => sum + parseInt(row.total_conflicts || 0), 0),
      resolved_conflicts: summaryRes.rows.reduce((sum, row) => sum + parseInt(row.resolved_conflicts || 0), 0),
      high_severity_conflicts: summaryRes.rows.reduce((sum, row) => sum + parseInt(row.high_severity_conflicts || 0), 0)
    },
    monthly_data: summaryRes.rows,
    by_type: typeRes.rows,
    generated_at: new Date()
  };
}

async function generateCelebrationEventsReport(churchId, params) {
  const { start_date, end_date } = params;

  const eventsQuery = `
    SELECT
      DATE_TRUNC('month', event_date) as month,
      COUNT(*) as total_events,
      COUNT(CASE WHEN planning_status = 'completed' THEN 1 END) as completed_events
    FROM celebration_events
    WHERE church_id = $1 AND event_date BETWEEN $2 AND $3
    GROUP BY DATE_TRUNC('month', event_date)
    ORDER BY month DESC
  `;

  const specialDatesQuery = `
    SELECT
      DATE_TRUNC('month', special_date) as month,
      COUNT(*) as total_special_dates
    FROM special_dates
    WHERE church_id = $1 AND special_date BETWEEN $2 AND $3
    GROUP BY DATE_TRUNC('month', special_date)
    ORDER BY month DESC
  `;

  const achievementsQuery = `
    SELECT
      DATE_TRUNC('month', achievement_date) as month,
      COUNT(*) as total_achievements
    FROM achievements
    WHERE church_id = $1 AND achievement_date BETWEEN $2 AND $3
    GROUP BY DATE_TRUNC('month', achievement_date)
    ORDER BY month DESC
  `;

  const [eventsRes, specialRes, achievementsRes] = await Promise.all([
    pool.query(eventsQuery, [churchId, start_date, end_date]),
    pool.query(specialDatesQuery, [churchId, start_date, end_date]),
    pool.query(achievementsQuery, [churchId, start_date, end_date])
  ]);

  return {
    title: 'Celebration Events Report',
    period: { start_date, end_date },
    celebrations: {
      summary: {
        total_events: eventsRes.rows.reduce((sum, row) => sum + parseInt(row.total_events || 0), 0),
        completed_events: eventsRes.rows.reduce((sum, row) => sum + parseInt(row.completed_events || 0), 0),
        total_special_dates: specialRes.rows.reduce((sum, row) => sum + parseInt(row.total_special_dates || 0), 0),
        total_achievements: achievementsRes.rows.reduce((sum, row) => sum + parseInt(row.total_achievements || 0), 0)
      },
      events_monthly: eventsRes.rows,
      special_dates_monthly: specialRes.rows,
      achievements_monthly: achievementsRes.rows
    },
    generated_at: new Date()
  };
}

async function generateCommunityEngagementReport(churchId, params) {
  const { start_date, end_date } = params;

  const communityQuery = `
    SELECT
      DATE_TRUNC('month', oe.event_date) as month,
      COUNT(DISTINCT oe.id) as total_events,
      SUM(oe.actual_attendance) as total_attendance,
      COUNT(DISTINCT op.member_id) as total_volunteers,
      SUM(op.hours_contributed) as total_volunteer_hours
    FROM outreach_events oe
    LEFT JOIN outreach_participants op ON op.event_id = oe.id
    WHERE oe.church_id = $1
      AND oe.event_type = 'community_service'
      AND oe.event_date BETWEEN $2 AND $3
    GROUP BY DATE_TRUNC('month', oe.event_date)
    ORDER BY month DESC
  `;

  const { rows } = await pool.query(communityQuery, [churchId, start_date, end_date]);

  return {
    title: 'Community Engagement Report',
    period: { start_date, end_date },
    summary: {
      total_events: rows.reduce((sum, row) => sum + parseInt(row.total_events || 0), 0),
      total_attendance: rows.reduce((sum, row) => sum + parseInt(row.total_attendance || 0), 0),
      total_volunteers: rows.reduce((sum, row) => sum + parseInt(row.total_volunteers || 0), 0),
      total_volunteer_hours: rows.reduce((sum, row) => sum + parseFloat(row.total_volunteer_hours || 0), 0)
    },
    monthly_data: rows,
    generated_at: new Date()
  };
}

// COMPREHENSIVE MONTHLY OVERVIEW

async function generateMonthlyOverviewReport(churchId, params) {
  const { start_date, end_date } = params;

  // Parallel execution of all report sections
  try {
    const [
      financialData,
      attendanceData,
      cellHealthData,
      leadershipData,
      discipleshipData,
      crisisData,
      personalGrowthData,
      outreachData
    ] = await Promise.all([
      generateGivingSummaryReport(churchId, { start_date, end_date }).catch(err => {
        console.error('Financial report failed:', err.message);
        return { summary: { total_contributions: 0, total_amount: 0, active_givers: 0, average_gift: 0 }, monthly_data: [] };
      }),
      generateAttendanceReport(churchId, { start_date, end_date }).catch(err => {
        console.error('Attendance report failed:', err.message);
        return { attendance: { summary: { total_attendance: 0, average_weekly: 0, total_visitors: 0, active_cells: 0 }, weekly_data: [] }, growth: { summary: { total_conversions: 0, total_conversions: 0, baptisms: 0, foundation_graduates: 0, avg_multiplication_readiness: 0 }, monthly_data: [] } };
      }),
      generateCellHealthReport(churchId, { start_date, end_date }).catch(err => {
        console.error('Cell health report failed:', err.message);
        return { summary: { overall_health_score: 0, cells_in_multiplication: 0, active_cells: 0, inactive_cells: 0 }, cell_details: [] };
      }),
      generateLeadershipReport(churchId, { start_date, end_date }).catch(err => {
        console.error('Leadership report failed:', err.message);
        return { pipeline_summary: { total_leaders: 0, ready_for_multiplication: 0, avg_leadership_score: 0 }, leadership_details: [] };
      }),
      generateDiscipleshipReport(churchId, { start_date, end_date }).catch(err => {
        console.error('Discipleship report failed:', err.message);
        return { foundation_school: { summary: { total_completions: 0, active_students: 0, completion_rate: 0 }, monthly_data: [] }, spiritual_disciplines: { summary: { active_practitioners: 0, avg_discipline_score: 0 }, monthly_data: [] }, baptism_preparation: { summary: { total_candidates: 0, baptized_candidates: 0, immersion_baptisms: 0 }, monthly_data: [] } };
      }),
      generateCrisisCareReport(churchId, { start_date, end_date }).catch(err => {
        console.error('Crisis care report failed:', err.message);
        return { crisis_cases: { summary: { total_cases: 0, critical_cases: 0, resolved_cases: 0 }, monthly_data: [] }, interventions: { summary: { total_interventions: 0, successful_interventions: 0 }, monthly_data: [] } };
      }),
      generatePersonalGrowthReport(churchId, { start_date, end_date }).catch(err => {
        console.error('Personal growth report failed:', err.message);
        return { growth_plans: { summary: { active_plans: 0, completed_plans: 0, avg_progress: 0 }, monthly_data: [] }, burnout_assessments: { summary: { total_assessments: 0, high_risk_count: 0, avg_burnout_score: 0 }, monthly_data: [] }, wellness_tracking: { summary: { active_tracking: 0, avg_wellness_score: 0 }, monthly_data: [] } };
      }),
      generateOutreachReport(churchId, { start_date, end_date }).catch(err => {
        console.error('Outreach report failed:', err.message);
        return { evangelism_impact: { summary: { total_new_visitors: 0, total_regular_attendees: 0, total_new_members: 0, total_baptisms: 0 }, monthly_data: [] }, outreach_events: { summary: { total_events: 0, total_participants: 0, total_responses: 0 }, monthly_data: [] }, baptism_register: { summary: { total_candidates: 0, baptized_candidates: 0, immersion_baptisms: 0 }, monthly_data: [] } };
      })
    ]);

  // Calculate key performance indicators
  const kpis = {
    financial_health: {
      total_giving: financialData.summary.total_amount,
      active_givers: financialData.summary.active_givers,
      giving_trend: 'stable' // Would compare with previous period
    },
    attendance_growth: {
      total_attendance: attendanceData.attendance.summary.total_attendance,
      avg_weekly_attendance: attendanceData.attendance.summary.average_weekly,
      visitor_ratio: attendanceData.attendance.summary.total_attendance > 0 ?
        (attendanceData.attendance.summary.total_visitors / attendanceData.attendance.summary.total_attendance) * 100 : 0
    },
    ministry_health: {
      cell_health_score: cellHealthData.summary.overall_health_score,
      active_cells: attendanceData.attendance.summary.active_cells,
      multiplication_readiness: cellHealthData.summary.cells_in_multiplication
    },
    leadership_development: {
      total_leaders: leadershipData.pipeline_summary.total_leaders,
      ready_for_multiplication: leadershipData.pipeline_summary.ready_for_multiplication,
      avg_leadership_score: leadershipData.pipeline_summary.avg_leadership_score
    },
    discipleship_growth: {
      foundation_completions: discipleshipData.foundation_school.summary.total_completions,
      active_disciples: discipleshipData.spiritual_disciplines.summary.active_practitioners,
      baptism_candidates: discipleshipData.baptism_preparation.summary.total_candidates
    },
    crisis_care: {
      active_cases: crisisData.crisis_cases.summary.total_cases,
      critical_cases: crisisData.crisis_cases.summary.critical_cases,
      resolution_rate: crisisData.crisis_cases.summary.total_cases > 0 ?
        (crisisData.crisis_cases.summary.resolved_cases / crisisData.crisis_cases.summary.total_cases) * 100 : 0
    },
    outreach_impact: {
      new_visitors: outreachData.evangelism_impact.summary.total_new_visitors,
      new_members: outreachData.evangelism_impact.summary.total_new_members,
      baptisms: outreachData.evangelism_impact.summary.total_baptisms
    }
  };

  return {
    title: 'Monthly Ministry Overview Report',
    period: { start_date, end_date },
    executive_summary: generateExecutiveSummary(kpis),
    key_performance_indicators: kpis,
    detailed_reports: {
      financial: financialData,
      attendance: attendanceData,
      cell_health: cellHealthData,
      leadership: leadershipData,
      discipleship: discipleshipData,
      crisis_care: crisisData,
      personal_growth: personalGrowthData,
      outreach: outreachData
    },
    generated_at: new Date()
  };
  } catch (error) {
    console.error('Monthly overview report generation failed:', error.message);
    // Return a basic report with empty data if generation fails
    return {
      title: 'Monthly Ministry Overview Report',
      period: { start_date, end_date },
      executive_summary: 'Report generation encountered errors. Some data may be incomplete.',
      key_performance_indicators: {
        financial_health: { total_giving: 0, active_givers: 0, giving_trend: 'unknown' },
        attendance_growth: { total_attendance: 0, avg_weekly_attendance: 0, visitor_ratio: 0 },
        ministry_health: { cell_health_score: 0, active_cells: 0, multiplication_readiness: 0 },
        leadership_development: { total_leaders: 0, ready_for_multiplication: 0, avg_leadership_score: 0 },
        discipleship_growth: { foundation_completions: 0, active_disciples: 0, baptism_candidates: 0 },
        crisis_care: { active_cases: 0, critical_cases: 0, resolution_rate: 0 },
        outreach_impact: { new_visitors: 0, new_members: 0, baptisms: 0 }
      },
      detailed_reports: {
        financial: { summary: { total_contributions: 0, total_amount: 0, active_givers: 0, average_gift: 0 }, monthly_data: [] },
        attendance: { attendance: { summary: { total_attendance: 0, average_weekly: 0, total_visitors: 0, active_cells: 0 }, weekly_data: [] }, growth: { summary: { total_conversions: 0, baptisms: 0, foundation_graduates: 0, avg_multiplication_readiness: 0 }, monthly_data: [] } },
        cell_health: { summary: { overall_health_score: 0, cells_in_multiplication: 0, active_cells: 0, inactive_cells: 0 }, cell_details: [] },
        leadership: { pipeline_summary: { total_leaders: 0, ready_for_multiplication: 0, avg_leadership_score: 0 }, leadership_details: [] },
        discipleship: { foundation_school: { summary: { total_completions: 0, active_students: 0, completion_rate: 0 }, monthly_data: [] }, spiritual_disciplines: { summary: { active_practitioners: 0, avg_discipline_score: 0 }, monthly_data: [] }, baptism_preparation: { summary: { total_candidates: 0, baptized_candidates: 0, immersion_baptisms: 0 }, monthly_data: [] } },
        crisis_care: { crisis_cases: { summary: { total_cases: 0, critical_cases: 0, resolved_cases: 0 }, monthly_data: [] }, interventions: { summary: { total_interventions: 0, successful_interventions: 0 }, monthly_data: [] } },
        personal_growth: { growth_plans: { summary: { active_plans: 0, completed_plans: 0, avg_progress: 0 }, monthly_data: [] }, burnout_assessments: { summary: { total_assessments: 0, high_risk_count: 0, avg_burnout_score: 0 }, monthly_data: [] }, wellness_tracking: { summary: { active_tracking: 0, avg_wellness_score: 0 }, monthly_data: [] } },
        outreach: { evangelism_impact: { summary: { total_new_visitors: 0, total_regular_attendees: 0, total_new_members: 0, total_baptisms: 0 }, monthly_data: [] }, outreach_events: { summary: { total_events: 0, total_participants: 0, total_responses: 0 }, monthly_data: [] }, baptism_register: { summary: { total_candidates: 0, baptized_candidates: 0, immersion_baptisms: 0 }, monthly_data: [] } }
      },
      generated_at: new Date()
    };
  }
}

// Generate executive summary from KPIs
function generateExecutiveSummary(kpis) {
  return {
    financial_overview: `Financial Health: $${kpis.financial_health.total_giving?.toLocaleString()} in giving from ${kpis.financial_health.active_givers} active givers`,
    attendance_summary: `Attendance: ${kpis.attendance_growth.total_attendance?.toLocaleString()} total attendance with ${kpis.attendance_growth.visitor_ratio?.toFixed(1)}% visitors`,
    ministry_health: `Cell Health: ${kpis.ministry_health.cell_health_score?.toFixed(1)}/10 average score across ${kpis.ministry_health.active_cells} active cells`,
    leadership_status: `Leadership: ${kpis.leadership_development.total_leaders} leaders in pipeline, ${kpis.leadership_development.ready_for_multiplication} ready for multiplication`,
    discipleship_progress: `Discipleship: ${kpis.discipleship_growth.foundation_completions} foundation school completions, ${kpis.discipleship_growth.active_disciples} active in spiritual disciplines`,
    crisis_care: `Crisis Care: ${kpis.crisis_care.active_cases} active cases with ${kpis.crisis_care.resolution_rate?.toFixed(1)}% resolution rate`,
    outreach_impact: `Outreach: ${kpis.outreach_impact.new_visitors} new visitors, ${kpis.outreach_impact.new_members} new members, ${kpis.outreach_impact.baptisms} baptisms`
  };
}

export { REPORT_CATEGORIES, REPORT_TYPES };
