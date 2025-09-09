import express from 'express';
import * as ctrl from '../controllers/foundationController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { requirePermission } from '../middleware/rbacMiddleware.js';

const router = express.Router();

router.get('/:member_id', authenticateToken, requirePermission('view_foundation'), ctrl.getByMember);
router.post('/', authenticateToken, requirePermission('create_foundation'), ctrl.createEnrollment);
router.put('/:id', authenticateToken, requirePermission('update_foundation'), ctrl.updateEnrollment);
router.delete('/:id', authenticateToken, requirePermission('delete_foundation'), ctrl.deleteEnrollment);



export default router;