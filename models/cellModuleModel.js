// server/models/cellModuleModel.js
import db from '../config/db.js';
import { Parser } from 'json2csv';
import PDFDocument from 'pdfkit';

/**
 * Utility helpers
 */
const toInt = (v) => {
  if (v === undefined || v === null || v === '') return null;
  const n = Number(v);
  return Number.isInteger(n) ? n : null;
};

const sanitizeIntArray = (input) => {
  if (!Array.isArray(input)) return [];
  return input
    .map((v) => {
      if (typeof v === 'number' && Number.isInteger(v)) return v;
      if (typeof v === 'string' && v.trim() !== '') {
        const n = Number(v);
        return Number.isInteger(n) ? n : NaN;
      }
      return NaN;
    })
    .filter((v) => Number.isInteger(v));
};

/**
 * ZONES
 */
export const getZones = async (church_id) => {
  const res = await db.query(
    `SELECT id, name, description, active, created_at
       FROM zones
      WHERE church_id = $1
      ORDER BY name`,
    [church_id]
  );
  return res.rows;
};

export const createZone = async (data) => {
  const { name, description, church_id } = data;
  const res = await db.query(
    `INSERT INTO zones (name, description, church_id)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [name, description || null, church_id]
  );
  return res.rows[0];
};

export const updateZone = async (id, data, church_id) => {
  const { name, description, active } = data;
  const res = await db.query(
    `UPDATE zones
       SET name = $1, description = $2, active = $3, updated_at = NOW()
     WHERE id = $4 AND church_id = $5
     RETURNING *`,
    [name, description || null, active === undefined ? true : !!active, id, church_id]
  );
  return res.rows[0];
};

export const deleteZone = async (id, church_id) => {
  await db.query(`DELETE FROM zones WHERE id = $1 AND church_id = $2`, [id, church_id]);
};

/**
 * STATUS TYPES / cell_statuses (lookup)
 */
export const getStatusTypes = async (church_id) => {
  const res = await db.query(
    `SELECT id, name, description, active, sort_order
       FROM status_types
      WHERE (church_id = $1 OR church_id IS NULL)
      ORDER BY sort_order NULLS LAST, name`,
    [church_id]
  );
  return res.rows;
};

export const createStatusType = async (data) => {
  const { name, description, sort_order, church_id } = data;
  const res = await db.query(
    `INSERT INTO status_types (name, description, sort_order, church_id)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [name, description || null, sort_order || 0, church_id]
  );
  return res.rows[0];
};

export const updateStatusType = async (id, data, church_id) => {
  const { name, description, active, sort_order } = data;
  const res = await db.query(
    `UPDATE status_types
       SET name = $1, description = $2, active = $3, sort_order = $4, updated_at = NOW()
     WHERE id = $5 AND church_id = $6
     RETURNING *`,
    [name, description || null, active === undefined ? true : !!active, sort_order || 0, id, church_id]
  );
  return res.rows[0];
};

export const deleteStatusType = async (id, church_id) => {
  await db.query(`DELETE FROM status_types WHERE id = $1 AND church_id = $2`, [id, church_id]);
};

/**
 * CELL GROUPS
 */
export const getCellGroups = async (church_id) => {
  const res = await db.query(
    `SELECT cg.*, 
            z.name AS zone,
            st.name AS status,
            (SELECT COUNT(*) FROM cell_group_members cgm WHERE cgm.cell_group_id = cg.id AND cgm.removed_at IS NULL) AS members_count,
            m.id AS leader_id,
            m.first_name AS leader_first_name,
            m.surname AS leader_surname,
            m.contact_primary AS leader_phone,
            m.email AS leader_email
       FROM cell_groups cg
       LEFT JOIN zones z ON cg.zone_id = z.id
       LEFT JOIN members m ON cg.leader_id = m.id
       LEFT JOIN status_types st ON cg.status_id = st.id
      WHERE cg.church_id = $1
      ORDER BY cg.name`,
    [church_id]
  );
  return res.rows.map(row => ({
    ...row,
    leader: row.leader_id
      ? {
          id: row.leader_id,
          first_name: row.leader_first_name,
          surname: row.leader_surname,
          phone: row.leader_phone,
          email: row.leader_email,
        }
      : null,
  }));
};

