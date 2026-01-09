// routes/exitInterviewRoutes.js
import express from 'express';
import * as ctrl from '../controllers/exitInterviewCtrl.js';
import { authenticateToken as authenticate } from '../middleware/authMiddleware.js';
import { requirePermission as checkPermission } from '../middleware/rbacMiddleware.js';

const router = express.Router();

// create interview only
router.post('/', authenticate, checkPermission('create_exit_interviews'), ctrl.createInterview);
router.get('/:id', authenticate, checkPermission('view_exit_interviews'), ctrl.getInterview);
router.put('/:id', authenticate, checkPermission('edit_exit_interviews'), ctrl.updateInterview);
router.delete('/:id', authenticate, checkPermission('delete_exit_interviews'), ctrl.deleteInterview);
router.get('/', authenticate, checkPermission('view_exit_interviews'), ctrl.listInterviews);

// Templates
router.get('/templates/list', authenticate, checkPermission('view_exit_interviews'), ctrl.getTemplates);

// Optional: create interview AND mark member inactive in one call.
// Caller should include { mark_member_inactive: true, member_id: <id>, ... } in body.
// Requires both permissions.
router.post(
  '/with-exit',
  authenticate,
  checkPermission('create_exit_interviews'),
  checkPermission('create_inactive_exits'),
  ctrl.createInterview
);

export default router;
