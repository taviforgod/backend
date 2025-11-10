// server/routes/visitorRoutes.js
import express from 'express';
import * as ctrl from '../controllers/visitorController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { requirePermission } from '../middleware/rbacMiddleware.js';

const router = express.Router();

router.get('/', authenticateToken, requirePermission('view_visitors'), ctrl.listVisitors);
router.get('/:id', authenticateToken, requirePermission('view_visitors'), ctrl.getVisitor);
router.post('/', authenticateToken, requirePermission('create_visitor'), ctrl.createVisitor);
router.put('/:id', authenticateToken, requirePermission('update_visitor'), ctrl.updateVisitor);
router.delete('/:id', authenticateToken, requirePermission('delete_visitor'), ctrl.deleteVisitor);

router.post('/:id/convert', authenticateToken, requirePermission('convert_visitor'), ctrl.convertVisitor);
router.post('/:id/follow-ups', authenticateToken, requirePermission('add_followup'), ctrl.createFollowUp);
router.get('/:id/follow-ups', authenticateToken, requirePermission('view_followups'), ctrl.listFollowUpsForVisitor);

export default router;
