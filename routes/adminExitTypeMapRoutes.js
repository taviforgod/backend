import express from 'express';
import * as ctrl from '../controllers/adminExitTypeMapCtrl.js';
import { authenticateToken as authenticate } from '../middleware/authMiddleware.js';
import { requirePermission as checkPermission } from '../middleware/rbacMiddleware.js';

const router = express.Router();

router.get('/', authenticate, checkPermission('manage_exit_mappings'), ctrl.list);
router.get('/:exit_type', authenticate, checkPermission('manage_exit_mappings'), ctrl.get);
router.post('/', authenticate, checkPermission('manage_exit_mappings'), ctrl.upsert);
router.put('/:exit_type', authenticate, checkPermission('manage_exit_mappings'), ctrl.upsert);
router.delete('/:exit_type', authenticate, checkPermission('manage_exit_mappings'), ctrl.remove);

export default router;
