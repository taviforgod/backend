import express from 'express';
import * as classCtrl from '../controllers/foundationClassController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { requirePermission } from '../middleware/rbacMiddleware.js';

const router = express.Router();

router.get('/', authenticateToken, requirePermission('view_foundation'), classCtrl.getAvailableClasses);
router.post('/', authenticateToken, requirePermission('create_foundation'), classCtrl.addFoundationClass);
router.put('/:id', authenticateToken, requirePermission('update_foundation'), classCtrl.updateFoundationClass);
router.delete('/:id', authenticateToken, requirePermission('delete_foundation'), classCtrl.deleteFoundationClass);

export default router;