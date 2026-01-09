// models/exitInterviewModel.js
import db from '../config/db.js';

export const createInterview = async ({ church_id, exit_id = null, member_id = null, interviewer_id = null, summary = null, answers = [], interview_type = 'exit' }) => {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const r = await client.query(
      `INSERT INTO exit_interviews (church_id, exit_id, member_id, interviewer_id, summary, interview_type)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [church_id, exit_id, member_id, interviewer_id, summary, interview_type]
    );
    const interview = r.rows[0];

    for (const a of answers) {
      await client.query(
        `INSERT INTO exit_interview_answers (interview_id, question_key, question_text, answer_text)
         VALUES ($1,$2,$3,$4)`,
        [interview.id, a.question_key, a.question_text, a.answer_text]
      );
    }

    // Log interview creation in exit audit if it's linked to an exit
    if (exit_id) {
      await client.query(
        `INSERT INTO exit_audit_log (church_id, exit_id, member_id, action, changed_by, notes)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [church_id, exit_id, member_id, 'interview_created', interviewer_id, `Exit interview ${interview.id} created`]
      );
    }

    await client.query('COMMIT');
    return interview;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

export const getInterviewById = async (church_id, id) => {
  const r = await db.query(`SELECT * FROM exit_interviews WHERE id=$1 AND church_id=$2`, [id, church_id]);
  if (r.rowCount === 0) return null;
  const interview = r.rows[0];
  const answers = await db.query(`SELECT * FROM exit_interview_answers WHERE interview_id=$1 ORDER BY id`, [id]);
  interview.answers = answers.rows;
  return interview;
};

export const listInterviews = async (church_id, member_id = null, exit_id = null) => {
  let q = `SELECT i.*, m.first_name, m.surname FROM exit_interviews i
           LEFT JOIN members m ON m.id = i.member_id
           WHERE i.church_id = $1`;
  const params = [church_id];
  if (member_id) { q += ` AND i.member_id = $${params.length + 1}`; params.push(member_id); }
  if (exit_id) { q += ` AND i.exit_id = $${params.length + 1}`; params.push(exit_id); }
  q += ` ORDER BY i.interview_date DESC`;
  const r = await db.query(q, params);
  return r.rows;
};

export const updateInterview = async ({ church_id, id, interviewer_id, summary = null, answers = [] }) => {
  const client = await db.connect();
  try {
    await client.query('BEGIN');

    // Update the interview
    const r = await client.query(
      `UPDATE exit_interviews SET summary = $1, interviewer_id = $2, updated_at = NOW()
       WHERE id = $3 AND church_id = $4 RETURNING *`,
      [summary, interviewer_id, id, church_id]
    );

    if (r.rowCount === 0) throw new Error('Interview not found');

    const interview = r.rows[0];

    // Delete existing answers and insert new ones
    await client.query(`DELETE FROM exit_interview_answers WHERE interview_id = $1`, [id]);

    for (const a of answers) {
      await client.query(
        `INSERT INTO exit_interview_answers (interview_id, question_key, question_text, answer_text)
         VALUES ($1,$2,$3,$4)`,
        [interview.id, a.question_key, a.question_text, a.answer_text]
      );
    }

    await client.query('COMMIT');
    return interview;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

export const deleteInterview = async (church_id, id) => {
  const client = await db.connect();
  try {
    await client.query('BEGIN');

    // Get interview details for audit logging
    const interviewRes = await client.query(
      `SELECT * FROM exit_interviews WHERE id = $1 AND church_id = $2`,
      [id, church_id]
    );

    if (interviewRes.rowCount === 0) throw new Error('Interview not found');

    const interview = interviewRes.rows[0];

    // Delete answers first
    await client.query(`DELETE FROM exit_interview_answers WHERE interview_id = $1`, [id]);

    // Delete the interview
    await client.query(`DELETE FROM exit_interviews WHERE id = $1 AND church_id = $2`, [id, church_id]);

    // Log deletion in exit audit if linked to exit
    if (interview.exit_id) {
      await client.query(
        `INSERT INTO exit_audit_log (church_id, exit_id, member_id, action, changed_by, notes)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [church_id, interview.exit_id, interview.member_id, 'interview_deleted', interview.interviewer_id, `Exit interview ${id} deleted`]
      );
    }

    await client.query('COMMIT');
    return true;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

export const getInterviewTemplates = async (church_id) => {
  // Return predefined interview templates/questions
  const templates = {
    exit: [
      { key: 'prompted_reason', text: 'What prompted your decision to step down?' },
      { key: 'spiritual_health', text: 'Do you feel spiritually healthy?' },
      { key: 'enjoyed_most', text: 'What did you enjoy most as a cell leader?' },
      { key: 'greatest_challenges', text: 'What were your greatest challenges?' },
      { key: 'consider_return', text: 'Would you consider returning in the future?' },
      { key: 'advice_successor', text: 'What advice would you give your successor?' }
    ],
    transition: [
      { key: 'reason_leaving', text: 'What is the main reason for your transition?' },
      { key: 'future_plans', text: 'What are your future plans?' },
      { key: 'support_needed', text: 'What support do you need during this transition?' },
      { key: 'lessons_learned', text: 'What are the key lessons you\'ve learned?' },
      { key: 'recommendations', text: 'What recommendations do you have for the church?' }
    ],
    reinstatement: [
      { key: 'reason_return', text: 'What prompted your decision to return?' },
      { key: 'changes_experience', text: 'How has your experience changed you?' },
      { key: 'expectations', text: 'What are your expectations for your return?' },
      { key: 'support_needed', text: 'What support do you need to reintegrate?' }
    ]
  };

  return templates;
};

export default { createInterview, getInterviewById, listInterviews, updateInterview, deleteInterview, getInterviewTemplates };
