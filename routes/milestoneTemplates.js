import express from 'express';
import * as ctrl from '../controllers/milestoneTemplateController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { requirePermission } from '../middleware/rbacMiddleware.js';

const router = express.Router();

router.get(
  '/',
  authenticateToken,
  requirePermission('view_milestone_templates'),
  ctrl.listTemplates
);

router.get(
  '/:id',
  authenticateToken,
  requirePermission('view_milestone_templates'),
  ctrl.getTemplate
);

router.post(
  '/',
  authenticateToken,
  requirePermission('create_milestone_template'),
  ctrl.createTemplateCtrl
);

router.put(
  '/:id',
  authenticateToken,
  requirePermission('update_milestone_template'),
  ctrl.updateTemplateCtrl
);

router.delete(
  '/:id',
  authenticateToken,
  requirePermission('delete_milestone_template'),
  ctrl.deleteTemplateCtrl
);



export default router;
