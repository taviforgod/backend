import db from '../config/db.js';

// Leadership Roles
export const addLeadershipRole = async ({ church_id, member_id, role, notes }) =>
  db.query(
    `INSERT INTO leadership_roles (church_id, member_id, role, notes)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [church_id, member_id, role, notes]
  ).then(res => res.rows[0]);

export const listLeadershipRoles = async (church_id) =>
  db.query(
    `SELECT lr.*, m.first_name, m.surname FROM leadership_roles lr
     JOIN members m ON m.id = lr.member_id WHERE lr.church_id = $1 AND lr.active = TRUE`,
    [church_id]
  ).then(res => res.rows);

// Promotions
export const addPromotion = async ({ church_id, member_id, from_role, to_role, notes, created_by }) =>
  db.query(
    `INSERT INTO leadership_promotions (church_id, member_id, from_role, to_role, notes, created_by)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [church_id, member_id, from_role, to_role, notes, created_by]
  ).then(res => res.rows[0]);

// Leadership Evaluations
export const addEvaluation = async ({ church_id, leader_id, evaluator_id, type, spiritual_maturity, relational_health, discipleship, growth_potential, leadership_qualities, notes }) =>
  db.query(
    `INSERT INTO leadership_evaluations
    (church_id, leader_id, evaluator_id, type, spiritual_maturity, relational_health, discipleship, growth_potential, leadership_qualities, notes)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
    [church_id, leader_id, evaluator_id, type, spiritual_maturity, relational_health, discipleship, growth_potential, leadership_qualities, notes]
  ).then(res => res.rows[0]);

export const listEvaluations = async (church_id, leader_id) =>
  db.query(
    `SELECT le.*, le.evaluator_id, u.name AS evaluator_name
     FROM leadership_evaluations le
     LEFT JOIN users u ON u.id = le.evaluator_id
     WHERE le.church_id = $1 AND le.leader_id = $2
     ORDER BY le.evaluation_date DESC`,
    [church_id, leader_id]
  ).then(res => res.rows);

// Leadership Alerts
export const addAlert = async ({ church_id, leader_id, type, message }) =>
  db.query(
    `INSERT INTO leadership_alerts (church_id, leader_id, type, message)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (church_id, leader_id, type) DO NOTHING
     RETURNING *`,
    [church_id, leader_id, type, message]
  ).then(res => res.rows[0]);

export const listAlerts = async (church_id) =>
  db.query(
    `SELECT * FROM leadership_alerts WHERE church_id = $1 AND resolved = FALSE ORDER BY created_at DESC`,
    [church_id]
  ).then(res => res.rows);

// Leadership Milestones
export const addMilestoneTemplate = async ({ church_id, name, description, required_for_promotion }) =>
  db.query(
    `INSERT INTO leadership_milestone_templates (church_id, name, description, required_for_promotion)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [church_id, name, description, required_for_promotion]
  ).then(res => res.rows[0]);

// Get all milestone records for a member
export const listMilestoneRecords = async (church_id, member_id) =>
  db.query(
    `SELECT mr.*, mt.name AS template_name
     FROM leadership_milestone_records mr
     LEFT JOIN leadership_milestone_templates mt ON mt.id = mr.template_id
     WHERE mr.church_id = $1 AND mr.member_id = $2
     ORDER BY completed_at DESC`,
    [church_id, member_id]
  ).then(res => res.rows);

// Add a milestone record for a member
export const addMilestoneRecord = async ({ church_id, member_id, template_id, milestone_name, notes }) =>
  db.query(
    `INSERT INTO leadership_milestone_records (church_id, member_id, template_id, milestone_name, notes)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [church_id, member_id, template_id, milestone_name, notes]
  ).then(res => res.rows[0]);

// Leadership Exit Records
export const addExitRecord = async ({ church_id, member_id, exit_type, reason, interview_notes, created_by }) =>
  db.query(
    `INSERT INTO leadership_exit_records (church_id, member_id, exit_type, reason, interview_notes, created_by)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [church_id, member_id, exit_type, reason, interview_notes, created_by]
  ).then(res => res.rows[0]);