export const getCellGroupById = async (id, church_id) => {
  const res = await db.query(
    `SELECT cg.*, 
            z.name AS zone,
            st.name AS status,
            m.id AS leader_id,
            m.first_name AS leader_first_name,
            m.surname AS leader_surname,
            m.contact_primary AS leader_phone,
            m.email AS leader_email
       FROM cell_groups cg
       LEFT JOIN zones z ON cg.zone_id = z.id
       LEFT JOIN members m ON cg.leader_id = m.id
       LEFT JOIN status_types st ON cg.status_id = st.id
      WHERE cg.id = $1 AND cg.church_id = $2`,
    [id, church_id]
  );
  const row = res.rows[0];
  if (!row) return null;
  return {
    ...row,
    leader: row.leader_id
      ? {
          id: row.leader_id,
          first_name: row.leader_first_name,
          surname: row.leader_surname,
          phone: row.leader_phone,
          email: row.leader_email,
        }
      : null,
  };
};

export const createCellGroup = async (data) => {
  const { name, zone_id, leader_id, location, status_id, health_score, church_id } = data;
  const res = await db.query(
    `INSERT INTO cell_groups (name, zone_id, leader_id, location, status_id, health_score, church_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7)
     RETURNING *`,
    [name, toInt(zone_id), toInt(leader_id), location || null, toInt(status_id), health_score || 100, church_id]
  );
  return res.rows[0];
};

export const updateCellGroup = async (id, data, church_id) => {
  const { name, zone_id, leader_id, location, status_id, health_score } = data;
  const res = await db.query(
    `UPDATE cell_groups
       SET name = $1,
           zone_id = $2,
           leader_id = $3,
           location = $4,
           status_id = $5,
           health_score = $6,
           updated_at = NOW()
     WHERE id = $7 AND church_id = $8
     RETURNING *`,
    [name, toInt(zone_id), toInt(leader_id), location || null, toInt(status_id), health_score, id, church_id]
  );
  return res.rows[0];
};

export const deleteCellGroup = async (id, church_id) => {
  await db.query(`DELETE FROM cell_groups WHERE id = $1 AND church_id = $2`, [id, church_id]);
};

/**
 * GROUP MEMBERS
 */


export const getCellGroupMembers = async (cell_group_id) => {
  const queryWithAssignedAt = `
    SELECT m.id, m.first_name, m.surname, m.email, m.member_status_id,
           cgm.role, cgm.assigned_at, cgm.removed_at
      FROM cell_group_members cgm
      INNER JOIN members m ON cgm.member_id = m.id
     WHERE cgm.cell_group_id = $1
       AND (cgm.removed_at IS NULL OR cgm.removed_at IS NULL)
     ORDER BY cgm.assigned_at DESC NULLS LAST, m.first_name, m.surname;
  `;

  const queryWithoutAssignedAt = `
    SELECT m.id, m.first_name, m.surname, m.email, m.member_status_id,
           cgm.role, NULL AS assigned_at, cgm.removed_at
      FROM cell_group_members cgm
      INNER JOIN members m ON cgm.member_id = m.id
     WHERE cgm.cell_group_id = $1
     ORDER BY m.first_name, m.surname;
  `;

  try {
    const res = await db.query(queryWithAssignedAt, [cell_group_id]);
    return res.rows;
  } catch (err) {
    if (err && err.code === '42703') {
      const res2 = await db.query(queryWithoutAssignedAt, [cell_group_id]);
      return res2.rows;
    }
    throw err;
  }
};

