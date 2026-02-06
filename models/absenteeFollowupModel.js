import db from '../config/db.js';

// ============================================
// Absentee Follow-Up Model
// ============================================

/**
 * Create a new absentee follow-up record
 */
export async function createAbsenteeFollowup(followupData) {
  const {
    church_id,
    weekly_report_id,
    member_id,
    absence_date,
    consecutive_absences = 1,
    reported_reason = 'unknown',
    priority_level = 'normal',
    assigned_to,
    due_date,
    status = 'pending',
    followup_frequency = 'weekly',
    created_by
  } = followupData;

  const sql = `
    INSERT INTO absentee_followups (
      church_id, weekly_report_id, member_id, absence_date,
      consecutive_absences, reported_reason, priority_level,
      assigned_to, due_date, status, followup_frequency, created_by
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    RETURNING *
  `;

  const params = [
    church_id, weekly_report_id, member_id, absence_date,
    consecutive_absences, reported_reason, priority_level,
    assigned_to, due_date, status, followup_frequency, created_by
  ];

  const { rows } = await db.query(sql, params);
  return rows[0];
}

/**
 * Get absentee follow-up by ID
 */
export async function getAbsenteeFollowupById(id) {
  const sql = `
    SELECT af.*,
           m.first_name, m.surname, m.contact_primary, m.email,
           assignee.first_name as assignee_first_name, assignee.surname as assignee_surname,
           creator.first_name as creator_first_name, creator.surname as creator_surname,
           wr.meeting_date as report_meeting_date,
           cg.name as cell_group_name
    FROM absentee_followups af
    JOIN members m ON af.member_id = m.id
    LEFT JOIN members assignee ON af.assigned_to = assignee.id
    LEFT JOIN members creator ON af.created_by = creator.id
    LEFT JOIN weekly_reports wr ON af.weekly_report_id = wr.id
    LEFT JOIN cell_groups cg ON wr.cell_group_id = cg.id
    WHERE af.id = $1
  `;

  const { rows } = await db.query(sql, [id]);
  return rows[0];
}

/**
 * Update absentee follow-up
 */
export async function updateAbsenteeFollowup(id, updates) {
  const allowedFields = [
    'assigned_to', 'due_date', 'status', 'last_contact_date',
    'last_response', 'identified_needs', 'recommended_actions',
    'resolution_date', 'resolution_notes', 'resolution_type',
    'next_followup_date', 'followup_frequency', 'updated_by'
  ];

  const setParts = [];
  const params = [];
  let paramIndex = 1;

  Object.keys(updates).forEach(key => {
    if (allowedFields.includes(key)) {
      if (key.includes('_needs') || key.includes('_actions')) {
        // JSONB fields
        setParts.push(`${key} = $${paramIndex}::jsonb`);
      } else {
        setParts.push(`${key} = $${paramIndex}`);
      }
      params.push(updates[key]);
      paramIndex++;
    }
  });

  if (setParts.length === 0) return null;

  setParts.push('updated_at = CURRENT_TIMESTAMP');
  params.push(id);

  const sql = `
    UPDATE absentee_followups
    SET ${setParts.join(', ')}
    WHERE id = $${paramIndex}
    RETURNING *
  `;

  const { rows } = await db.query(sql, params);
  return rows[0];
}

/**
 * Get absentee follow-ups for a church with filtering
 */
