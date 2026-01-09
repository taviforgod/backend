import { Router } from 'express';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { requirePermission } from '../middleware/rbacMiddleware.js';
import {
  createTestimonyHandler,
  getTestimoniesHandler,
  getTestimonyHandler,
  updateTestimonyHandler,
  approveTestimonyHandler,
  publishTestimonyHandler,
  getTestimonyStatsHandler,
  getTestimoniesByTypeHandler,
  getPublishedTestimoniesHandler,
  getTestimoniesNeedingFollowupHandler
} from '../controllers/testimonyController.js';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// Testimony CRUD
router.post('/', requirePermission('create_member'), createTestimonyHandler);
router.get('/', requirePermission('view_members'), getTestimoniesHandler);
router.get('/:id', requirePermission('view_members'), getTestimonyHandler);
router.put('/:id', requirePermission('update_member'), updateTestimonyHandler);

// Approval and Publishing
router.post('/:id/approve', requirePermission('update_member'), approveTestimonyHandler);
router.post('/:id/publish', requirePermission('update_member'), publishTestimonyHandler);

// Analytics & Reporting
router.get('/stats/overview', requirePermission('view_members'), getTestimonyStatsHandler);
router.get('/stats/by-type', requirePermission('view_members'), getTestimoniesByTypeHandler);
router.get('/published/list', requirePermission('view_members'), getPublishedTestimoniesHandler);
router.get('/followup/needed', requirePermission('view_members'), getTestimoniesNeedingFollowupHandler);

export default router;