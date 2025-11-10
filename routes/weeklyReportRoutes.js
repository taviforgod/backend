import express from 'express';
import * as ctrl from '../controllers/weeklyReportController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// --- Preview Absentees ---
router.post('/preview', authenticateToken, ctrl.previewAbsentees);

// --- Analytics / Leaderboards (non-id routes) ---
router.get('/top-cell', authenticateToken, ctrl.topCellForWeek);
router.get('/bottom-cell', authenticateToken, ctrl.bottomCellForWeek);
router.get('/leaderboards', authenticateToken, ctrl.leaderboardsEndpoint);

// --- CRUD Operations + collection-level exports ---
router.post('/', authenticateToken, ctrl.createWeeklyReport);
router.get('/', authenticateToken, ctrl.listWeeklyReports);
router.get('/trends', authenticateToken, ctrl.getWeeklyTrendsEndpoint);
router.get('/export/bulk', authenticateToken, ctrl.bulkExportEndpoint);

// --- JSON array helpers for a specific report (place BEFORE the generic :id routes) ---
// Add / remove attendees
router.post('/:id/attendees', authenticateToken, ctrl.addAttendeeEndpoint);
router.delete('/:id/attendees/:member_id', authenticateToken, ctrl.removeAttendeeEndpoint);

// Add visitors and absentees
router.post('/:id/visitors', authenticateToken, ctrl.addVisitorEndpoint);
router.post('/:id/absentees', authenticateToken, ctrl.addAbsenteeEndpoint);

// --- Export endpoints for a specific report (keep before generic :id GET/PUT/DELETE) ---
router.get('/:id/export/csv', authenticateToken, ctrl.exportWeeklyReportCSV);
router.get('/:id/export/xlsx', authenticateToken, ctrl.exportWeeklyReportXLSX);

// --- Single-report CRUD ---
router.get('/:id', authenticateToken, ctrl.getWeeklyReportDetails);
router.put('/:id', authenticateToken, ctrl.updateWeeklyReport);
router.delete('/:id', authenticateToken, ctrl.deleteWeeklyReport);

export default router;