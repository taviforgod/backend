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

export default router;
