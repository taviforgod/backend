/**
 * Weekly Report controller - Express handlers (updated for JSONB model)
 */

import * as model from '../models/weeklyReportModel.js';
import * as notificationModel from '../models/notificationModel.js';
import db from '../config/db.js'; 
import { getIO } from '../config/socket.js';

function parseId(val) {
  const n = Number(val);
  return Number.isNaN(n) ? null : n;
}

// Centralized error handler
function handleError(res, context, err) {
  console.error(context, err);
  return res.status(500).json({ message: err.message || `${context} failed` });
}

// --- Preview Absentees ---
export async function previewAbsentees(req, res) {
  try {
    const { cell_group_id, meeting_date, attendee_ids = [] } = req.body;
    const absentees = await model.computeAbsenteesUsingRoster(cell_group_id, meeting_date, null, attendee_ids);
    res.json(absentees);
  } catch (err) {
    console.error('previewAbsentees failed', err);
    res.status(500).json({ error: err.message });
  }
}

// --- Create Weekly Report ---
export async function createWeeklyReport(req, res) {
  try {
    const payload = req.body || {};
    const creator =
      typeof model.createWeeklyReportWithAbsentees === 'function'
        ? model.createWeeklyReportWithAbsentees
        : typeof model.createWeeklyReport === 'function'
        ? model.createWeeklyReport
        : null;

    if (!creator) {
      return res.status(500).json({ error: 'Server misconfigured: createWeeklyReport not available' });
    }

    if (!payload.created_by && req.user?.id) payload.created_by = req.user.id;
    if (!payload.created_by && req.user?.id === undefined) payload.created_by = null;

    const created = await creator(payload);
    res.status(201).json(created);

    // Notification (non-blocking)
    (async () => {
      try {
        const church_id = created?.church_id || req.user?.church_id || null;
        const user_id = req.user?.userId ?? req.user?.id ?? null;
        const title = 'Weekly Report Created';
        const message = `Weekly report for ${created?.meeting_date || ''} created.`;
        const metadata = { action: 'weekly_report_created', report_id: created?.id ?? null };
        const link = `/weekly-reports/${created?.id ?? ''}`;
        const notification = await notificationModel.createNotification({
          church_id,
          member_id: null,
          user_id,
          title,
          message,
          channel: 'inapp',
          metadata,
          link
        });
        const io = getIO();
        if (io && church_id) io.to(`church:${church_id}`).emit('notification', notification);
        if (notification.user_id) io.to(`user:${notification.user_id}`).emit('notification', notification);
      } catch (nErr) {
        console.warn('Failed to create notification for createWeeklyReport', nErr?.message || nErr);
      }
    })();
  } catch (err) {
    return handleError(res, 'createWeeklyReport', err);
  }
}

// --- List Weekly Reports (Church-wide) ---
export async function listWeeklyReports(req, res) {
  try {
    const churchId = parseId(req.query.church_id) || req.user?.church_id || null;
    const limit = Number(req.query.limit || 50);
    const offset = Number(req.query.offset || 0);
    if (!churchId) return res.status(400).json({ message: 'church_id required' });

    const result = await model.listWeeklyReports(churchId, { limit, offset });
    return res.json(result.rows);
  } catch (err) {
    return handleError(res, 'listWeeklyReports', err);
  }
}

