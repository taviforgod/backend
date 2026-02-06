import { Router } from 'express';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { requirePermission } from '../middleware/rbacMiddleware.js';
import {
  createConflictHandler,
  getConflictsHandler,
  getConflictHandler,
  updateConflictHandler,
  createConflictActionHandler,
  getConflictActionsHandler,
  getConflictStatsHandler,
  getActiveConflictsHandler
} from '../controllers/conflictController.js';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// Conflict Management CRUD
router.post('/', requirePermission('create_member'), createConflictHandler);
router.get('/', requirePermission('view_members'), getConflictsHandler);
router.get('/:id', requirePermission('view_members'), getConflictHandler);
router.put('/:id', requirePermission('update_member'), updateConflictHandler);

// Conflict Actions
router.post('/actions', requirePermission('update_member'), createConflictActionHandler);
router.get('/:conflictId/actions', requirePermission('view_members'), getConflictActionsHandler);

// Analytics & Reporting
router.get('/stats/overview', requirePermission('view_members'), getConflictStatsHandler);
router.get('/active/list', requirePermission('view_members'), getActiveConflictsHandler);

export default router;