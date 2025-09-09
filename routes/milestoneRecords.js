import express from 'express';
import * as ctrl from '../controllers/milestoneRecordController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { requirePermission } from '../middleware/rbacMiddleware.js';

const router = express.Router();

router.get(
  '/',
  authenticateToken,
  requirePermission('view_milestone_records'),
  ctrl.getAllRecords
);

router.get(
  '/:member_id',
  authenticateToken,
  requirePermission('view_milestone_records'),
  ctrl.getByMember
);

router.post(
  '/',
  authenticateToken,
  requirePermission('create_milestone_record'),
  ctrl.createRecordCtrl
);

router.delete(
  '/:id',
  authenticateToken,
  requirePermission('delete_milestone_record'),
  ctrl.deleteRecordCtrl
);



export default router;
