// models/exitInterviewModel.js
import db from '../config/db.js';

export const createInterview = async ({ church_id, exit_id = null, member_id = null, interviewer_id = null, summary = null, answers = [] }) => {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const r = await client.query(
      `INSERT INTO exit_interviews (church_id, exit_id, member_id, interviewer_id, summary)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [church_id, exit_id, member_id, interviewer_id, summary]
    );
    const interview = r.rows[0];

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

export const getInterviewById = async (church_id, id) => {
  const r = await db.query(`SELECT * FROM exit_interviews WHERE id=$1 AND church_id=$2`, [id, church_id]);
  if (r.rowCount === 0) return null;
  const interview = r.rows[0];
  const answers = await db.query(`SELECT * FROM exit_interview_answers WHERE interview_id=$1 ORDER BY id`, [id]);
  interview.answers = answers.rows;
  return interview;
};

export const listInterviews = async (church_id, member_id = null) => {
  let q = `SELECT * FROM exit_interviews WHERE church_id = $1`;
  const params = [church_id];
  if (member_id) { q += ` AND member_id = $2`; params.push(member_id); }
  q += ` ORDER BY interview_date DESC`;
  const r = await db.query(q, params);
  return r.rows;
};

export default { createInterview, getInterviewById, listInterviews };