export const addCellGroupMember = async ({ cell_group_id, member_ids = [], role = 'member' }) => {
  if (!Array.isArray(member_ids) || member_ids.length === 0) return [];
  const results = [];

  const upsertSql = `
    INSERT INTO cell_group_members (cell_group_id, member_id, role, assigned_at)
    VALUES ($1, $2, $3, NOW())
    ON CONFLICT (cell_group_id, member_id)
      DO UPDATE SET role = EXCLUDED.role, removed_at = NULL, assigned_at = EXCLUDED.assigned_at
    RETURNING *;
  `;

  const insertIfNotExistsSql = `
    INSERT INTO cell_group_members (cell_group_id, member_id, role, assigned_at)
    SELECT $1, $2, $3, NOW()
    WHERE NOT EXISTS (
      SELECT 1 FROM cell_group_members c WHERE c.cell_group_id = $1 AND c.member_id = $2
    )
    RETURNING *;
  `;

  for (const rawMid of member_ids) {
    const mid = Number(rawMid);
    if (!Number.isInteger(mid)) continue;
    try {
      const res = await db.query(upsertSql, [cell_group_id, mid, role || 'member']);
      if (res.rows[0]) results.push(res.rows[0]);
    } catch (err) {
      if (err && err.code === '42703') {
        const r2 = await db.query(insertIfNotExistsSql, [cell_group_id, mid, role || 'member']);
        if (r2.rows[0]) results.push(r2.rows[0]);
      } else {
        try {
          const r2 = await db.query(insertIfNotExistsSql, [cell_group_id, mid, role || 'member']);
          if (r2.rows[0]) results.push(r2.rows[0]);
        } catch (err2) {
          throw err2;
        }
      }
    }
  }

  return results;
};

export const removeCellGroupMember = async (cell_group_id, member_id) => {
  const res = await db.query(
    `UPDATE cell_group_members
        SET removed_at = NOW()
      WHERE cell_group_id = $1 AND member_id = $2 AND removed_at IS NULL
      RETURNING *`,
    [cell_group_id, member_id]
  );
  return res.rows[0];
};

/**
 * HEALTH HISTORY (cell_group_health_history table assumed)
 */
export const getCellHealthHistory = async (cell_group_id) => {
  const res = await db.query(
    `SELECT id, cell_group_id, report_date, health_score, attendance, notes, created_at
       FROM cell_group_health_history
      WHERE cell_group_id = $1
      ORDER BY report_date DESC`,
    [cell_group_id]
  );
  return res.rows;
};

export const addCellHealthHistory = async (data) => {
  const { cell_group_id, report_date, health_score, attendance, notes } = data;
  const res = await db.query(
    `INSERT INTO cell_group_health_history (cell_group_id, report_date, health_score, attendance, notes)
     VALUES ($1,$2,$3,$4,$5)
     RETURNING *`,
    [cell_group_id, report_date, health_score || null, attendance || 0, notes || null]
  );
  return res.rows[0];
};

/**
 * WEEKLY REPORTS - cell_leader_reports
 *
 * IMPORTANT: Ensure you run the migration to create cell_leader_reports before using createWeeklyCellReport.
 * Example migration fragment:
 *
 * CREATE TABLE IF NOT EXISTS cell_leader_reports (
 *   id SERIAL PRIMARY KEY,
 *   church_id INT NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
 *   cell_group_id INT NOT NULL REFERENCES cell_groups(id),
 *   leader_id INT NOT NULL REFERENCES members(id),
 *   date_of_meeting DATE NOT NULL,
 *   topic_taught TEXT,
 *   attendees INT[] DEFAULT '{}',
 *   absentees INT[] DEFAULT '{}',
 *   visitors INT[] DEFAULT '{}',
 *   attendance INT DEFAULT 0,
 *   visitors_count INT DEFAULT 0,
 *   testimonies TEXT,
 *   prayer_requests TEXT,
 *   follow_ups TEXT,
 *   challenges TEXT,
 *   support_needed TEXT,
 *   created_at TIMESTAMP DEFAULT NOW()
 * );
 */

// Helper: Get absence count for a member in a cell group
export const getAbsenceCount = async (member_id, cell_group_id, church_id) => {
  const res = await db.query(
    `SELECT COUNT(*)::int AS count
       FROM cell_leader_reports
      WHERE cell_group_id = $1 AND church_id = $2
        AND absentees @> ARRAY[$3]::int[]`,
    [cell_group_id, church_id, member_id]
  );
  return res.rows[0]?.count || 0;
};

