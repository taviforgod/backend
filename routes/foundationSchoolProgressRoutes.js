import { Router } from 'express';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { requirePermission } from '../middleware/rbacMiddleware.js';
import {
  createProgressEntryHandler,
  getProgressByEnrollmentHandler,
  updateProgressEntryHandler,
  getModuleProgressHandler,
  initializeProgressHandler,
  getProgressSummaryHandler,
  getFoundationModulesHandler,
  createFoundationModuleHandler,
  createCertificateHandler,
  getCertificatesByEnrollmentHandler
} from '../controllers/foundationSchoolProgressController.js';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// Progress tracking
router.post('/progress', requirePermission('update_member'), createProgressEntryHandler);
router.get('/enrollments/:enrollmentId/progress', requirePermission('view_members'), getProgressByEnrollmentHandler);
router.put('/progress/:id', requirePermission('update_member'), updateProgressEntryHandler);
router.get('/enrollments/:enrollmentId/modules/:moduleNumber/progress', requirePermission('view_members'), getModuleProgressHandler);

// Initialize progress for new enrollment
router.post('/enrollments/:enrollmentId/initialize-progress', requirePermission('update_member'), initializeProgressHandler);
router.get('/enrollments/:enrollmentId/progress-summary', requirePermission('view_members'), getProgressSummaryHandler);

// Foundation school modules
router.get('/modules', requirePermission('view_members'), getFoundationModulesHandler);
router.post('/modules', requirePermission('create_member'), createFoundationModuleHandler);

// Certificates
router.post('/certificates', requirePermission('create_member'), createCertificateHandler);
router.get('/enrollments/:enrollmentId/certificates', requirePermission('view_members'), getCertificatesByEnrollmentHandler);

export default router;