// Mentorship Assignments
export const addMentorshipAssignment = async ({ church_id, mentor_id, mentee_id, start_date, end_date, notes }) =>
  db.query(
    `INSERT INTO mentorship_assignments (church_id, mentor_id, mentee_id, start_date, end_date, notes)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [church_id, mentor_id, mentee_id, start_date, end_date, notes]
  ).then(res => res.rows[0]);

export const listMentorshipAssignments = async (church_id) =>
  db.query(
    `SELECT ma.*, m.first_name, m.surname
     FROM mentorship_assignments ma
     JOIN members m ON m.id = ma.mentee_id
     WHERE ma.church_id = $1`,
    [church_id]
  ).then(res => res.rows);

export const listMentorshipAssignmentsByMentor = async (mentor_id) => {
  
  return db.query(
    `SELECT ma.*, m.first_name AS mentee_first_name, m.surname AS mentee_surname
     FROM mentorship_assignments ma
     JOIN members m ON m.id = ma.mentee_id
     WHERE ma.mentor_id = $1`,
    [mentor_id]
  ).then(res => {
    
    return res.rows;
  });
};

export const listMentorshipAssignmentsByMentee = async (mentee_id) =>
  db.query(
    `SELECT ma.*, m.first_name AS mentor_first_name, m.surname AS mentor_surname
     FROM mentorship_assignments ma
     JOIN members m ON m.id = ma.mentor_id
     WHERE ma.mentee_id = $1`,
    [mentee_id]
  ).then(res => res.rows);

// --- Update / Delete helpers ---

// Leadership Roles
export const updateLeadershipRole = async ({ id, role, notes }) =>
  db.query(
    `UPDATE leadership_roles
     SET role = COALESCE($1, role), notes = COALESCE($2, notes)
     WHERE id = $3
     RETURNING *`,
    [role, notes, id]
  ).then(res => res.rows[0]);

export const deactivateLeadershipRole = async (id) =>
  db.query(
    `UPDATE leadership_roles
     SET active = FALSE
     WHERE id = $1
     RETURNING *`,
    [id]
  ).then(res => res.rows[0]);

export const deleteLeadershipRole = async (id) =>
  db.query(
    `DELETE FROM leadership_roles WHERE id = $1 RETURNING *`,
    [id]
  ).then(res => res.rows[0]);

// Promotions
export const updatePromotion = async ({ id, from_role, to_role, notes }) =>
  db.query(
    `UPDATE leadership_promotions
     SET from_role = COALESCE($1, from_role), to_role = COALESCE($2, to_role), notes = COALESCE($3, notes)
     WHERE id = $4
     RETURNING *`,
    [from_role, to_role, notes, id]
  ).then(res => res.rows[0]);

export const deletePromotion = async (id) =>
  db.query(
    `DELETE FROM leadership_promotions WHERE id = $1 RETURNING *`,
    [id]
  ).then(res => res.rows[0]);

// Leadership Evaluations
export const updateEvaluation = async ({ id, type, spiritual_maturity, relational_health, discipleship, growth_potential, leadership_qualities, notes }) =>
  db.query(
    `UPDATE leadership_evaluations
     SET type = COALESCE($1, type),
         spiritual_maturity = COALESCE($2, spiritual_maturity),
         relational_health = COALESCE($3, relational_health),
         discipleship = COALESCE($4, discipleship),
         growth_potential = COALESCE($5, growth_potential),
         leadership_qualities = COALESCE($6, leadership_qualities),
         notes = COALESCE($7, notes)
     WHERE id = $8
     RETURNING *`,
    [type, spiritual_maturity, relational_health, discipleship, growth_potential, leadership_qualities, notes, id]
  ).then(res => res.rows[0]);

export const deleteEvaluation = async (id) =>
  db.query(
    `DELETE FROM leadership_evaluations WHERE id = $1 RETURNING *`,
    [id]
  ).then(res => res.rows[0]);

// Leadership Alerts
export const resolveAlert = async ({ id, resolved_by }) =>
  db.query(
    `UPDATE leadership_alerts
     SET resolved = TRUE, resolved_by = $2, resolved_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [id, resolved_by]
  ).then(res => res.rows[0]);

export const deleteAlert = async (id) =>
  db.query(
    `DELETE FROM leadership_alerts WHERE id = $1 RETURNING *`,
    [id]
  ).then(res => res.rows[0]);

// Leadership Milestone Templates
export const updateMilestoneTemplate = async ({ id, name, description, required_for_promotion }) =>
  db.query(
    `UPDATE leadership_milestone_templates
     SET name = COALESCE($1, name),
         description = COALESCE($2, description),
         required_for_promotion = COALESCE($3, required_for_promotion)
     WHERE id = $4
     RETURNING *`,
    [name, description, required_for_promotion, id]
  ).then(res => res.rows[0]);