// Helper: Check if member missed N consecutive meetings
export const isConsecutiveAbsence = async (member_id, cell_group_id, church_id, n = 6) => {
  const res = await db.query(
    `SELECT absentees
       FROM cell_leader_reports
      WHERE cell_group_id = $1 AND church_id = $2
      ORDER BY date_of_meeting DESC
      LIMIT $3`,
    [cell_group_id, church_id, n]
  );
  if (!res.rows || res.rows.length < n) return false;
  return res.rows.every(r => Array.isArray(r.absentees) && r.absentees.includes(member_id));
};

export const getWeeklyCellReports = async (church_id, filter = {}) => {
  const { cell_group_id, start_date, end_date } = filter;
  let sql = `SELECT r.*, cg.name as cell_group, m.first_name || ' ' || m.surname as leader, r.attendee_names, r.absentee_reasons
               FROM cell_leader_reports r
               LEFT JOIN cell_groups cg ON r.cell_group_id = cg.id
               LEFT JOIN members m ON r.leader_id = m.id
              WHERE r.church_id = $1`;
  const params = [church_id];
  if (cell_group_id) {
    params.push(cell_group_id);
    sql += ` AND r.cell_group_id = $${params.length}`;
  }
  if (start_date && end_date) {
    params.push(start_date, end_date);
    sql += ` AND r.date_of_meeting BETWEEN $${params.length - 1} AND $${params.length}`;
  }
  sql += ` ORDER BY r.date_of_meeting DESC`;
  const res = await db.query(sql, params);
  return res.rows;
};

export const getLastWeeklyReport = async (cell_group_id, church_id) => {
  const res = await db.query(
    `SELECT * FROM cell_leader_reports
      WHERE cell_group_id = $1 AND church_id = $2
      ORDER BY date_of_meeting DESC
      LIMIT 1`,
    [cell_group_id, church_id]
  );
  return res.rows[0];
};

export const createWeeklyCellReport = async (data) => {
  const {
    cell_group_id, leader_id, date_of_meeting, topic_taught, attendance,
    attendees, attendee_names, visitors, testimonies, prayer_requests,
    follow_ups, challenges, support_needed, church_id, absentees, absenteeReasons
  } = data;

  const res = await db.query(
    `INSERT INTO cell_leader_reports
      (cell_group_id, leader_id, date_of_meeting, topic_taught, attendance,
       attendees, attendee_names, visitors, testimonies, prayer_requests,
       follow_ups, challenges, support_needed, church_id, absentees, absentee_reasons)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
     RETURNING *`,
    [
      cell_group_id,
      leader_id,
      date_of_meeting,
      topic_taught,
      attendance,
      attendees,
      attendee_names,
      visitors,
      testimonies,
      prayer_requests,
      follow_ups,
      challenges,
      support_needed,
      church_id,
      absentees,
      absenteeReasons 
    ]
  );
  return res.rows[0];
};

// Add this function to support updating a weekly report
export const updateWeeklyCellReport = async (id, data, church_id) => {
  const {
    cell_group_id, leader_id, date_of_meeting, topic_taught, attendance,
    attendees, attendee_names, visitors, testimonies, prayer_requests,
    follow_ups, challenges, support_needed, absentees, absenteeReasons
  } = data;

  const res = await db.query(
    `UPDATE cell_leader_reports
        SET cell_group_id = $1,
            leader_id = $2,
            date_of_meeting = $3,
            topic_taught = $4,
            attendance = $5,
            attendees = $6,
            attendee_names = $7,
            visitors = $8,
            testimonies = $9,
            prayer_requests = $10,
            follow_ups = $11,
            challenges = $12,
            support_needed = $13,
            absentees = $14,
            absentee_reasons = $15,
            updated_at = NOW()
      WHERE id = $16 AND church_id = $17
      RETURNING *`,
    [
      cell_group_id,
      leader_id,
      date_of_meeting,
      topic_taught,
      attendance,
      attendees,
      attendee_names,
      visitors,
      testimonies,
      prayer_requests,
      follow_ups,
      challenges,
      support_needed,
      absentees,
      absenteeReasons,
      id,
      church_id
    ]
  );
  return res.rows[0];
};

