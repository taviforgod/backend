import db from "../config/db.js";
import ExcelJS from "exceljs";
import { Parser } from "json2csv";

/* ========================================================
   Helper: safe transaction wrapper
======================================================== */
async function withTransaction(callback) {
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const result = await callback(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Transaction failed:", err.message);
    throw err;
  } finally {
    client.release();
  }
}

/* ========================================================
   Absentee computation: compare members vs attendees (returns objects)
======================================================== */
export async function computeAbsenteesUsingRoster(cell_group_id, meeting_date, endDate = null, attendeeIdsInput = []) {
  try {
    if (!cell_group_id || !meeting_date) return [];

    // Use attendeeIds from input if provided, otherwise fetch from DB
    let attendeeMemberIds = new Set();
    if (Array.isArray(attendeeIdsInput) && attendeeIdsInput.length) {
      attendeeMemberIds = new Set(attendeeIdsInput.map(Number));
    } else {
      // Extract member_id from weekly_reports.attendees JSONB
      const attendRes = await db.query(
        `SELECT DISTINCT (elem->>'member_id')::bigint AS member_id
         FROM weekly_reports wr,
              jsonb_array_elements(coalesce(wr.attendees, '[]'::jsonb)) AS elem
         WHERE wr.cell_group_id = $1 AND wr.meeting_date = $2`,
        [cell_group_id, meeting_date]
      );
      (attendRes.rows || []).forEach(r => {
        if (r.member_id) attendeeMemberIds.add(r.member_id);
      });
    }

    const membersRes = await db.query(
      `SELECT m.id, m.first_name, m.surname
       FROM cell_members cm
       JOIN members m ON m.id = cm.member_id
       LEFT JOIN member_statuses ms ON m.member_status_id = ms.id
       WHERE cm.cell_group_id = $1
         AND cm.is_active = TRUE
         AND (ms.name IS NULL OR ms.name = 'active')
       ORDER BY m.first_name, m.surname`,
      [cell_group_id]
    );

    const onLeaveIds = new Set();
    if (endDate) {
      try {
        const leavesRes = await db.query(
          `SELECT member_id FROM member_leaves
           WHERE $1::date BETWEEN start_date::date AND end_date::date
              OR $2::date BETWEEN start_date::date AND end_date::date
              OR (start_date::date BETWEEN $1::date AND $2::date)`,
          [meeting_date, endDate]
        );
        (leavesRes.rows || []).forEach(r => onLeaveIds.add(r.member_id));
      } catch (e) {}
    }

    const absentees = (membersRes.rows || [])
      .filter(m => !attendeeMemberIds.has(m.id) && !onLeaveIds.has(m.id))
      .map(m => ({
        type: "member",
        member_id: m.id,
        first_name: m.first_name || "",
        surname: m.surname || "",
        reason: "expected",
        expected: true,
      }));

    return absentees;
  } catch (err) {
    console.error("computeAbsenteesUsingRoster failed", err);
    return [];
  }
}

/* ========================================================
   Helper: normalize incoming arrays to JSON shapes expected by DB
   - attendees: array of member_id OR objects { member_id, joined_at? }
   - visitors: array of visitor_id OR objects { visitor_id, name?, followup_action? }
   - absentees: array of objects { member_id?, visitor_id?, reason?, followup_action? }
======================================================== */
function normalizeAttendeesArray(arr = []) {
  return arr.map(a => {
    if (typeof a === "number") {
      return { member_id: a, joined_at: new Date().toISOString() };
    } else if (a && a.member_id) {
      return { member_id: a.member_id, joined_at: a.joined_at || new Date().toISOString() };
    } else {
      return null;
    }
  }).filter(Boolean);
}

function normalizeVisitorsArray(arr = []) {
  return arr.map(v => {
    if (typeof v === "number") {
      return { visitor_id: v, created_at: new Date().toISOString(), followup_action: null };
    } else if (v && (v.visitor_id || v.name)) {
      return {
        visitor_id: v.visitor_id || null,
        name: v.name || null,
        created_at: v.created_at || new Date().toISOString(),
        followup_action: v.followup_action || null
      };
    } else {
      return null;
    }
  }).filter(Boolean);
}

