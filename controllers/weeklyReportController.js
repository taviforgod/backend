/**
 * Weekly Report controller - Express handlers (updated for JSONB model)
 *
 * Endpoints:
 *  - GET  /api/weekly-reports/preview?cell_group_id=&meeting_date=
 *  - POST /api/weekly-reports
 *  - GET  /api/weekly-reports
 *  - GET  /api/weekly-reports/:id
 *  - PUT  /api/weekly-reports/:id
 *  - DELETE /api/weekly-reports/:id
 *  - GET  /api/weekly-reports/:id/export/csv
 *  - GET  /api/weekly-reports/:id/export/xlsx
 *  - GET  /api/weekly-reports/trends?church_id=&nWeeks=
 *  - GET  /api/weekly-reports/export/bulk?church_id=&nWeeks=
 *  - GET  /api/weekly-reports/top-cell?church_id=&meeting_date=
 *  - GET  /api/weekly-reports/bottom-cell?church_id=&meeting_date=
 *  - GET  /api/weekly-reports/leaderboards?church_id=&start_date=&end_date=&limit=
 *
 */

import * as model from '../models/weeklyReportModel.js';
import db from '../config/db.js'; 

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
    // prefer transactional creator if available
    const creator =
      typeof model.createWeeklyReportWithAbsentees === 'function'
        ? model.createWeeklyReportWithAbsentees
        : typeof model.createWeeklyReport === 'function'
        ? model.createWeeklyReport
        : null;

    if (!creator) {
      return res.status(500).json({ error: 'Server misconfigured: createWeeklyReport not available' });
    }

    // attach created_by from req.user if available
    if (!payload.created_by && req.user?.id) payload.created_by = req.user.id;
    if (!payload.created_by && req.user?.id === undefined) payload.created_by = null;

    const created = await creator(payload);
    // some creators return row, some return { id }
    return res.status(201).json(created);
  } catch (err) {
    return handleError(res, 'createWeeklyReport', err);
  }
}