// Delete a weekly report by id and church_id
export const deleteWeeklyReport = async (id, church_id) => {
  await db.query(
    `DELETE FROM cell_leader_reports WHERE id = $1 AND church_id = $2`,
    [id, church_id]
  );
  return true;
};

/**
 * Analytics & Dashboard
 */

// Absentee Trends Dashboard: absentee % per cell/zone
export const getAbsenteeTrends = async (church_id) => {
  const res = await db.query(
    `SELECT cg.name as cell_group, z.name as zone,
            AVG(COALESCE(array_length(r.absentees,1),0))::numeric(4,2) as avg_absentees,
            AVG(COALESCE(array_length(r.attendees,1),0))::numeric(4,2) as avg_attendance
       FROM cell_leader_reports r
       LEFT JOIN cell_groups cg ON r.cell_group_id = cg.id
       LEFT JOIN zones z ON cg.zone_id = z.id
      WHERE r.church_id = $1
      GROUP BY cg.name, z.name
      ORDER BY avg_absentees DESC`,
    [church_id]
  );
  return res.rows;
};

// At Risk Member List (missed >4, no contact)
export const getAtRiskMembers = async (church_id) => {
  const res = await db.query(
    `SELECT m.id, m.first_name, m.surname, COUNT(r.id) as absence_count
       FROM members m
       JOIN cell_group_members cgm ON m.id = cgm.member_id
       JOIN cell_leader_reports r ON cgm.cell_group_id = r.cell_group_id
      WHERE r.church_id = $1
        AND m.id = ANY(r.absentees)
      GROUP BY m.id, m.first_name, m.surname
      HAVING COUNT(r.id) > 4
      ORDER BY absence_count DESC`,
    [church_id]
  );
  return res.rows;
};

// Retention rate: how many absentees return after follow-up
export const getAbsenteeRetentionRate = async (church_id) => {
  // This is a simplified example, you may want to refine logic
  const res = await db.query(
    `SELECT COUNT(DISTINCT m.id) as total_absentees,
            COUNT(DISTINCT CASE WHEN m.id = ANY(r.attendees) THEN m.id END) as returned
       FROM members m
       JOIN cell_group_members cgm ON m.id = cgm.member_id
       JOIN cell_leader_reports r ON cgm.cell_group_id = r.cell_group_id
      WHERE r.church_id = $1
        AND m.id = ANY(r.absentees)`,
    [church_id]
  );
  return res.rows[0];
};

/**
 * NOTIFICATIONS
 */
export const queueNotification = async ({ church_id, user_id, type, title, message, link, priority = 'normal' }) => {
  const res = await db.query(
    `INSERT INTO notifications (church_id, user_id, type, title, message, link, priority, created_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,NOW())
     RETURNING *`,
    [church_id, user_id, type, title, message, link || null, priority]
  );
  return res.rows[0];
};

export const getUserNotifications = async (user_id, church_id) => {
  const res = await db.query(
    `SELECT * FROM notifications WHERE user_id = $1 AND church_id = $2 ORDER BY created_at DESC`,
    [user_id, church_id]
  );
  return res.rows;
};

export const markNotificationRead = async (id, user_id) => {
  await db.query(`UPDATE notifications SET read_at = NOW() WHERE id = $1 AND user_id = $2`, [id, user_id]);
};

/**
 * EXPORTS
 */
export const exportCellGroupsCSV = async (church_id) => {
  const { rows } = await db.query(
    `SELECT cg.name, z.name AS zone, COALESCE(m.first_name || ' ' || m.surname,'') AS leader, cg.health_score, st.name AS status
       FROM cell_groups cg
       LEFT JOIN zones z ON cg.zone_id = z.id
       LEFT JOIN members m ON cg.leader_id = m.id
       LEFT JOIN status_types st ON cg.status_id = st.id
      WHERE cg.church_id = $1
      ORDER BY cg.name`,
    [church_id]
  );
  const parser = new Parser();
  return parser.parse(rows);
};