function normalizeAbsenteesArray(arr = []) {
  return arr.map(a => {
    const base = {};
    if (a.member_id) base.member_id = a.member_id;
    if (a.visitor_id) base.visitor_id = a.visitor_id;
    base.reason = a.reason || "unknown";
    base.followup_action = a.followup_action || null;
    base.created_at = a.created_at || new Date().toISOString();
    return base;
  }).filter(Boolean);
}

/* ========================================================
   Create Weekly Report (stores attendees/absentees/visitors as JSONB arrays)
======================================================== */
export async function createWeeklyReport(reportData) {
  return withTransaction(async client => {
    const {
      church_id,
      cell_group_id,
      meeting_date,
      next_meeting_date,
      topic,
      current_cell_membership,
      bible_study_teachers,
      outreaches_done,
      people_reached,
      souls_saved_outreach,
      total_cell_attendance,
      first_timers,
      souls_saved_meeting,
      converts_church_attendance,
      converts_baptised,
      converts_started_foundation,
      visits_done,
      souls_uploaded_tracker,
      total_church_attendance,
      new_bible_classes_started,
      testimonies,
      prayer_requests,
      follow_ups,
      challenges,
      support_needed,
      submitted_by,
      attendees = [],
      visitors = [],
      absentees = [],         // optional: can provide explicit absentees with reasons
      created_by
    } = reportData;

    const attendeesJson = normalizeAttendeesArray(attendees);
    const visitorsJson = normalizeVisitorsArray(visitors);
    const absenteesJson = normalizeAbsenteesArray(absentees);

    const sql = `
      INSERT INTO weekly_reports (
        church_id, cell_group_id, meeting_date, next_meeting_date, topic,
        current_cell_membership, bible_study_teachers, outreaches_done, people_reached,
        souls_saved_outreach, total_cell_attendance, first_timers, souls_saved_meeting,
        converts_church_attendance, converts_baptised, converts_started_foundation,
        visits_done, souls_uploaded_tracker, total_church_attendance,
        new_bible_classes_started, testimonies, prayer_requests, follow_ups,
        challenges, support_needed, submitted_by, created_by,
        attendees, visitors, absentees
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,
        $20,$21,$22,$23,$24,$25,$26,$27,
        $28::jsonb, $29::jsonb, $30::jsonb
      ) RETURNING *;
    `;
    const params = [
      church_id, cell_group_id, meeting_date, next_meeting_date, topic,
      current_cell_membership, bible_study_teachers, outreaches_done, people_reached,
      souls_saved_outreach, total_cell_attendance, first_timers, souls_saved_meeting,
      converts_church_attendance, converts_baptised, converts_started_foundation,
      visits_done, souls_uploaded_tracker, total_church_attendance,
      new_bible_classes_started, testimonies, prayer_requests, follow_ups,
      challenges, support_needed, submitted_by, created_by,
      JSON.stringify(attendeesJson), JSON.stringify(visitorsJson), JSON.stringify(absenteesJson)
    ];

    const { rows } = await client.query(sql, params);
    return rows[0];
  });
}

/* ========================================================
   Get / List / Update / Delete using new JSONB model
======================================================== */
export async function listWeeklyReports(churchId, { limit = 50, offset = 0 } = {}) {
  return db.query(
    `SELECT
      wr.*,
      cg.name AS cell_name,
      cg.zone_id,
      cg.status_id,
      cg.leader_id,
      m.first_name AS leader_first_name,
      m.surname AS leader_surname,
      m.contact_primary AS leader_contact,
      m.email AS leader_email
    FROM weekly_reports wr
    LEFT JOIN cell_groups cg ON wr.cell_group_id = cg.id
    LEFT JOIN members m ON cg.leader_id = m.id
    WHERE cg.church_id = $1
    ORDER BY wr.meeting_date DESC
    LIMIT $2 OFFSET $3`,
    [churchId, limit, offset]
  );
}

