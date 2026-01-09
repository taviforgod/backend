import express from 'express';
import * as ctrl from '../controllers/reportController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { requirePermission } from '../middleware/rbacMiddleware.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Report Templates Management
router.get('/templates', requirePermission('view_members'), ctrl.getReportTemplates);
router.post('/templates', requirePermission('update_member'), ctrl.createReportTemplate);

// Report Generation
router.post('/generate', requirePermission('update_member'), ctrl.generateReport);
router.post('/generate-quick', requirePermission('view_members'), ctrl.generateQuickReport);
router.post('/generate-scheduled', requirePermission('update_member'), ctrl.generateScheduledReports);

// Generated Reports
router.get('/reports', requirePermission('view_members'), ctrl.getGeneratedReports);
router.get('/reports/:id', requirePermission('view_members'), ctrl.getReportById);
router.get('/reports/:id/export', requirePermission('view_members'), ctrl.exportReport);

// Analytics Dashboard
router.get('/analytics/dashboard', requirePermission('view_members'), ctrl.getReportAnalytics);

export default router;