export const exportCellHealthPDF = async (cell_group_id) => {
  const { rows } = await db.query(
    `SELECT * FROM cell_group_health_history WHERE cell_group_id = $1 ORDER BY report_date DESC`,
    [cell_group_id]
  );

  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  doc.info.Title = 'Cell Health History';
  doc.fontSize(16).text('Cell Health History Report', { align: 'center' });
  doc.moveDown();

  rows.forEach((r) => {
    doc.fontSize(12).text(`Date: ${r.report_date}`);
    doc.text(`Score: ${r.health_score !== null ? r.health_score : '—'}`);
    doc.text(`Attendance: ${r.attendance !== null ? r.attendance : '—'}`);
    if (r.notes) {
      doc.text(`Notes: ${r.notes}`);
    }
    doc.moveDown();
  });

  doc.end();
  return doc; 
};

// Health and Growth Metrics

export const getUnassignedMembers = async (church_id) => {
  const res = await db.query(
    `SELECT m.id, m.first_name, m.surname, m.email
       FROM members m
      WHERE m.church_id = $1
        AND NOT EXISTS (
          SELECT 1 FROM cell_group_members cgm
           WHERE cgm.member_id = m.id
             AND cgm.removed_at IS NULL
        )
      ORDER BY m.first_name, m.surname`,
    [church_id]
  );
  return res.rows;
};

