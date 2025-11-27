import express from 'express';
import { authenticateToken } from '../middleware/authMiddleware.js';
import * as ctrl from '../controllers/analyticsController.js';

const router = express.Router();

// cell health overview (last N weeks)
router.get('/cell-health', authenticateToken, ctrl.cellHealthDashboard);

// consolidated monthly meetings
router.get('/consolidated', authenticateToken, ctrl.consolidatedReport);

// absentee trends
router.get('/absentees', authenticateToken, ctrl.absenteeTrends);

// at-risk members
router.get('/at-risk', authenticateToken, ctrl.atRiskMembers);

export default router;