export const deleteMilestoneTemplate = async (id) =>
  db.query(
    `DELETE FROM leadership_milestone_templates WHERE id = $1 RETURNING *`,
    [id]
  ).then(res => res.rows[0]);

// Milestone Records
export const updateMilestoneRecord = async ({ id, template_id, milestone_name, notes, completed_at }) =>
  db.query(
    `UPDATE leadership_milestone_records
     SET template_id = COALESCE($1, template_id),
         milestone_name = COALESCE($2, milestone_name),
         notes = COALESCE($3, notes),
         completed_at = COALESCE($4, completed_at)
     WHERE id = $5
     RETURNING *`,
    [template_id, milestone_name, notes, completed_at, id]
  ).then(res => res.rows[0]);

export const deleteMilestoneRecord = async (id) =>
  db.query(
    `DELETE FROM leadership_milestone_records WHERE id = $1 RETURNING *`,
    [id]
  ).then(res => res.rows[0]);

// Readiness helpers (simple, uses existing leadership_roles.readiness_score)
export const getReadinessForMember = async (church_id, member_id) =>
  db.query(
    `SELECT id, readiness_score, readiness_status, updated_at
     FROM leadership_roles
     WHERE church_id = $1 AND member_id = $2
     ORDER BY created_at DESC LIMIT 1`,
    [church_id, member_id]
  ).then(res => res.rows[0]);

export const updateReadinessScore = async ({ church_id, member_id, score, status, updated_by }) =>
  db.query(
    `UPDATE leadership_roles
     SET readiness_score = COALESCE($1, readiness_score),
         readiness_status = COALESCE($2, readiness_status),
         updated_at = NOW()
     WHERE church_id = $3 AND member_id = $4
     RETURNING *`,
    [score, status, church_id, member_id]
  ).then(res => res.rows);

export const countMilestonesForMember = async (church_id, member_id) =>
  db.query(
    `SELECT COUNT(*) AS cnt FROM leadership_milestone_records WHERE church_id = $1 AND member_id = $2`,
    [church_id, member_id]
  ).then(res => parseInt(res.rows[0]?.cnt || 0, 10));

export const resetReadinessCache = async (church_id, member_id) =>
  db.query(
    `UPDATE leadership_roles
     SET readiness_score = NULL, readiness_status = NULL, updated_at = NOW()
     WHERE church_id = $1 AND member_id = $2
     RETURNING *`,
    [church_id, member_id]
  ).then(res => res.rows);