/* =========================================================
   ✅ NEW ENDPOINT: Get Weekly Reports by Cell Group
   Used by MemberDashboard to show “Next Meeting”
   Route: GET /api/weekly-reports?cell_group_id=123&limit=10
========================================================= */
export async function listWeeklyReportsByCell(req, res) {
  try {
    const cell_group_id = parseId(req.query.cell_group_id);
    if (!cell_group_id) return res.status(400).json({ message: 'cell_group_id required' });

    const limit = Number(req.query.limit || 10);

    // Select all columns from weekly_reports plus cell group and leader info
    const rows = await db.query(
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
        WHERE wr.cell_group_id = $1
          AND (wr.is_deleted IS NULL OR wr.is_deleted = FALSE)
        ORDER BY wr.meeting_date DESC
        LIMIT $2`,
      [cell_group_id, limit]
    );

    return res.json(rows.rows);
  } catch (err) {
    return handleError(res, 'listWeeklyReportsByCell', err);
  }
}

// --- Get Weekly Report Details ---
export async function getWeeklyReportDetails(req, res) {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: 'id required' });

    const row = await model.getWeeklyReportDetails(id);
    if (!row) return res.status(404).json({ message: 'Report not found' });
    return res.json(row);
  } catch (err) {
    return handleError(res, 'getWeeklyReportDetails', err);
  }
}

// --- Update Weekly Report ---
export async function updateWeeklyReport(req, res) {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: 'id required' });

    const payload = { ...req.body, updated_by: req.user?.id || req.body.updated_by || null };
    const updated = await model.updateWeeklyReport(id, payload);
    res.json({ message: 'Updated', report: updated });

    // Notification (non-blocking)
    (async () => {
      try {
        const church_id = updated?.church_id || req.user?.church_id || null;
        const user_id = req.user?.userId ?? req.user?.id ?? null;
        const title = 'Weekly Report Updated';
        const message = `Weekly report for ${updated?.meeting_date || ''} updated.`;
        const metadata = { action: 'weekly_report_updated', report_id: id };
        const link = `/weekly-reports/${id}`;
        const notification = await notificationModel.createNotification({
          church_id,
          member_id: null,
          user_id,
          title,
          message,
          channel: 'inapp',
          metadata,
          link
        });
        const io = getIO();
        if (io && church_id) io.to(`church:${church_id}`).emit('notification', notification);
        if (notification.user_id) io.to(`user:${notification.user_id}`).emit('notification', notification);
      } catch (nErr) {
        console.warn('Failed to create notification for updateWeeklyReport', nErr?.message || nErr);
      }
    })();
  } catch (err) {
    return handleError(res, 'updateWeeklyReport', err);
  }
}

// --- Soft Delete Weekly Report ---
export async function deleteWeeklyReport(req, res) {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: 'id required' });

    await model.softDeleteWeeklyReport(id, req.user?.id || null);
    res.json({ message: 'Deleted' });

    // Notification (non-blocking)
    (async () => {
      try {
        const church_id = req.user?.church_id || null;
        const user_id = req.user?.userId ?? req.user?.id ?? null;
        const title = 'Weekly Report Deleted';
        const message = `Weekly report ${id} was deleted.`;
        const metadata = { action: 'weekly_report_deleted', report_id: id };
        const link = `/weekly-reports`;
        const notification = await notificationModel.createNotification({
          church_id,
          member_id: null,
          user_id,
          title,
          message,
          channel: 'inapp',
          metadata,
          link
        });
        const io = getIO();
        if (io && church_id) io.to(`church:${church_id}`).emit('notification', notification);
      } catch (nErr) {
        console.warn('Failed to create notification for deleteWeeklyReport', nErr?.message || nErr);
      }
    })();
  } catch (err) {
    return handleError(res, 'deleteWeeklyReport', err);
  }
}

// --- Export CSV ---
export async function exportWeeklyReportCSV(req, res) {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: 'id required' });

    const csvResult = await model.exportWeeklyReportCSV(id);
    const csvBuffer =
      typeof csvResult === 'string' ? Buffer.from(csvResult, 'utf8') : Buffer.isBuffer(csvResult) ? csvResult : null;
    if (!csvBuffer) return res.status(500).json({ message: 'Failed to generate CSV' });

    res.setHeader('Content-Disposition', `attachment; filename="weekly_report_${id}.csv"`);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    return res.send(csvBuffer);
  } catch (err) {
    return handleError(res, 'exportWeeklyReportCSV', err);
  }
}

// --- Export XLSX ---
export async function exportWeeklyReportXLSX(req, res) {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: 'id required' });

    const wbOrBuffer = await model.exportWeeklyReportXLSX(id);
    let buffer;
    if (wbOrBuffer?.xlsx?.writeBuffer) buffer = await wbOrBuffer.xlsx.writeBuffer();
    else if (Buffer.isBuffer(wbOrBuffer)) buffer = wbOrBuffer;
    else return res.status(500).json({ message: 'Failed to generate XLSX' });

    res.setHeader('Content-Disposition', `attachment; filename="weekly_report_${id}.xlsx"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    return res.send(Buffer.from(buffer));
  } catch (err) {
    return handleError(res, 'exportWeeklyReportXLSX', err);
  }
}

// --- Weekly Trends ---
export async function getWeeklyTrendsEndpoint(req, res) {
  try {
    const churchId = parseId(req.query.church_id) || req.user?.church_id;
    const nWeeks = Number(req.query.nWeeks || 12);
    if (!churchId) return res.status(400).json({ message: 'church_id required' });

    const data = await model.getWeeklyTrends(churchId, nWeeks);
    return res.json(data);
  } catch (err) {
    return handleError(res, 'getWeeklyTrendsEndpoint', err);
  }
}

// --- Bulk Export XLSX ---
export async function bulkExportEndpoint(req, res) {
  try {
    const churchId = parseId(req.query.church_id) || req.user?.church_id;
    if (!churchId) return res.status(400).json({ message: 'church_id required' });

    const nWeeks = Number(req.query.nWeeks || 12);
    const wbOrBuffer = await model.bulkExportWeeksXLSX(churchId, nWeeks);
    let buffer;
    if (wbOrBuffer?.xlsx?.writeBuffer) buffer = await wbOrBuffer.xlsx.writeBuffer();
    else if (Buffer.isBuffer(wbOrBuffer)) buffer = wbOrBuffer;
    else return res.status(500).json({ message: 'Failed to generate XLSX' });

    res.setHeader(
      'Content-Disposition',
      `attachment; filename="weekly_reports_bulk_${new Date().toISOString().slice(0, 10)}.xlsx"`
    );
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    return res.send(Buffer.from(buffer));
  } catch (err) {
    return handleError(res, 'bulkExportEndpoint', err);
  }
}

/**
 * GET /api/weekly-reports/my/attendance/history
 * Get current member's attendance history (last 12 meetings)
 */
export const getMyAttendanceHistory = async (req, res) => {
  try {
    const { user } = req;
    if (!user) return res.status(401).json({ error: 'Not authenticated' });

    // Get member record for current user
    const memberRes = await db.query(
      `SELECT id FROM members WHERE user_id = $1 AND church_id = $2`,
      [user.id, user.church_id]
    );
    if (!memberRes.rows.length) return res.status(404).json({ error: 'Member not found' });
    const memberId = memberRes.rows[0].id;

    // Get cell_members.id entries for this member (these are what's stored in attendees)
    const cellMembersRes = await db.query(
      `SELECT id, cell_group_id FROM cell_members WHERE member_id = $1`,
      [memberId]
    );
    if (!cellMembersRes.rows.length) return res.status(404).json({ error: 'Not assigned to a cell' });
    
    const cellMemberIds = cellMembersRes.rows.map(r => r.id);
    const cellGroupIds = cellMembersRes.rows.map(r => r.cell_group_id);

    // Check attendance: attendees contains cell_members.id objects
    const historyRes = await db.query(
      `SELECT 
        wr.id,
        wr.meeting_date,
        wr.cell_group_id,
        cg.name AS cell_name,
        EXISTS(
          SELECT 1 FROM jsonb_array_elements(coalesce(wr.attendees, '[]'::jsonb)) AS elem
          WHERE (elem->>'member_id')::bigint = ANY($1)
        ) AS present,
        COALESCE(jsonb_array_length(coalesce(wr.attendees, '[]'::jsonb)), 0) AS total_attendees
      FROM weekly_reports wr
      LEFT JOIN cell_groups cg ON wr.cell_group_id = cg.id
      WHERE wr.cell_group_id = ANY($2)
        AND (wr.is_deleted IS NULL OR wr.is_deleted = FALSE)
      ORDER BY wr.meeting_date DESC
      LIMIT 12`,
      [cellMemberIds, cellGroupIds]
    );

    res.json(historyRes.rows);
  } catch (err) {
    console.error('Error fetching attendance history:', err);
    res.status(500).json({ error: 'Failed to fetch attendance history' });
  }
};

// --- Get My Weekly Reports (used by MemberDashboard summary) ---
export const getMyWeeklyReports = async (req, res) => {
  try {
    const userId = req.user?.userId ?? req.user?.id;
    const church_id = req.user?.church_id;
    if (!userId || !church_id) return res.status(401).json({ error: 'Not authenticated' });

    // Get memberId for this user
    const memberRes = await db.query(
      'SELECT id FROM members WHERE user_id = $1 AND church_id = $2 LIMIT 1',
      [userId, church_id]
    );
    if (!memberRes.rows.length) return res.status(404).json({ error: 'No member record for this user' });
    const memberId = memberRes.rows[0].id;

    // Get cell_members.id entries for this member (these are stored in attendees)
    const cellMembersRes = await db.query(
      `SELECT id, cell_group_id FROM cell_members WHERE member_id = $1`,
      [memberId]
    );
    if (!cellMembersRes.rows.length) return res.json({ reports: [], attendanceHistory: [], nextMeetingDate: null });
    
    const cellMemberIds = cellMembersRes.rows.map(r => r.id);
    const cellGroupIds = cellMembersRes.rows.map(r => r.cell_group_id);

    // Get last 10 weekly reports for these cell groups with attendance check
    const reportsRes = await db.query(
      `SELECT wr.*,
              cg.name AS cell_name,
              m.first_name AS leader_first_name,
              m.surname AS leader_surname,
              m.id AS leader_id,
              EXISTS(
                SELECT 1 FROM jsonb_array_elements(coalesce(wr.attendees, '[]'::jsonb)) AS elem
                WHERE (elem->>'member_id')::bigint = ANY($1::bigint[])
              ) AS user_attended
         FROM weekly_reports wr
         LEFT JOIN cell_groups cg ON wr.cell_group_id = cg.id
         LEFT JOIN members m ON cg.leader_id = m.id
         WHERE wr.cell_group_id = ANY($2::bigint[])
         ORDER BY wr.meeting_date DESC
         LIMIT 10`,
      [cellMemberIds, cellGroupIds]
    );

    // Build attendance history and next meeting date
    const attendanceHistory = [];
    let nextMeetingDate = null;
    for (const rep of reportsRes.rows) {
      attendanceHistory.push(rep.user_attended ? 1 : 0);
      if (!nextMeetingDate && rep.next_meeting_date) nextMeetingDate = rep.next_meeting_date;
    }

    res.json({
      reports: reportsRes.rows,
      attendanceHistory,
      nextMeetingDate
    });
  } catch (err) {
    console.error('getMyWeeklyReports error', err);
    res.status(500).json({ error: err.message || 'Failed to fetch my weekly reports' });
  }
};

/**
 * Add an absentee to a weekly report
 */
export async function addAbsenteeEndpoint(req, res) {
  try {
    const reportId = parseId(req.params.id);
    if (!reportId) return res.status(400).json({ message: 'id required' });

    const { member_id } = req.body;
    if (!member_id) return res.status(400).json({ message: 'member_id required' });

    const updated = await model.addAbsentee(reportId, member_id);
    res.json({ message: 'Absentee added', report: updated });
  } catch (err) {
    return handleError(res, 'addAbsenteeEndpoint', err);
  }
}

/**
 * Add a visitor to a weekly report
 */
export async function addVisitorEndpoint(req, res) {
  try {
    const reportId = parseId(req.params.id);
    if (!reportId) return res.status(400).json({ message: 'id required' });

    const { visitor_name, visitor_contact } = req.body;
    if (!visitor_name) return res.status(400).json({ message: 'visitor_name required' });

    const updated = await model.addVisitor(reportId, { visitor_name, visitor_contact });
    res.json({ message: 'Visitor added', report: updated });
  } catch (err) {
    return handleError(res, 'addVisitorEndpoint', err);
  }
}

/**
 * Add an attendee to a weekly report
 */
export async function addAttendeeEndpoint(req, res) {
  try {
    const reportId = parseId(req.params.id);
    if (!reportId) return res.status(400).json({ message: 'id required' });

    const { member_id, attendee_meta = {} } = req.body;
    if (!member_id) return res.status(400).json({ message: 'member_id required' });

    // Prefer model.addAttendee if available, otherwise try generic update
    if (typeof model.addAttendee === 'function') {
      const updated = await model.addAttendee(reportId, member_id, attendee_meta);
      return res.json({ message: 'Attendee added', report: updated });
    }

    // Fallback: read, modify attendees JSONB and save
    const report = await model.getWeeklyReportDetails(reportId);
    if (!report) return res.status(404).json({ message: 'Report not found' });

    const attendees = Array.isArray(report.attendees) ? report.attendees.slice() : [];
    attendees.push({ member_id, ...attendee_meta });
    const updated = await model.updateWeeklyReport(reportId, { attendees, updated_by: req.user?.id || null });
    return res.json({ message: 'Attendee added (fallback)', report: updated });
  } catch (err) {
    return handleError(res, 'addAttendeeEndpoint', err);
  }
}

/**
 * Get the bottom performing cell group for a given week
 */
export async function bottomCellForWeek(req, res) {
  try {
    const churchId = parseId(req.query.church_id) || req.user?.church_id;
    const meetingDate = req.query.meeting_date;
    
    if (!churchId) return res.status(400).json({ message: 'church_id required' });
    if (!meetingDate) return res.status(400).json({ message: 'meeting_date required' });

    const result = await model.bottomCellForWeek(churchId, meetingDate);
    res.json(result);
  } catch (err) {
    return handleError(res, 'bottomCellForWeek', err);
  }
}

/**
 * Get leaderboards (top performing cell groups)
 */
export async function leaderboardsEndpoint(req, res) {
  try {
    const churchId = parseId(req.query.church_id) || req.user?.church_id;
    const nWeeks = Number(req.query.nWeeks || 12);
    
    if (!churchId) return res.status(400).json({ message: 'church_id required' });

    const result = await model.leaderboards(churchId, nWeeks);
    res.json(result);
  } catch (err) {
    return handleError(res, 'leaderboardsEndpoint', err);
  }
}

/**
 * Remove an attendee from a weekly report
 */
export async function removeAttendeeEndpoint(req, res) {
  try {
    const reportId = parseId(req.params.id);
    if (!reportId) return res.status(400).json({ message: 'id required' });

    // Expect either attendee_id (cell_members.id stored in attendees) or member_id
    const { attendee_id, member_id } = req.body;
    if (!attendee_id && !member_id) {
      return res.status(400).json({ message: 'attendee_id or member_id required' });
    }

    // Prefer explicit attendee_id if provided
    const removed = typeof model.removeAttendee === 'function'
      ? await model.removeAttendee(reportId, attendee_id ?? member_id)
      : null;

    if (removed === null) {
      return res.status(500).json({ message: 'Server misconfigured: removeAttendee not available' });
    }

    res.json({ message: 'Attendee removed', result: removed });
  } catch (err) {
    return handleError(res, 'removeAttendeeEndpoint', err);
  }
}

/**
 * Get the top performing cell group for a given week
 */
export async function topCellForWeek(req, res) {
  try {
    const churchId = parseId(req.query.church_id) || req.user?.church_id;
    const meetingDate = req.query.meeting_date;

    if (!churchId) return res.status(400).json({ message: 'church_id required' });
    if (!meetingDate) return res.status(400).json({ message: 'meeting_date required' });

    const result = typeof model.topCellForWeek === 'function'
      ? await model.topCellForWeek(churchId, meetingDate)
      : null;

    if (result === null) return res.status(500).json({ message: 'Server misconfigured: topCellForWeek not available' });

    res.json(result);
  } catch (err) {
    return handleError(res, 'topCellForWeek', err);
  }
}

// --- Get Meeting Schedule and Attendance ---
export async function getMeetingScheduleAndAttendance(req, res) {
  try {
    const cell_group_id = parseId(req.query.cell_group_id);
    if (!cell_group_id) return res.status(400).json({ message: 'cell_group_id required' });

    const schedule = await model.getMeetingScheduleAndAttendance(cell_group_id);
    return res.json(schedule);
  } catch (err) {
    return handleError(res, 'getMeetingScheduleAndAttendance', err);
  }
}