export async function getWeeklyReportDetails(reportId) {
  const base = await db.query(
    `SELECT wr.*, cg.name AS cell_group_name
     FROM weekly_reports wr
     JOIN cell_groups cg ON cg.id = wr.cell_group_id
     WHERE wr.id = $1`, [reportId]
  );

  if (!base.rows.length) return null;
  const report = base.rows[0];

  // report.attendees / visitors / absentees are JSONB arrays already
  // Provide them parsed (they will already be JS objects after pg driver)
  return {
    report,
    attendees: report.attendees || [],
    visitors: report.visitors || [],
    absentees: report.absentees || []
  };
}

export async function updateWeeklyReport(reportId, updates) {
  // handle JSON fields specially (stringify)
  const allowed = { ...updates };

  if (allowed.attendees) allowed.attendees = JSON.stringify(normalizeAttendeesArray(allowed.attendees));
  if (allowed.visitors) allowed.visitors = JSON.stringify(normalizeVisitorsArray(allowed.visitors));
  if (allowed.absentees) allowed.absentees = JSON.stringify(normalizeAbsenteesArray(allowed.absentees));

  const keys = Object.keys(allowed);
  if (!keys.length) return null;
  const setSQL = keys.map((k, i) => `${k} = $${i + 1}`).join(", ");
  const vals = Object.values(allowed);
  vals.push(reportId);

  const { rows } = await db.query(
    `UPDATE weekly_reports
     SET ${setSQL}, updated_at = CURRENT_TIMESTAMP
     WHERE id = $${vals.length}
     RETURNING *`,
    vals
  );
  return rows[0];
}

export async function softDeleteWeeklyReport(reportId, userId) {
  await db.query(
    `UPDATE weekly_reports
     SET is_deleted = TRUE, deleted_at = CURRENT_TIMESTAMP, deleted_by = $2
     WHERE id = $1`,
    [reportId, userId]
  );
}

/* ========================================================
   Helpers to append/remove items in the JSON arrays
   - addAttendee(reportId, member_id)
   - removeAttendee(reportId, member_id)
   - addVisitor(reportId, visitorObj)
   - addAbsentee(reportId, absenteeObj)
   Note: triggers keep counts in sync
======================================================== */
export async function addAttendee(reportId, member_id) {
  if (!reportId || !member_id) return null;
  
  // Get the actual joined_at from cell_members for this member
  const cmRes = await db.query(
    `SELECT joined_at FROM cell_members WHERE member_id = $1 ORDER BY joined_at DESC LIMIT 1`,
    [member_id]
  );
  const joinedAt = cmRes.rows[0]?.joined_at || new Date().toISOString();
  
  const obj = { member_id, joined_at: joinedAt };
  const { rows } = await db.query(
    `UPDATE weekly_reports
     SET attendees = attendees || $2::jsonb, updated_at = CURRENT_TIMESTAMP
     WHERE id = $1
     RETURNING *`,
    [reportId, JSON.stringify(obj)]
  );
  return rows[0];
}

export async function removeAttendee(reportId, member_id) {
  // remove all array elements with matching member_id
  const { rows } = await db.query(
    `UPDATE weekly_reports
     SET attendees = COALESCE(
       (
         SELECT jsonb_agg(elem) FROM (
           SELECT elem
           FROM jsonb_array_elements(attendees) WITH ORDINALITY arr(elem, idx)
           WHERE NOT (elem->>'member_id' = $2::text)
           ORDER BY idx
         ) t
       ), '[]'::jsonb),
       updated_at = CURRENT_TIMESTAMP
     WHERE id = $1
     RETURNING *`,
    [reportId, String(member_id)]
  );
  return rows[0];
}

