import db from '../config/db.js';

/** Helpers */
const fullName = (row) => [row.first_name, row.surname].filter(Boolean).join(' ');

async function getGroupByName(church_id, groupName) {
  const { rows } = await db.query(`SELECT id, name, leader_id FROM cell_groups WHERE church_id=$1 AND LOWER(name)=LOWER($2)`, [church_id, groupName]);
  return rows[0];
}

async function memberIdsFromNames(church_id, names) {
  if (!Array.isArray(names) || names.length===0) return [];
  const q = `SELECT id, first_name, surname FROM members WHERE church_id=$1`;
  const { rows } = await db.query(q, [church_id]);
  const map = new Map(rows.map(r => [fullName(r).toLowerCase(), r.id]));
  return names.map(n => map.get(String(n).toLowerCase())).filter(Boolean);
}

async function visitorIdsFromNames(church_id, names) {
  if (!Array.isArray(names) || names.length===0) return [];
  const q = `SELECT id, first_name, surname FROM visitors WHERE church_id=$1`;
  const { rows } = await db.query(q, [church_id]);
  const map = new Map(rows.map(r => [fullName(r).toLowerCase(), r.id]));
  return names.map(n => map.get(String(n).toLowerCase())).filter(Boolean);
}

/** Public API */
export async function getCellGroupsNameSafe(church_id) {
  const { rows } = await db.query(`
    SELECT cg.name, z.name AS zone, st.name AS status,
           (m.first_name || ' ' || COALESCE(m.surname,'')) AS leader,
           cg.health_score
    FROM cell_groups cg
      LEFT JOIN zones z ON cg.zone_id=z.id
      LEFT JOIN members m ON m.id=cg.leader_id
      LEFT JOIN status_types st ON st.id=cg.status_id
    WHERE cg.church_id=$1
    ORDER BY cg.name
  `,[church_id]);
  return rows;
}

export async function getGroupMembersNameSafe(church_id, groupName) {
  const group = await getGroupByName(church_id, groupName);
  if (!group) return [];
  const { rows } = await db.query(`
    SELECT first_name, surname FROM members
     WHERE id IN (SELECT member_id FROM cell_group_members WHERE cell_group_id=$1)
     ORDER BY first_name, surname
  `,[group.id]);
  return rows.map(r => ({ name: fullName(r) }));
}

export async function getLastWeeklyReportNameSafe(church_id, groupName) {
  const group = await getGroupByName(church_id, groupName);
  if (!group) return null;
  const { rows } = await db.query(`
    SELECT date_of_meeting, attendees, absentees, visitors
    FROM cell_leader_reports
    WHERE church_id=$1 AND cell_group_id=$2
    ORDER BY date_of_meeting DESC
    LIMIT 1
  `,[church_id, group.id]);
  if (!rows[0]) return null;
  // Expand names
  const mrows = await db.query(`SELECT id, first_name, surname FROM members WHERE church_id=$1`, [church_id]);
  const mmap = new Map(mrows.rows.map(r => [r.id, fullName(r)]));
  const vrows = await db.query(`SELECT id, first_name, surname, status, follow_up_status FROM visitors WHERE church_id=$1`, [church_id]);
  const vmap = new Map(vrows.rows.map(r => [r.id, { name: fullName(r), status: r.status, follow_up_status: r.follow_up_status }]));
  return {
    date_of_meeting: rows[0].date_of_meeting,
    attendees: (rows[0].attendees||[]).map(id => mmap.get(id)).filter(Boolean),
    absentees: (rows[0].absentees||[]).map(id => mmap.get(id)).filter(Boolean),
    visitors: (rows[0].visitors||[]).map(id => vmap.get(id)).filter(Boolean)
  };
}

export async function getWeeklyReportsNameSafe(church_id, { groupName, start_date, end_date }) {
  const params = [church_id];
  let sql = `
    SELECT r.*, cg.name as cell_group,
           (lm.first_name || ' ' || COALESCE(lm.surname,'')) as leader_name
    FROM cell_leader_reports r
    JOIN cell_groups cg ON cg.id=r.cell_group_id
    LEFT JOIN members lm ON lm.id = r.leader_id
    WHERE r.church_id=$1
  `;
  if (groupName) {
    const group = await getGroupByName(church_id, groupName);
    if (!group) return [];
    sql += ` AND r.cell_group_id=$2`; params.push(group.id);
  }
  if (start_date && end_date) {
    sql += ` AND r.date_of_meeting BETWEEN $${params.length+1} AND $${params.length+2}`;
    params.push(start_date, end_date);
  }
  sql += ` ORDER BY r.date_of_meeting DESC`;
  const { rows } = await db.query(sql, params);
  // Expand names
  const mrows = await db.query(`SELECT id, first_name, surname FROM members WHERE church_id=$1`, [church_id]);
  const mmap = new Map(mrows.rows.map(r => [r.id, fullName(r)]));
  const vrows = await db.query(`SELECT id, first_name, surname, status, follow_up_status FROM visitors WHERE church_id=$1`, [church_id]);
  const vmap = new Map(vrows.rows.map(r => [r.id, { name: fullName(r), status: r.status, follow_up_status: r.follow_up_status }]));

  return rows.map(r => ({
    cell_group: r.cell_group,
    leader: r.leader_name,
    date_of_meeting: r.date_of_meeting,
    topic_taught: r.topic_taught,
    attendance: r.attendance,
    visitors_count: r.visitors_count,
    testimonies: r.testimonies,
    prayer_requests: r.prayer_requests,
    follow_ups: r.follow_ups,
    challenges: r.challenges,
    support_needed: r.support_needed,
    attendees: (r.attendees||[]).map(id => mmap.get(id)).filter(Boolean),
    absentees: (r.absentees||[]).map(id => mmap.get(id)).filter(Boolean),
    visitors: (r.visitors||[]).map(id => vmap.get(id)).filter(Boolean)
  }));
}

export async function createWeeklyReportByNames(payload) {
  const {
    church_id, cell_group_name, date_of_meeting, topic_taught,
    attendee_names = [], visitor_names = [], testimonies,
    prayer_requests, follow_ups, challenges, support_needed
  } = payload;

  const group = await getGroupByName(church_id, cell_group_name);
  if (!group) throw new Error('Cell group not found');
  // leader_id is group's leader
  const leader_id = group.leader_id;

  const attendee_ids = await memberIdsFromNames(church_id, attendee_names);
  // absentees = group members minus attendees
  const { rows: gm } = await db.query(
    `SELECT member_id FROM cell_group_members WHERE cell_group_id=$1`, [group.id]
  );
  const groupMemberIds = new Set(gm.map(r => r.member_id));
  const attendeeSet = new Set(attendee_ids);
  const absentee_ids = [...groupMemberIds].filter(id => !attendeeSet.has(id));

  const visitor_ids = await visitorIdsFromNames(church_id, visitor_names);

  const attendance = attendee_ids.length;
  const visitors_count = visitor_ids.length;

  const { rows } = await db.query(
    `INSERT INTO cell_leader_reports
     (church_id, cell_group_id, leader_id, date_of_meeting, topic_taught,
      attendees, absentees, visitors, attendance, visitors_count,
      testimonies, prayer_requests, follow_ups, challenges, support_needed)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
     RETURNING id`,
    [church_id, group.id, leader_id, date_of_meeting, topic_taught,
     attendee_ids, absentee_ids, visitor_ids, attendance, visitors_count,
     testimonies, prayer_requests, follow_ups, challenges, support_needed]
  );
  const id = rows[0].id;
  // Return name-safe payload summary
  return { ok: true, id }; // id returned server-side only; frontend can ignore
}