export async function getAbsenteeFollowups(churchId, filters = {}) {
  const {
    member_id,
    assigned_to,
    status,
    priority_level,
    overdue_only = false,
    limit = 50,
    offset = 0
  } = filters;

  let whereParts = ['af.church_id = $1'];
  let params = [churchId];
  let paramIndex = 2;

  if (member_id) {
    whereParts.push(`af.member_id = $${paramIndex}`);
    params.push(member_id);
    paramIndex++;
  }

  if (assigned_to) {
    whereParts.push(`af.assigned_to = $${paramIndex}`);
    params.push(assigned_to);
    paramIndex++;
  }

  if (status) {
    whereParts.push(`af.status = $${paramIndex}`);
    params.push(status);
    paramIndex++;
  }

  if (priority_level) {
    whereParts.push(`af.priority_level = $${paramIndex}`);
    params.push(priority_level);
    paramIndex++;
  }

  if (overdue_only) {
    whereParts.push('af.due_date < CURRENT_DATE AND af.status IN (\'pending\', \'contacted\')');
  }

  const whereClause = whereParts.join(' AND ');

  const sql = `
    SELECT af.*,
           m.first_name, m.surname, m.contact_primary, m.email,
           assignee.first_name as assignee_first_name, assignee.surname as assignee_surname,
           wr.meeting_date as report_meeting_date,
           cg.name as cell_group_name
    FROM absentee_followups af
    JOIN members m ON af.member_id = m.id
    LEFT JOIN members assignee ON af.assigned_to = assignee.id
    LEFT JOIN weekly_reports wr ON af.weekly_report_id = wr.id
    LEFT JOIN cell_groups cg ON wr.cell_group_id = cg.id
    WHERE ${whereClause}
    ORDER BY
      CASE af.priority_level
        WHEN 'urgent' THEN 1
        WHEN 'high' THEN 2
        WHEN 'normal' THEN 3
        WHEN 'low' THEN 4
        ELSE 5
      END,
      af.due_date ASC,
      af.created_at DESC
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
  `;

  params.push(limit, offset);

  const { rows } = await db.query(sql, params);
  return rows;
}

/**
 * Add a contact attempt to an absentee follow-up
 */
export async function addContactAttempt(followupId, attemptData) {
  const {
    contact_method,
    contact_person,
    contact_success = false,
    response_received,
    notes,
    created_by
  } = attemptData;

  const sql = `
    INSERT INTO absentee_contact_attempts (
      followup_id, contact_method, contact_person,
      contact_success, response_received, notes, created_by
    ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *
  `;

  const params = [
    followupId, contact_method, contact_person,
    contact_success, response_received, notes, created_by
  ];

  const { rows } = await db.query(sql, params);

  // Update the parent followup record
  await updateLastContact(followupId, response_received);

  return rows[0];
}

/**
 * Get contact attempts for a follow-up
 */
export async function getContactAttempts(followupId) {
  const sql = `
    SELECT aca.*,
           cp.first_name as contact_person_first_name,
           cp.surname as contact_person_surname,
           creator.first_name as creator_first_name,
           creator.surname as creator_surname
    FROM absentee_contact_attempts aca
    LEFT JOIN members cp ON aca.contact_person = cp.id
    LEFT JOIN members creator ON aca.created_by = creator.id
    WHERE aca.followup_id = $1
    ORDER BY aca.contact_date DESC
  `;

  const { rows } = await db.query(sql, [followupId]);
  return rows;
}

/**
 * Update last contact info when a contact attempt is made
 */
async function updateLastContact(followupId, response) {
  const sql = `
    UPDATE absentee_followups
    SET last_contact_date = CURRENT_TIMESTAMP,
        last_response = $2,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = $1
  `;

  await db.query(sql, [followupId, response]);
}

/**
 * Auto-generate follow-ups from weekly report absentees
 */
