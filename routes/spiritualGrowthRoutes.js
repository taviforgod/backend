import express from 'express';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { requirePermission } from '../middleware/rbacMiddleware.js';
import * as ctrl from '../controllers/spiritualGrowthController.js';

const router = express.Router();

router.use(authenticateToken);

// Primary summary endpoint (recommended)
/* GET /api/spiritual-growth/summary */
router.get('/summary', requirePermission('view_spiritual_growth'), ctrl.getSpiritualSummaryCtrl);

// Compatibility route: frontend may call underscore version -> support it too
/* GET /api/spiritual-growth/spiritual_growth/summary */
router.get('/spiritual_growth/summary', requirePermission('view_spiritual_growth'), ctrl.getSpiritualSummaryCtrl);

// Lightweight totals endpoint used by some UI pieces
/* GET /api/spiritual-growth/totals */
router.get('/totals', requirePermission('view_spiritual_growth'), ctrl.getSummary);

export default router;