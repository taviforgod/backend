import { Router } from 'express';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { requirePermission } from '../middleware/rbacMiddleware.js';
import {
  createReportTemplateHandler,
  getReportTemplatesHandler,
  generateReportHandler,
  getGeneratedReportsHandler,
  getReportByIdHandler,
  generateScheduledReportsHandler,
  exportReportHandler,
  getReportAnalyticsHandler
} from '../controllers/reportingController.js';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// Report Templates
router.post('/templates', requirePermission('update_member'), createReportTemplateHandler);
router.get('/templates', requirePermission('view_members'), getReportTemplatesHandler);

// Report Generation
router.post('/generate', requirePermission('update_member'), generateReportHandler);
router.post('/generate-scheduled', requirePermission('update_member'), generateScheduledReportsHandler);

// Generated Reports
router.get('/reports', requirePermission('view_members'), getGeneratedReportsHandler);
router.get('/reports/:id', requirePermission('view_members'), getReportByIdHandler);
router.get('/reports/:id/export', requirePermission('view_members'), exportReportHandler);

// Analytics & Dashboard
router.get('/analytics/dashboard', requirePermission('view_members'), getReportAnalyticsHandler);

export default router;