import db from '../config/db.js';

/**
 * Returns cell-level health summary for the last N weeks.
 * - churchId: id of church
 * - options.weeks: integer (default 8) number of weeks to consider
 *
 * Response: [
 *   {
 *     cell_group_id,
 *     name,
 *     leader_id,
 *     leader_first_name,
 *     leader_surname,
 *     leader_contact,
 *     member_count,
 *     avg_attendance,           // averaged total_cell_attendance over weeks (or NULL)
 *     last_meeting_date,
 *     attendance_trend: [ { week_start, attendance }... ],
 *     is_ready_for_multiplication
 *   }, ...
 * ]
 */
export async function getCellHealthDashboard(churchId, { weeks = 8 } = {}) {
  // compute date range
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - (weeks * 7));

  const q = `
    WITH recent AS (
      SELECT wr.cell_group_id, wr.meeting_date, wr.total_cell_attendance, wr.visitors_count, wr.souls_saved_meeting
      FROM weekly_reports wr
      WHERE wr.church_id = $1
        AND wr.is_deleted IS NOT TRUE
        AND wr.meeting_date BETWEEN $2::date AND $3::date
    ),
    agg AS (
      SELECT cg.id AS cell_group_id, cg.name,
             COALESCE( (SELECT COUNT(*) FROM cell_members cm WHERE cm.cell_group_id = cg.id AND cm.is_active), 0 ) AS member_count,
             MAX(r.meeting_date) AS last_meeting_date,
             ROUND(AVG(COALESCE(r.total_cell_attendance,0))::numeric,2) AS avg_attendance,
             COUNT(r.*) AS meetings_count,
             cg.is_ready_for_multiplication
      FROM cell_groups cg
      LEFT JOIN recent r ON r.cell_group_id = cg.id
      WHERE cg.church_id = $1
      GROUP BY cg.id
    )
    SELECT a.*, z.name AS zone_name, s.name AS status_name,
           m.first_name AS leader_first_name, m.surname AS leader_surname, m.contact_primary AS leader_contact
    FROM agg a
    LEFT JOIN cell_groups cg ON cg.id = a.cell_group_id
    LEFT JOIN zones z ON cg.zone_id = z.id
    LEFT JOIN status_types s ON cg.status_id = s.id
    LEFT JOIN members m ON cg.leader_id = m.id
    ORDER BY a.avg_attendance DESC NULLS LAST, a.meetings_count DESC;
  `;
  const vals = [churchId, startDate.toISOString().slice(0,10), endDate.toISOString().slice(0,10)];
  const { rows } = await db.query(q, vals);

  // assemble trend per cell (small additional query per cell — acceptable for small result sets)
  const results = [];
  for (const r of rows) {
    const trendQ = `
      SELECT meeting_date, total_cell_attendance
      FROM weekly_reports
      WHERE church_id = $1 AND cell_group_id = $2 AND is_deleted IS NOT TRUE
        AND meeting_date BETWEEN $3::date AND $4::date
      ORDER BY meeting_date ASC
    `;
    const trendRes = await db.query(trendQ, [churchId, r.cell_group_id, vals[1], vals[2]]);
    r.attendance_trend = (trendRes.rows || []).map(t => ({ meeting_date: t.meeting_date, attendance: t.total_cell_attendance || 0 }));
    results.push(r);
  }

  return results;
}

/**
 * Consolidated report for month/year (returns meetings array)
 * Response: { meetings: [ { id, cell_group_id, cell_name, topic, session_date, total_cell_attendance, visitors_count, absentees_count, rsvp_count } ], totals: {...} }
 */