// --- List Weekly Reports ---
export async function listWeeklyReports(req, res) {
  try {
    const churchId = parseId(req.query.church_id) || req.user?.church_id || null;
    const limit = Number(req.query.limit || 50);
    const offset = Number(req.query.offset || 0);
    if (!churchId) return res.status(400).json({ message: 'church_id required' });

    const rows = await model.listWeeklyReports(churchId, { limit, offset });
    return res.json(rows);
  } catch (err) {
    return handleError(res, 'listWeeklyReports', err);
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
    return res.json({ message: 'Updated', report: updated });
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
    return res.json({ message: 'Deleted' });
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
    // model.exportWeeklyReportCSV returns a CSV string (or may return Buffer)
    const csvBuffer =
      typeof csvResult === 'string' ? Buffer.from(csvResult, 'utf8') : Buffer.isBuffer(csvResult) ? csvResult : null;
    if (!csvBuffer) {
      // fallback: try to stringify
      return res.status(500).json({ message: 'Failed to generate CSV' });
    }

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

    // if workbook (ExcelJS) was returned, convert to buffer
    let buffer;
    if (wbOrBuffer && typeof wbOrBuffer.xlsx === 'object' && typeof wbOrBuffer.xlsx.writeBuffer === 'function') {
      buffer = await wbOrBuffer.xlsx.writeBuffer();
    } else if (Buffer.isBuffer(wbOrBuffer)) {
      buffer = wbOrBuffer;
    } else {
      return res.status(500).json({ message: 'Failed to generate XLSX' });
    }

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
    if (wbOrBuffer && typeof wbOrBuffer.xlsx === 'object' && typeof wbOrBuffer.xlsx.writeBuffer === 'function') {
      buffer = await wbOrBuffer.xlsx.writeBuffer();
    } else if (Buffer.isBuffer(wbOrBuffer)) {
      buffer = wbOrBuffer;
    } else {
      return res.status(500).json({ message: 'Failed to generate XLSX' });
    }

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

/* ========================================================
   JSON array helpers endpoints (append/remove)
   - POST   /api/weekly-reports/:id/attendees       { member_id }
   - DELETE /api/weekly-reports/:id/attendees/:member_id
   - POST   /api/weekly-reports/:id/visitors        { visitor_id?, name?, followup_action? }
   - POST   /api/weekly-reports/:id/absentees       { member_id?, visitor_id?, reason, followup_action? }
======================================================== */
export async function addAttendeeEndpoint(req, res) {
  try {
    const reportId = parseId(req.params.id);
    const member_id = parseId(req.body.member_id || req.params.member_id);
    if (!reportId || !member_id) return res.status(400).json({ message: 'report id and member_id required' });

    const row = await model.addAttendee(reportId, member_id);
    return res.json({ message: 'attendee added', report: row });
  } catch (err) {
    return handleError(res, 'addAttendeeEndpoint', err);
  }
}

export async function removeAttendeeEndpoint(req, res) {
  try {
    const reportId = parseId(req.params.id);
    const member_id = parseId(req.params.member_id || req.body.member_id);
    if (!reportId || !member_id) return res.status(400).json({ message: 'report id and member_id required' });

    const row = await model.removeAttendee(reportId, member_id);
    return res.json({ message: 'attendee removed', report: row });
  } catch (err) {
    return handleError(res, 'removeAttendeeEndpoint', err);
  }
}

export async function addVisitorEndpoint(req, res) {
  try {
    const reportId = parseId(req.params.id);
    if (!reportId) return res.status(400).json({ message: 'report id required' });
    const visitorObj = req.body || {};
    const row = await model.addVisitor(reportId, visitorObj);
    return res.json({ message: 'visitor added', report: row });
  } catch (err) {
    return handleError(res, 'addVisitorEndpoint', err);
  }
}

export async function addAbsenteeEndpoint(req, res) {
  try {
    const reportId = parseId(req.params.id);
    if (!reportId) return res.status(400).json({ message: 'report id required' });
    const absenteeObj = req.body || {};
    // ensure reason is provided where possible
    if (!absenteeObj.reason) absenteeObj.reason = absenteeObj.expected ? 'expected' : 'unknown';

    const row = await model.addAbsentee(reportId, absenteeObj);
    return res.json({ message: 'absentee added', report: row });
  } catch (err) {
    return handleError(res, 'addAbsenteeEndpoint', err);
  }
}

/* ========================================================
   Analytics endpoints
   - GET /api/weekly-reports/top-cell?church_id=&meeting_date=
   - GET /api/weekly-reports/bottom-cell?church_id=&meeting_date=
   - GET /api/weekly-reports/leaderboards?church_id=&start_date=&end_date=&limit=
======================================================== */
export async function topCellForWeek(req, res) {
  try {
    const churchId = parseId(req.query.church_id) || req.user?.church_id;
    const meetingDate = req.query.meeting_date;
    if (!churchId || !meetingDate) return res.status(400).json({ message: 'church_id and meeting_date required' });

    const top = await model.getTopCellForWeek(churchId, meetingDate);
    return res.json(top || {});
  } catch (err) {
    return handleError(res, 'topCellForWeek', err);
  }
}

export async function bottomCellForWeek(req, res) {
  try {
    const churchId = parseId(req.query.church_id) || req.user?.church_id;
    const meetingDate = req.query.meeting_date;
    if (!churchId || !meetingDate) return res.status(400).json({ message: 'church_id and meeting_date required' });

    const bottom = await model.getBottomCellForWeek(churchId, meetingDate);
    return res.json(bottom || {});
  } catch (err) {
    return handleError(res, 'bottomCellForWeek', err);
  }
}

export async function leaderboardsEndpoint(req, res) {
  try {
    const churchId = parseId(req.query.church_id) || req.user?.church_id;
    const startDate = req.query.start_date;
    const endDate = req.query.end_date;
    const limit = Number(req.query.limit || 10);

    if (!churchId || !startDate || !endDate) {
      return res.status(400).json({ message: 'church_id, start_date and end_date are required' });
    }

    const boards = await model.getLeaderboards(churchId, startDate, endDate, limit);
    return res.json(boards);
  } catch (err) {
    return handleError(res, 'leaderboardsEndpoint', err);
  }
}