// Health and Growth Metrics
export const getCellGroupHealthDashboard = async (church_id) => {
  const res = await db.query(
    `
    WITH base AS (
      SELECT 
        cg.id, 
        cg.name, 
        cg.zone_id,
        cg.leader_id,
        cg.status_id,
        z.name AS zone,
        COALESCE(m.first_name || ' ' || m.surname, '') AS leader,
        st.name AS status,
        -- Attendance rate (rounded to 2 decimals)
        ROUND(CAST(COALESCE((
          SELECT AVG(r.attendance)::float / NULLIF(COUNT(DISTINCT m2.id),0)
          FROM cell_leader_reports r
          LEFT JOIN cell_group_members m2 ON m2.cell_group_id = cg.id AND m2.removed_at IS NULL
          WHERE r.cell_group_id = cg.id 
            AND r.church_id = $1
            AND r.date_of_meeting >= NOW() - INTERVAL '6 weeks'
        ), 0) AS numeric), 2) AS attendance_rate,
        -- Meetings held
        COALESCE((
          SELECT COUNT(*) 
          FROM cell_leader_reports r 
          WHERE r.cell_group_id = cg.id 
            AND r.church_id = $1
            AND r.date_of_meeting >= NOW() - INTERVAL '6 weeks'
        ), 0) AS meetings_held,
        -- Members
        COUNT(cgm.member_id) FILTER (WHERE cgm.removed_at IS NULL) AS members_count,
        -- New members
        COALESCE((
          SELECT COUNT(*) 
          FROM cell_group_members cgm2
          WHERE cgm2.cell_group_id = cg.id
            AND cgm2.assigned_at >= NOW() - INTERVAL '6 weeks'
            AND cgm2.removed_at IS NULL
        ), 0) AS new_members,
        -- Avg visitors (rounded to 2 decimals)
        ROUND(CAST(COALESCE((
          SELECT AVG(r.visitors_count)
          FROM cell_leader_reports r
          WHERE r.cell_group_id = cg.id
            AND r.church_id = $1
            AND r.date_of_meeting >= NOW() - INTERVAL '6 weeks'
        ), 0) AS numeric), 2) AS avg_visitors,
        -- Last meeting date
        COALESCE((
          SELECT MAX(r.date_of_meeting)
          FROM cell_leader_reports r
          WHERE r.cell_group_id = cg.id
            AND r.church_id = $1
        ), NULL) AS last_meeting_date,
        -- Meeting history: last 6 meetings (date, attendance as ratio)
        (
          SELECT json_agg(json_build_object(
            'date', r.date_of_meeting,
            'attendance', 
              CASE 
                WHEN member_count > 0 THEN ROUND(r.attendance::numeric / member_count, 4)
                ELSE NULL
              END
          ) ORDER BY r.date_of_meeting DESC)
          FROM (
            SELECT 
              r.date_of_meeting, 
              r.attendance,
              (
                SELECT COUNT(*) 
                FROM cell_group_members cgm 
                WHERE cgm.cell_group_id = r.cell_group_id 
                  AND cgm.removed_at IS NULL
                  AND cgm.assigned_at <= r.date_of_meeting
              ) AS member_count
            FROM cell_leader_reports r
            WHERE r.cell_group_id = cg.id
              AND r.church_id = $1
            ORDER BY r.date_of_meeting DESC
            LIMIT 6
          ) r
        ) AS meeting_history
      FROM cell_groups cg
      LEFT JOIN zones z ON cg.zone_id = z.id
      LEFT JOIN members m ON cg.leader_id = m.id
      LEFT JOIN status_types st ON cg.status_id = st.id
      LEFT JOIN cell_group_members cgm ON cg.id = cgm.cell_group_id
      WHERE cg.church_id = $1
      GROUP BY cg.id, cg.name, cg.zone_id, cg.leader_id, cg.status_id, z.name, m.first_name, m.surname, st.name
    )
    SELECT *,
      -- Calculate growth rate
      CASE 
        WHEN (members_count - new_members) > 0 THEN new_members::float / (members_count - new_members)
        ELSE 0
      END AS growth_rate,
      -- Calculate meeting consistency (meetings held / expected)
      meetings_held / 6.0 AS meeting_consistency,
      -- Calculate recency (1 if met in last 2 weeks, else 0)
      CASE 
        WHEN last_meeting_date >= NOW() - INTERVAL '14 days' THEN 1
        ELSE 0
      END AS recent_meeting,
      -- Composite health score (weighted)
      ROUND(
        CAST(
          (
            (attendance_rate * 100) * 0.4 +
            (meetings_held / 6.0) * 100 * 0.2 +
            (COALESCE((
              CASE 
                WHEN (members_count - new_members) > 0 THEN new_members::float / (members_count - new_members)
                ELSE 0
              END
            ),0) * 100) * 0.15 +
            (COALESCE(avg_visitors,0) / 5.0) * 100 * 0.15 +
            (CASE WHEN last_meeting_date >= NOW() - INTERVAL '14 days' THEN 100 ELSE 0 END) * 0.1
          ) AS numeric
        ), 2
      ) AS health_score
    FROM base
    ORDER BY health_score DESC, name
    `,
    [church_id]
  );
  return res.rows;
};

export const getMyCellGroup = async (member_id, church_id) => {
  const res = await db.query(
    `SELECT cg.*, 
            z.name AS zone,
            st.name AS status,
            (SELECT COUNT(*) FROM cell_group_members cgm WHERE cgm.cell_group_id = cg.id AND cgm.removed_at IS NULL) AS members_count,
            m.id AS leader_id,
            m.first_name AS leader_first_name,
            m.surname AS leader_surname,
            m.contact_primary AS leader_phone,
            m.email AS leader_email
       FROM cell_groups cg
       LEFT JOIN zones z ON cg.zone_id = z.id
       LEFT JOIN members m ON cg.leader_id = m.id
       LEFT JOIN status_types st ON cg.status_id = st.id
       INNER JOIN cell_group_members cgm ON cgm.cell_group_id = cg.id
      WHERE cgm.member_id = $1 AND cg.church_id = $2 AND cgm.removed_at IS NULL
      LIMIT 1`,
    [member_id, church_id]
  );
  if (!res.rows[0]) return null;
  const row = res.rows[0];
  return {
    ...row,
    leader: row.leader_id
      ? {
          id: row.leader_id,
          first_name: row.leader_first_name,
          surname: row.leader_surname,
          phone: row.leader_phone,
          email: row.leader_email,
        }
      : null,
  };
};