export async function getConsolidatedReport(churchId, month, year) {
  // month: 1-12
  if (!churchId) return null;
  const start = `${year}-${String(month).padStart(2,'0')}-01`;
  const q = `
    SELECT wr.id, wr.cell_group_id, cg.name AS cell_name, wr.topic, wr.meeting_date AS session_date,
           COALESCE(wr.total_cell_attendance,0) AS total_cell_attendance,
           COALESCE(wr.visitors_count, (SELECT jsonb_array_length(coalesce(wr.visitors,'[]'::jsonb)))) AS visitors_count,
           COALESCE(wr.absentees_count, (SELECT jsonb_array_length(coalesce(wr.absentees,'[]'::jsonb)))) AS absentees_count
    FROM weekly_reports wr
    LEFT JOIN cell_groups cg ON wr.cell_group_id = cg.id
    WHERE wr.church_id = $1
      AND EXTRACT(MONTH FROM wr.meeting_date)::int = $2
      AND EXTRACT(YEAR FROM wr.meeting_date)::int = $3
      AND wr.is_deleted IS NOT TRUE
    ORDER BY wr.meeting_date ASC
  `;
  const { rows } = await db.query(q, [churchId, month, year]);

  const totals = rows.reduce((acc, cur) => {
    acc.total_attendance = (acc.total_attendance || 0) + (cur.total_cell_attendance || 0);
    acc.total_visitors = (acc.total_visitors || 0) + (cur.visitors_count || 0);
    acc.total_absentees = (acc.total_absentees || 0) + (cur.absentees_count || 0);
    return acc;
  }, {});

  return { meetings: rows, totals };
}

/**
 * Absentee trends: return per-member missed count in last N weeks and summary
 * Response: { summary: { total_flagged, avg_missed }, members: [ { member_id, full_name, missed_count, last_missed_date, cell_name } ] }
 */
export async function getAbsenteeTrends(churchId, { weeks = 12 } = {}) {
  if (!churchId) return null;
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - (weeks * 7));

  // Count occurrences where a member appears in weekly_reports.absentees JSONB
  const q = `
    WITH abs AS (
      SELECT (elem->>'member_id')::bigint AS member_id,
             wr.meeting_date
      FROM weekly_reports wr,
           jsonb_array_elements(coalesce(wr.absentees,'[]'::jsonb)) elem
      WHERE wr.church_id = $1
        AND wr.meeting_date BETWEEN $2::date AND $3::date
        AND (elem->>'member_id') IS NOT NULL
    ), agg AS (
      SELECT a.member_id, COUNT(*) AS missed_count, MAX(a.meeting_date) AS last_missed_date
      FROM abs a
      GROUP BY a.member_id
    )
    SELECT agg.*, m.first_name, m.surname, cg.name AS cell_name
    FROM agg
    LEFT JOIN members m ON m.id = agg.member_id
    -- use cell_members to resolve a member's current cell (members table has no cell_group_id)
    LEFT JOIN cell_members cm ON cm.member_id = m.id AND cm.is_active = TRUE
    LEFT JOIN cell_groups cg ON cg.id = cm.cell_group_id
    ORDER BY agg.missed_count DESC, agg.last_missed_date DESC
    LIMIT 200;
  `;
  const { rows } = await db.query(q, [churchId, startDate.toISOString().slice(0,10), endDate.toISOString().slice(0,10)]);
  const total_flagged = rows.length;
  const avg_missed = rows.reduce((s, r) => s + Number(r.missed_count || 0), 0) / (rows.length || 1);

  return { summary: { total_flagged, avg_missed }, members: rows };
}

/**
 * At-risk members: members with missed_count >= threshold in last weeks
 * Response: [ { member_id, full_name, missed_count, last_missed_date, cell_name, phone } ]
 */
export async function getAtRiskMembers(churchId, { weeks = 12, threshold = 3 } = {}) {
  const trends = await getAbsenteeTrends(churchId, { weeks });
  if (!trends || !Array.isArray(trends.members)) return [];
  const atRisk = trends.members.filter(m => (m.missed_count || 0) >= threshold);

  // attach phone/email
  const memberIds = atRisk.map(m => m.member_id).filter(Boolean);
  if (!memberIds.length) return atRisk;
  const { rows } = await db.query(
    `SELECT id, phone_primary, contact_primary, email FROM members WHERE id = ANY($1::bigint[])`,
    [memberIds]
  );
  const map = {};
  rows.forEach(r => map[r.id] = r);
  return atRisk.map(m => ({ ...m, contact: map[m.member_id] ? (map[m.member_id].contact_primary || map[m.member_id].phone_primary || map[m.member_id].email) : null }));
}

export default {
  getCellHealthDashboard,
  getConsolidatedReport,
  getAbsenteeTrends,
  getAtRiskMembers
};