export async function addVisitor(reportId, visitorObj) {
  if (!reportId || !visitorObj) return null;
  const v = normalizeVisitorsArray([visitorObj])[0];
  const { rows } = await db.query(
    `UPDATE weekly_reports
     SET visitors = visitors || $2::jsonb, updated_at = CURRENT_TIMESTAMP
     WHERE id = $1
     RETURNING *`,
    [reportId, JSON.stringify(v)]
  );
  return rows[0];
}

export async function addAbsentee(reportId, absenteeObj) {
  if (!reportId || !absenteeObj) return null;
  
  // If member_id provided, fetch joined_at from cell_members
  let createdAt = absenteeObj.created_at || new Date().toISOString();
  if (absenteeObj.member_id) {
    const cmRes = await db.query(
      `SELECT joined_at FROM cell_members WHERE member_id = $1 ORDER BY joined_at DESC LIMIT 1`,
      [absenteeObj.member_id]
    );
    createdAt = cmRes.rows[0]?.joined_at || createdAt;
  }
  
  const a = {
    member_id: absenteeObj.member_id || null,
    visitor_id: absenteeObj.visitor_id || null,
    reason: absenteeObj.reason || "unknown",
    followup_action: absenteeObj.followup_action || null,
    created_at: createdAt
  };
  
  const { rows } = await db.query(
    `UPDATE weekly_reports
     SET absentees = absentees || $2::jsonb, updated_at = CURRENT_TIMESTAMP
     WHERE id = $1
     RETURNING *`,
    [reportId, JSON.stringify(a)]
  );
  return rows[0];
}

/* ========================================================
   Trends & Analytics
   - top / bottom performing cell for a given meeting_date
   - overall leaderboards in a date range
======================================================== */
export async function getTopCellForWeek(churchId, meetingDate) {
  const { rows } = await db.query(
    `SELECT wr.cell_group_id, cg.name AS cell_group_name, wr.total_cell_attendance
     FROM weekly_reports wr
     JOIN cell_groups cg ON cg.id = wr.cell_group_id
     WHERE wr.church_id = $1 AND wr.meeting_date = $2 AND wr.is_deleted = FALSE
     ORDER BY wr.total_cell_attendance DESC NULLS LAST
     LIMIT 1`,
    [churchId, meetingDate]
  );
  return rows[0] || null;
}

export async function getBottomCellForWeek(churchId, meetingDate) {
  const { rows } = await db.query(
    `SELECT wr.cell_group_id, cg.name AS cell_group_name, wr.total_cell_attendance
     FROM weekly_reports wr
     JOIN cell_groups cg ON cg.id = wr.cell_group_id
     WHERE wr.church_id = $1 AND wr.meeting_date = $2 AND wr.is_deleted = FALSE
     ORDER BY wr.total_cell_attendance ASC NULLS LAST
     LIMIT 1`,
    [churchId, meetingDate]
  );
  return rows[0] || null;
}

/**
 * Leaderboards across a date range
 * Returns:
 *  - mostAttendance: cell_group_id, cell_group_name, total_attendance
 *  - mostVisitors: cell_group_id, cell_group_name, total_visitors
 *  - mostAbsentees: cell_group_id, cell_group_name, total_absentees
 *  - mostSouls: cell_group_id, cell_group_name, total_souls_saved
 */
