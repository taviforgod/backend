import express from 'express';
import { authenticateToken } from '../middleware/authMiddleware.js';
import {
  createAbsenteeFollowupHandler,
  getAbsenteeFollowupHandler,
  updateAbsenteeFollowupHandler,
  getAbsenteeFollowupsHandler,
  addContactAttemptHandler,
  generateFollowupsFromWeeklyReportHandler,
  getFollowupStatsHandler,
  getOverdueFollowupsHandler,
  assignFollowupHandler,
  resolveFollowupHandler
} from '../controllers/absenteeFollowupController.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// --- CRUD Operations ---
router.post('/', createAbsenteeFollowupHandler);
router.get('/', getAbsenteeFollowupsHandler);
router.get('/:id', getAbsenteeFollowupHandler);
router.put('/:id', updateAbsenteeFollowupHandler);

// --- Contact Attempts ---
router.post('/:id/contact-attempts', addContactAttemptHandler);

// --- Assignment & Resolution ---
router.put('/:id/assign', assignFollowupHandler);
router.put('/:id/resolve', resolveFollowupHandler);

// --- Weekly Report Integration ---
router.post('/generate-from-report', generateFollowupsFromWeeklyReportHandler);

// --- Analytics & Reporting ---
router.get('/stats/overview', getFollowupStatsHandler);
router.get('/overdue/list', getOverdueFollowupsHandler);

export default router;