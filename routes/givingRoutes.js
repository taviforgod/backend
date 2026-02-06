import { Router } from 'express';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { requirePermission } from '../middleware/rbacMiddleware.js';
import {
  createGivingRecordHandler,
  getGivingRecordsHandler,
  updateGivingRecordHandler,
  getMemberGivingSummaryHandler,
  getGivingAnalyticsHandler,
  getGivingByTypeHandler,
  getGivingTrendsHandler
} from '../controllers/givingController.js';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// Giving Log CRUD
router.post('/', requirePermission('create_member'), createGivingRecordHandler);
router.get('/', requirePermission('view_members'), getGivingRecordsHandler);
router.put('/:id', requirePermission('update_member'), updateGivingRecordHandler);

// Member-specific giving
router.get('/member/:memberId/summary', requirePermission('view_members'), getMemberGivingSummaryHandler);

// Analytics & Reporting
router.get('/analytics/overview', requirePermission('view_members'), getGivingAnalyticsHandler);
router.get('/analytics/by-type', requirePermission('view_members'), getGivingByTypeHandler);
router.get('/analytics/trends', requirePermission('view_members'), getGivingTrendsHandler);

export default router;