export async function getLeaderboards(churchId, startDate, endDate, limit = 10) {
  const params = [churchId, startDate, endDate, limit];

  // most attendance
  const att = await db.query(
    `SELECT wr.cell_group_id, cg.name AS cell_group_name, SUM(wr.total_cell_attendance) AS total_attendance
     FROM weekly_reports wr
     JOIN cell_groups cg ON cg.id = wr.cell_group_id
     WHERE wr.church_id = $1 AND wr.meeting_date BETWEEN $2 AND $3 AND wr.is_deleted = FALSE
     GROUP BY wr.cell_group_id, cg.name
     ORDER BY total_attendance DESC
     LIMIT $4`,
    params
  );

  // most visitors (use visitors_count aggregated)
  const vis = await db.query(
    `SELECT wr.cell_group_id, cg.name AS cell_group_name, SUM(wr.visitors_count) AS total_visitors
     FROM weekly_reports wr
     JOIN cell_groups cg ON cg.id = wr.cell_group_id
     WHERE wr.church_id = $1 AND wr.meeting_date BETWEEN $2 AND $3 AND wr.is_deleted = FALSE
     GROUP BY wr.cell_group_id, cg.name
     ORDER BY total_visitors DESC
     LIMIT $4`,
    params
  );

  // most absentees (sum of jsonb_array_length(absentees) per row)
  const abs = await db.query(
    `SELECT wr.cell_group_id, cg.name AS cell_group_name,
            SUM(COALESCE(wr.absentees_count, jsonb_array_length(wr.absentees))) AS total_absentees
     FROM weekly_reports wr
     JOIN cell_groups cg ON cg.id = wr.cell_group_id
     WHERE wr.church_id = $1 AND wr.meeting_date BETWEEN $2 AND $3 AND wr.is_deleted = FALSE
     GROUP BY wr.cell_group_id, cg.name
     ORDER BY total_absentees DESC
     LIMIT $4`,
    params
  );

  // most souls (sum souls_saved_meeting)
  const souls = await db.query(
    `SELECT wr.cell_group_id, cg.name AS cell_group_name, SUM(wr.souls_saved_meeting) AS total_souls
     FROM weekly_reports wr
     JOIN cell_groups cg ON cg.id = wr.cell_group_id
     WHERE wr.church_id = $1 AND wr.meeting_date BETWEEN $2 AND $3 AND wr.is_deleted = FALSE
     GROUP BY wr.cell_group_id, cg.name
     ORDER BY total_souls DESC
     LIMIT $4`,
    params
  );

  return {
    mostAttendance: att.rows,
    mostVisitors: vis.rows,
    mostAbsentees: abs.rows,
    mostSouls: souls.rows
  };
}

/* ========================================================
   CSV / XLSX Export (adjusted for JSONB arrays)
======================================================== */
export async function exportWeeklyReportCSV(reportId) {
  const data = await getWeeklyReportDetails(reportId);
  // Flatten report + arrays into CSV rows. For brevity we output JSON-encoded arrays in the CSV.
  const csvObj = {
    ...data.report,
    attendees: JSON.stringify(data.attendees || []),
    visitors: JSON.stringify(data.visitors || []),
    absentees: JSON.stringify(data.absentees || [])
  };
  const parser = new Parser();
  return parser.parse(csvObj);
}

export async function exportWeeklyReportXLSX(reportId) {
  const { report, attendees, visitors, absentees } = await getWeeklyReportDetails(reportId);
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Weekly Report");

  ws.addRow(["Weekly Report ID", report.id]);
  ws.addRow(["Cell Group", report.cell_group_name]);
  ws.addRow(["Meeting Date", report.meeting_date]);
  ws.addRow([]);

  ws.addRow(["Attendees"]);
  ws.addRow(["Member ID", "Joined At"]);
  (attendees || []).forEach(a => ws.addRow([a.member_id, a.joined_at]));

  ws.addRow([]);
  ws.addRow(["Visitors"]);
  ws.addRow(["Visitor ID", "Name", "Follow-up", "Created At"]);
  (visitors || []).forEach(v => ws.addRow([v.visitor_id || "", v.name || "", v.followup_action || "", v.created_at || ""]));

  ws.addRow([]);
  ws.addRow(["Absentees"]);
  ws.addRow(["Member ID", "Visitor ID", "Reason", "Follow-up", "Created At"]);
  (absentees || []).forEach(a => ws.addRow([a.member_id || "", a.visitor_id || "", a.reason || "", a.followup_action || "", a.created_at || ""]));

  return wb;
}