// Approval / audit trail for readiness actions
export const addReadinessApproval = async ({ church_id, leader_id, actor_id, action, reason, zone_id = null }) =>
  db.query(
    `INSERT INTO leadership_readiness_approvals (church_id, leader_id, actor_id, action, reason, zone_id)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [church_id, leader_id, actor_id, action, reason, zone_id]
  ).then(res => res.rows[0]);

export const listReadinessApprovals = async (church_id, leader_id) =>
  db.query(
    `SELECT ra.*, u.name AS actor_name FROM leadership_readiness_approvals ra
     LEFT JOIN users u ON u.id = ra.actor_id
     WHERE ra.church_id = $1 AND ra.leader_id = $2
     ORDER BY ra.created_at DESC`,
    [church_id, leader_id]
  ).then(res => res.rows);

// List pending approval requests (latest action per leader is 'requested')
// Supports paging and filters via options: { limit, offset, search, minScore, maxScore, status, zoneId }
export const listPendingApprovalRequests = async (church_id, opts = {}) => {
  const limit = Number(opts.limit) || 20;
  const offset = Number(opts.offset) || 0;
  const search = opts.search ? `%${opts.search.trim()}%` : null;
  const minScore = typeof opts.minScore !== 'undefined' && opts.minScore !== null ? Number(opts.minScore) : null;
  const maxScore = typeof opts.maxScore !== 'undefined' && opts.maxScore !== null ? Number(opts.maxScore) : null;
  const status = opts.status ? String(opts.status) : null;
  const zoneId = typeof opts.zoneId !== 'undefined' && opts.zoneId !== null ? Number(opts.zoneId) : null;

  const params = [church_id];
  let idx = params.length + 1;

  let extraWhere = '';
  if (search) {
    params.push(search);
    extraWhere += ` AND (m.first_name ILIKE $${idx} OR m.surname ILIKE $${idx})`;
    idx++;
  }
  if (minScore !== null && !Number.isNaN(minScore)) {
    params.push(minScore);
    extraWhere += ` AND (lr.readiness_score IS NOT NULL AND lr.readiness_score >= $${idx})`;
    idx++;
  }
  if (maxScore !== null && !Number.isNaN(maxScore)) {
    params.push(maxScore);
    extraWhere += ` AND (lr.readiness_score IS NOT NULL AND lr.readiness_score <= $${idx})`;
    idx++;
  }
  if (status) {
    params.push(status);
    extraWhere += ` AND (lr.readiness_status = $${idx})`;
    idx++;
  }
  if (zoneId !== null && !Number.isNaN(zoneId)) {
    params.push(zoneId);
    extraWhere += ` AND (COALESCE(ra.zone_id, m.zone_id) = $${idx})`;
    idx++;
  }

  // total count (distinct leaders matching filters)
  const countQuery = `SELECT COUNT(DISTINCT ra.leader_id) AS total
     FROM leadership_readiness_approvals ra
     LEFT JOIN leadership_roles lr ON lr.member_id = ra.leader_id AND lr.church_id = ra.church_id
     LEFT JOIN members m ON m.id = ra.leader_id
     WHERE ra.church_id = $1
       AND ra.id IN (
         SELECT MAX(id) FROM leadership_readiness_approvals WHERE church_id = $1 GROUP BY leader_id
       )
       AND ra.action = 'requested'
       ${extraWhere}`;

  const rowsQuery = `SELECT ra.*, u.name AS actor_name, lr.readiness_score, lr.readiness_status, m.first_name, m.surname, COALESCE(ra.zone_id, m.zone_id) AS zone_id
     FROM leadership_readiness_approvals ra
     LEFT JOIN users u ON u.id = ra.actor_id
     LEFT JOIN leadership_roles lr ON lr.member_id = ra.leader_id AND lr.church_id = ra.church_id
     LEFT JOIN members m ON m.id = ra.leader_id
     WHERE ra.church_id = $1
       AND ra.id IN (
         SELECT MAX(id) FROM leadership_readiness_approvals WHERE church_id = $1 GROUP BY leader_id
       )
       AND ra.action = 'requested'
       ${extraWhere}
     ORDER BY ra.created_at DESC
     LIMIT $${idx} OFFSET $${idx + 1}`;

  // push limit & offset
  params.push(limit);
  params.push(offset);

  const client = await db.connect();
  try {
    const countRes = await client.query(countQuery, params.slice(0, params.length - 2));
    const total = parseInt(countRes.rows[0]?.total || 0, 10);
    const rowsRes = await client.query(rowsQuery, params);
    return { rows: rowsRes.rows, total };
  } finally {
    client.release();
  }
};

// Leadership Exit Records
export const updateExitRecord = async ({ id, exit_type, reason, interview_notes }) =>
  db.query(
    `UPDATE leadership_exit_records
     SET exit_type = COALESCE($1, exit_type),
         reason = COALESCE($2, reason),
         interview_notes = COALESCE($3, interview_notes)
     WHERE id = $4
     RETURNING *`,
    [exit_type, reason, interview_notes, id]
  ).then(res => res.rows[0]);

export const deleteExitRecord = async (id) =>
  db.query(
    `DELETE FROM leadership_exit_records WHERE id = $1 RETURNING *`,
    [id]
  ).then(res => res.rows[0]);

// Mentorship Assignments
export const updateMentorshipAssignment = async ({ id, mentor_id, mentee_id, start_date, end_date, notes }) =>
  db.query(
    `UPDATE mentorship_assignments
     SET mentor_id = COALESCE($1, mentor_id),
         mentee_id = COALESCE($2, mentee_id),
         start_date = COALESCE($3, start_date),
         end_date = COALESCE($4, end_date),
         notes = COALESCE($5, notes)
     WHERE id = $6
     RETURNING *`,
    [mentor_id, mentee_id, start_date, end_date, notes, id]
  ).then(res => res.rows[0]);

export const deleteMentorshipAssignment = async (id) =>
  db.query(
    `DELETE FROM mentorship_assignments WHERE id = $1 RETURNING *`,
    [id]
  ).then(res => res.rows[0]);