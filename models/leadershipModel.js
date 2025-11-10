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
     FROM milestone_records mr
     LEFT JOIN leadership_milestone_templates mt ON mt.id = mr.template_id
     WHERE mr.church_id = $1 AND mr.member_id = $2
     ORDER BY completed_at DESC`,
    [church_id, member_id]
  ).then(res => res.rows);

// Add a milestone record for a member
export const addMilestoneRecord = async ({ church_id, member_id, template_id, milestone_name, notes }) =>
  db.query(
    `INSERT INTO milestone_records (church_id, member_id, template_id, milestone_name, notes)
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