/* ========================================================
   Bulk Multi-Sheet Export adjusted for JSONB model
======================================================== */
export async function bulkExportWeeksXLSX(churchId, limit = 12) {
  const { rows } = await db.query(
    `SELECT wr.*, cg.name AS cell_group_name
     FROM weekly_reports wr
     JOIN cell_groups cg ON cg.id = wr.cell_group_id
     WHERE wr.church_id = $1 AND wr.is_deleted = FALSE
     ORDER BY wr.meeting_date DESC
     LIMIT $2`,
    [churchId, limit]
  );
  if (!rows.length) throw new Error("No reports found");

  const wb = new ExcelJS.Workbook();
  wb.creator = "ChMS System";
  wb.created = new Date();

  // ---- Summary Sheet ----
  const summary = wb.addWorksheet("Summary");
  summary.addRow(["Meeting Date", "Total Attendance", "Visitors", "Absentees", "Souls Saved"]);
  const byDate = {};
  rows.forEach((r) => {
    const d = r.meeting_date.toISOString().split("T")[0];
    if (!byDate[d]) byDate[d] = { att: 0, vis: 0, abs: 0, souls: 0 };
    byDate[d].att += r.total_cell_attendance || 0;
    byDate[d].vis += r.visitors_count || 0;
    byDate[d].abs += r.absentees_count || 0;
    byDate[d].souls += r.souls_saved_meeting || 0;
  });
  Object.entries(byDate).forEach(([d, v]) => summary.addRow([d, v.att, v.vis, v.abs, v.souls]));

  // ---- All Reports ----
  const all = wb.addWorksheet("All Reports");
  const headers = Object.keys(rows[0]).filter(h => h !== "attendees" && h !== "visitors" && h !== "absentees");
  all.addRow(headers);
  rows.forEach(r => all.addRow(headers.map(h => r[h])));

  // ---- Per-week Sheets ----
  const grouped = {};
  rows.forEach(r => {
    const wk = r.meeting_date.toISOString().split("T")[0];
    if (!grouped[wk]) grouped[wk] = [];
    grouped[wk].push(r);
  });

  for (const [date, list] of Object.entries(grouped)) {
    const ws = wb.addWorksheet(date);
    ws.addRow(["Cell Group", "Topic", "Attendance", "Visitors", "Absentees", "Souls Saved", "Notes"]);
    list.forEach(r => ws.addRow([
      r.cell_group_name,
      r.topic,
      r.total_cell_attendance,
      r.visitors_count,
      r.absentees_count,
      r.souls_saved_meeting,
      r.testimonies || ""
    ]));
  }

  return wb;
}

/* ========================================================
   Get Meeting Schedule and Attendance
======================================================== */
export async function getMeetingScheduleAndAttendance(cell_group_id) {
  if (!cell_group_id) throw new Error('cell_group_id is required');

  try {
    const meetingsRes = await db.query(
      `SELECT wr.meeting_date, wr.total_cell_attendance, wr.attendees, wr.visitors, wr.absentees
       FROM weekly_reports wr
       WHERE wr.cell_group_id = $1 AND wr.is_deleted = FALSE
       ORDER BY wr.meeting_date DESC`,
      [cell_group_id]
    );

    return meetingsRes.rows.map(meeting => ({
      meeting_date: meeting.meeting_date,
      total_attendance: meeting.total_cell_attendance,
      attendees: meeting.attendees || [],
      visitors: meeting.visitors || [],
      absentees: meeting.absentees || []
    }));
  } catch (err) {
    console.error("getMeetingScheduleAndAttendance failed", err);
    throw err;
  }
}

/* ========================================================
   Compatibility exports (CommonJS)
======================================================== */
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    computeAbsenteesUsingRoster,
    createWeeklyReport,
    listWeeklyReports,
    getWeeklyReportDetails,
    updateWeeklyReport,
    softDeleteWeeklyReport,
    addAttendee,
    removeAttendee,
    addVisitor,
    addAbsentee,
    getTopCellForWeek,
    getBottomCellForWeek,
    getLeaderboards,
    exportWeeklyReportCSV,
    exportWeeklyReportXLSX,
    bulkExportWeeksXLSX,
    getMeetingScheduleAndAttendance
  };
}