export async function generateFollowupsFromWeeklyReport(weeklyReportId, createdBy) {
  console.log('Starting followup generation for report:', weeklyReportId, 'by:', createdBy);
  
  // Get the weekly report and its absentees
  const reportSql = `
    SELECT wr.*, cg.name as cell_group_name
    FROM weekly_reports wr
    JOIN cell_groups cg ON wr.cell_group_id = cg.id
    WHERE wr.id = $1
  `;

  const reportResult = await db.query(reportSql, [weeklyReportId]);
  console.log('Report query result:', reportResult.rows.length, 'rows found');
  
  if (reportResult.rows.length === 0) {
    console.log('No report found with ID:', weeklyReportId);
    return [];
  }

  const report = reportResult.rows[0];
  console.log('Report found:', report.id, 'with', report.absentees?.length || 0, 'absentees');

  // Parse absentees JSONB array
  const absentees = report.absentees || [];
  const generatedFollowups = [];

  for (const absentee of absentees) {
    console.log('Processing absentee:', absentee);
    
    if (!absentee.member_id) {
      console.log('Skipping absentee - no member_id');
      continue;
    }

    // Check if a follow-up already exists for this member
    const existingSql = `
      SELECT id FROM absentee_followups
      WHERE member_id = $1 AND status IN ('pending', 'contacted')
      ORDER BY created_at DESC LIMIT 1
    `;

    const existing = await db.query(existingSql, [absentee.member_id]);
    console.log('Existing followup found:', existing.rows.length > 0);

    if (existing.rows.length > 0) {
      // Update existing follow-up with consecutive absences
      const consecutiveAbsences = await calculateConsecutiveAbsences(absentee.member_id, report.meeting_date);
      console.log('Updating existing followup with consecutive absences:', consecutiveAbsences);
      
      await updateAbsenteeFollowup(existing.rows[0].id, {
        consecutive_absences: consecutiveAbsences,
        updated_by: createdBy
      });
    } else {
      // Create new follow-up
      const consecutiveAbsences = await calculateConsecutiveAbsences(absentee.member_id, report.meeting_date);
      console.log('Creating new followup with consecutive absences:', consecutiveAbsences);

      const followupData = {
        church_id: report.church_id,
        weekly_report_id: weeklyReportId,
        member_id: absentee.member_id,
        absence_date: report.meeting_date,
        consecutive_absences: consecutiveAbsences,
        reported_reason: absentee.reason || 'unknown',
        priority_level: determinePriorityLevel(consecutiveAbsences),
        status: 'pending',
        followup_frequency: 'weekly',
        created_by: createdBy
      };

      console.log('Creating followup with data:', followupData);
      const newFollowup = await createAbsenteeFollowup(followupData);
      console.log('New followup created:', newFollowup.id);
      generatedFollowups.push(newFollowup);
    }
  }

  console.log('Followup generation complete. Total generated:', generatedFollowups.length);
  return generatedFollowups;
}

/**
 * Calculate consecutive absences for a member
 */
async function calculateConsecutiveAbsences(memberId, currentMeetingDate) {
  // Count absences in recent weekly reports
  const sql = `
    SELECT COUNT(*) as consecutive_absences
    FROM weekly_reports wr,
         jsonb_array_elements(wr.absentees) as abs
    WHERE abs->>'member_id' = $1::text
      AND wr.meeting_date <= $2
      AND wr.meeting_date >= $2 - INTERVAL '60 days'
  `;

  const result = await db.query(sql, [memberId, currentMeetingDate]);
  return parseInt(result.rows[0].consecutive_absences) || 1;
}

/**
 * Determine priority level based on consecutive absences
 */
function determinePriorityLevel(consecutiveAbsences) {
  if (consecutiveAbsences >= 5) return 'urgent';
  if (consecutiveAbsences >= 3) return 'high';
  if (consecutiveAbsences >= 2) return 'normal';
  return 'low';
}

/**
 * Get follow-up statistics for dashboard
 */
export async function getFollowupStats(churchId) {
  const sql = `
    SELECT
      COUNT(*) as total_followups,
      COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
      COUNT(CASE WHEN status = 'contacted' THEN 1 END) as contacted,
      COUNT(CASE WHEN status = 'resolved' THEN 1 END) as resolved,
      COUNT(CASE WHEN status = 'escalated' THEN 1 END) as escalated,
      COUNT(CASE WHEN due_date < CURRENT_DATE AND status IN ('pending', 'contacted') THEN 1 END) as overdue
    FROM absentee_followups
    WHERE church_id = $1
  `;

  const { rows } = await db.query(sql, [churchId]);
  return rows[0];
}

/**
 * Get overdue follow-ups
 */
export async function getOverdueFollowups(churchId) {
  const sql = `
    SELECT af.*,
           m.first_name, m.surname,
           assignee.first_name as assignee_first_name, assignee.surname as assignee_surname,
           EXTRACT(DAY FROM CURRENT_DATE - af.due_date) as days_overdue
    FROM absentee_followups af
    JOIN members m ON af.member_id = m.id
    LEFT JOIN members assignee ON af.assigned_to = assignee.id
    WHERE af.church_id = $1
      AND af.due_date < CURRENT_DATE
      AND af.status IN ('pending', 'contacted')
    ORDER BY af.due_date ASC
  `;

  const { rows } = await db.query(sql, [churchId]);
  return rows;
}