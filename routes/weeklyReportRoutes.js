import express from 'express';
import {
  listWeeklyReportsByCell,
  listWeeklyReports,
  getMyWeeklyReports,
  previewAbsentees,
  topCellForWeek,
  bottomCellForWeek,
  leaderboardsEndpoint,
  createWeeklyReport,
  getWeeklyTrendsEndpoint,
  bulkExportEndpoint,
  addAttendeeEndpoint,
  removeAttendeeEndpoint,
  addVisitorEndpoint,
  addAbsenteeEndpoint,
  exportWeeklyReportCSV,
  exportWeeklyReportXLSX,
  getWeeklyReportDetails,
  updateWeeklyReport,
  deleteWeeklyReport,
  getMeetingScheduleAndAttendance // Import the new function
} from '../controllers/weeklyReportController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { getMyAttendanceHistory } from '../controllers/weeklyReportController.js';

const router = express.Router();

// --- Preview Absentees ---
router.post('/preview', authenticateToken, previewAbsentees);

// --- Analytics / Leaderboards ---
router.get('/top-cell', authenticateToken, topCellForWeek);
router.get('/bottom-cell', authenticateToken, bottomCellForWeek);
router.get('/leaderboards', authenticateToken, leaderboardsEndpoint);

// --- CRUD Operations + collection-level exports ---
router.post('/', authenticateToken, createWeeklyReport);
router.get('/my', authenticateToken, getMyWeeklyReports);
router.get('/', authenticateToken, (req, res, next) => {
  if (req.query.church_id) {
    return listWeeklyReports(req, res, next); // all reports for church
  }
  return listWeeklyReportsByCell(req, res, next); // reports for cell group
});

router.get('/trends', authenticateToken, getWeeklyTrendsEndpoint);
router.get('/export/bulk', authenticateToken, bulkExportEndpoint);

// --- JSON array helpers for a specific report ---
router.post('/:id/attendees', authenticateToken, addAttendeeEndpoint);
router.delete('/:id/attendees/:member_id', authenticateToken, removeAttendeeEndpoint);
router.post('/:id/visitors', authenticateToken, addVisitorEndpoint);
router.post('/:id/absentees', authenticateToken, addAbsenteeEndpoint);

// --- Export endpoints for a specific report ---
router.get('/:id/export/csv', authenticateToken, exportWeeklyReportCSV);
router.get('/:id/export/xlsx', authenticateToken, exportWeeklyReportXLSX);

// static routes MUST come before dynamic "/:id" routes
router.get('/meeting-schedule', authenticateToken, getMeetingScheduleAndAttendance);
router.get('/my/attendance/history', authenticateToken, getMyAttendanceHistory);

// --- Single-report CRUD ---
router.get('/:id', authenticateToken, getWeeklyReportDetails);
router.put('/:id', authenticateToken, updateWeeklyReport);
router.delete('/:id', authenticateToken, deleteWeeklyReport);

// Meeting schedule route must be placed before the dynamic /:id routes so it's not interpreted as an id
router.get('/meeting-schedule', authenticateToken, getMeetingScheduleAndAttendance);
router.get('/my/attendance/history', authenticateToken, getMyAttendanceHistory);

// --- New Route for Meeting Schedule and Attendance ---
router.get('/meeting-schedule', authenticateToken, getMeetingScheduleAndAttendance); // Add this line

export default router;