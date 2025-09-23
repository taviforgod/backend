import db from '../config/db.js';
import { Parser } from 'json2csv';
import ExcelJS from 'exceljs';

const fullName = (r) => [r.first_name, r.surname].filter(Boolean).join(' ');

export async function getVisitorsNameSafe(church_id) {
  const { rows } = await db.query(
    `SELECT id, first_name, surname, contact_primary, contact_secondary, email, home_address, date_of_first_visit,
            how_heard, age_group, church_affiliation, prayer_requests, invited_by, follow_up_method,
            member_id, next_follow_up_date, notes, status, follow_up_status, created_at, updated_at
     FROM visitors WHERE church_id=$1 ORDER BY created_at DESC`, [church_id]);
  return rows;
}

export async function createVisitor(data) {
  const {
    church_id, cell_group_id, first_name, surname, contact_primary, contact_secondary, email, home_address,
    date_of_first_visit, how_heard, age_group, church_affiliation, prayer_requests,
    invited_by, follow_up_method, member_id, next_follow_up_date, notes,
    status, follow_up_status
  } = data;

  const { rows } = await db.query(
    `INSERT INTO visitors (
      church_id, cell_group_id, first_name, surname, contact_primary, contact_secondary, email, home_address,
      date_of_first_visit, how_heard, age_group, church_affiliation, prayer_requests,
      invited_by, follow_up_method, member_id, next_follow_up_date, notes,
      status, follow_up_status, created_at, updated_at
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8,
      $9, $10, $11, $12, $13,
      $14, $15, $16, $17, $18,
      COALESCE($19, 'new'), COALESCE($20, 'pending'), NOW(), NOW()
    )
    RETURNING *`,
    [
      church_id, cell_group_id, first_name, surname, contact_primary, contact_secondary, email, home_address,
      date_of_first_visit, how_heard, age_group, church_affiliation, prayer_requests,
      invited_by, follow_up_method, member_id, next_follow_up_date, notes,
      status, follow_up_status
    ]
  );
  return rows[0];
}

async function getVisitorIdByName(church_id, first_name, surname) {
  const { rows } = await db.query(
    `SELECT id FROM visitors WHERE church_id=$1 AND LOWER(first_name)=LOWER($2) AND COALESCE(LOWER(surname),'')=COALESCE(LOWER($3),'') LIMIT 1`,
    [church_id, first_name, surname || '']
  );
  return rows[0]?.id;
}

export async function updateVisitorByName(data) {
  const {
    church_id, first_name, surname, contact_primary, contact_secondary, email, home_address,
    date_of_first_visit, how_heard, age_group, church_affiliation, prayer_requests,
    invited_by, follow_up_method, member_id, next_follow_up_date, notes,
    status, follow_up_status
  } = data;

  const id = await getVisitorIdByName(church_id, first_name, surname);
  if (!id) throw new Error('Visitor not found');
  const { rows } = await db.query(
    `UPDATE visitors SET
        contact_primary=COALESCE($1,contact_primary),
        contact_secondary=COALESCE($2,contact_secondary),
        email=COALESCE($3,email),
        home_address=COALESCE($4,home_address),
        date_of_first_visit=COALESCE($5,date_of_first_visit),
        how_heard=COALESCE($6,how_heard),
        age_group=COALESCE($7,age_group),
        church_affiliation=COALESCE($8,church_affiliation),
        prayer_requests=COALESCE($9,prayer_requests),
        invited_by=COALESCE($10,invited_by),
        follow_up_method=COALESCE($11,follow_up_method),
        member_id=COALESCE($12,member_id),
        next_follow_up_date=COALESCE($13,next_follow_up_date),
        notes=COALESCE($14,notes),
        status=COALESCE($15,status),
        follow_up_status=COALESCE($16,follow_up_status),
        updated_at=NOW()
     WHERE id=$17
     RETURNING *`,
    [
      contact_primary, contact_secondary, email, home_address, date_of_first_visit, how_heard, age_group,
      church_affiliation, prayer_requests, invited_by, follow_up_method, member_id,
      next_follow_up_date, notes, status, follow_up_status, id
    ]
  );
  return rows[0];
}

export async function deleteVisitorByName({ church_id, first_name, surname }) {
  const id = await getVisitorIdByName(church_id, first_name, surname);
  if (!id) return;
  await db.query(`DELETE FROM visitors WHERE id=$1 AND church_id=$2`, [id, church_id]);
}

export async function updateVisitorFollowUpStatus({ church_id, first_name, surname, follow_up_status }) {
  const id = await getVisitorIdByName(church_id, first_name, surname);
  if (!id) throw new Error('Visitor not found');
  const { rows } = await db.query(
    `UPDATE visitors SET follow_up_status=$1, updated_at=NOW() WHERE id=$2 RETURNING first_name, surname, status, follow_up_status`,
    [follow_up_status, id]
  );
  return rows[0];
}

