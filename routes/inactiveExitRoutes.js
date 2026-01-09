// routes/inactiveExitRoutes.js
import express from 'express';
import * as ctrl from '../controllers/inactiveExitCtrl.js'; // your existing controller file assumed
import {authenticateToken  as authenticate} from '../middleware/authMiddleware.js';
import { requirePermission as checkPermission } from '../middleware/rbacMiddleware.js';

const router = express.Router();

router.get('/', authenticate, checkPermission('view_inactive_exits'), ctrl.listExits);
router.get('/:id', authenticate, checkPermission('view_inactive_exits'), ctrl.getExit);
router.post('/', authenticate, checkPermission('create_inactive_exits'), ctrl.createExit);
router.put('/:id', authenticate, checkPermission('edit_inactive_exits'), ctrl.updateExit);
router.delete('/:id', authenticate, checkPermission('delete_inactive_exits'), ctrl.deleteExit);
router.post('/:id/reinstate', authenticate, checkPermission('edit_inactive_exits'), ctrl.reinstate);

// Bulk operations
router.post('/bulk/delete', authenticate, checkPermission('delete_inactive_exits'), ctrl.bulkDelete);
router.post('/bulk/reinstate', authenticate, checkPermission('edit_inactive_exits'), ctrl.bulkReinstate);

// Statistics
router.get('/stats/overview', authenticate, checkPermission('view_inactive_exits'), ctrl.getStatistics);

// Data integrity
router.get('/consistency/check', authenticate, checkPermission('edit_inactive_exits'), ctrl.findInconsistent);
router.post('/consistency/fix', authenticate, checkPermission('edit_inactive_exits'), ctrl.fixInconsistent);

// Member history
router.get('/member/:memberId/history', authenticate, checkPermission('view_inactive_exits'), ctrl.getMemberHistory);

export default router;