export async function convertVisitorByName({ church_id, first_name, surname, cell_group_name }) {
  const vid = await getVisitorIdByName(church_id, first_name, surname);
  if (!vid) throw new Error('Visitor not found');

  // Create member
  const { rows: mrows } = await db.query(
    `INSERT INTO members (church_id, first_name, surname, email, contact_primary, contact_secondary, created_at) VALUES ($1,$2,$3,$4,$5,$6,NOW()) RETURNING id`,
    [church_id, first_name, surname, '', '', '']
  );
  const member_id = mrows[0].id;

  // Link to group if provided
  if (cell_group_name) {
    const { rows: g } = await db.query(`SELECT id FROM cell_groups WHERE church_id=$1 AND LOWER(name)=LOWER($2)`, [church_id, cell_group_name]);
    const gid = g[0]?.id || g.rows[0]?.id;
    if (gid) {
      await db.query(
        `INSERT INTO cell_group_members (cell_group_id, member_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`,
        [gid, member_id]
      );
    }
  }

  // Update visitor row
  await db.query(
    `UPDATE visitors SET status='converted', follow_up_status='done', member_id=$1, updated_at=NOW() WHERE id=$2`,
    [member_id, vid]
  );

  return { first_name, surname, status: 'converted', follow_up_status: 'done' };
}

export async function exportVisitorCSV({ church_id, first_name, surname }) {
  const { rows } = await db.query(
    `SELECT first_name, surname, contact_primary, contact_secondary, email, home_address, date_of_first_visit,
            how_heard, age_group, church_affiliation, prayer_requests, invited_by, follow_up_method,
            member_id, next_follow_up_date, notes, status, follow_up_status, created_at, updated_at
     FROM visitors WHERE church_id=$1 AND LOWER(first_name)=LOWER($2) AND COALESCE(LOWER(surname),'')=COALESCE(LOWER($3),'') LIMIT 1`,
    [church_id, first_name, surname || '']
  );
  if (!rows.length) throw new Error('Visitor not found');
  const parser = new Parser();
  return parser.parse(rows);
}

export async function exportVisitorExcel({ church_id, first_name, surname }) {
  const { rows } = await db.query(
    `SELECT first_name, surname, contact_primary, contact_secondary, email, home_address, date_of_first_visit,
            how_heard, age_group, church_affiliation, prayer_requests, invited_by, follow_up_method,
            member_id, next_follow_up_date, notes, status, follow_up_status, created_at, updated_at
     FROM visitors WHERE church_id=$1 AND LOWER(first_name)=LOWER($2) AND COALESCE(LOWER(surname),'')=COALESCE(LOWER($3),'') LIMIT 1`,
    [church_id, first_name, surname || '']
  );
  if (!rows.length) throw new Error('Visitor not found');
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Visitor');
  sheet.columns = Object.keys(rows[0]).map(key => ({ header: key, key }));
  sheet.addRow(rows[0]);
  return await workbook.xlsx.writeBuffer();
}

export async function updateVisitorFollowUpStatusById({ id, follow_up_status }) {
  console.log('updateVisitorFollowUpStatusById called with id:', id, 'status:', follow_up_status);
  const { rows } = await db.query(
    `UPDATE visitors SET follow_up_status=$1, updated_at=NOW() WHERE id=$2 RETURNING first_name, surname, status, follow_up_status`,
    [follow_up_status, id]
  );
  if (!rows.length) throw new Error('Visitor not found');
  return rows[0];
}

export async function convertVisitorById({ id, cell_group_name, church_id }) {
  // Get visitor info
  const { rows: vrows } = await db.query(
    `SELECT first_name, surname, church_id, email, contact_primary, contact_secondary FROM visitors WHERE id=$1`, [id]
  );
  if (!vrows.length) throw new Error('Visitor not found');
  const { first_name, surname, church_id: cid, email, contact_primary, contact_secondary } = vrows[0];

  try {
    // Create member
    const { rows: mrows } = await db.query(
      `INSERT INTO members (church_id, first_name, surname, email, contact_primary, contact_secondary, created_at) VALUES ($1,$2,$3,$4,$5,$6,NOW()) RETURNING id`,
      [cid, first_name, surname, email || '', contact_primary || '', contact_secondary || '']
    );
    const member_id = mrows[0].id;

    // Link to group if provided
    if (cell_group_name) {
      const { rows: g } = await db.query(`SELECT id FROM cell_groups WHERE church_id=$1 AND LOWER(name)=LOWER($2)`, [cid, cell_group_name]);
      const gid = g[0]?.id || g.rows[0]?.id;
      if (gid) {
        await db.query(
          `INSERT INTO cell_group_members (cell_group_id, member_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`,
          [gid, member_id]
        );
      }
    }

    // Update visitor row
    await db.query(
      `UPDATE visitors SET status='converted', follow_up_status='done', member_id=$1, updated_at=NOW() WHERE id=$2`,
      [member_id, id]
    );

    return { first_name, surname, status: 'converted', follow_up_status: 'done' };
  } catch (err) {
    if (err.code === '23505') { // unique_violation
      return { success: false, error: 'A member with this email already exists.' };
    }
    return { success: false, error: err.message };
  }
}

export async function updateVisitorStatus(id, status) {
  await db.query(
    `UPDATE visitors SET status = $1 WHERE id = $2`,
    [status, id]
  );
}