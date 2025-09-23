import express from 'express';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { requirePermission } from '../middleware/rbacMiddleware.js';
import * as userCtrl from '../controllers/userController.js';
const router = express.Router();

router.get(
  '/profile',
  authenticateToken,
  requirePermission('view_profile'),
  userCtrl.getProfile
);

router.post(
  '/:id/roles',
  authenticateToken,
  requirePermission('assign_role'),
  userCtrl.assignRoleToUser
);

router.delete(
  '/:id/roles',
  authenticateToken,
  requirePermission('remove_role'),
  userCtrl.removeRoleFromUser
);

router.get(
  '/:id/roles',
  authenticateToken,
  requirePermission('view_user_roles'),
  userCtrl.getUserRoles
);

router.get(
  '/',
  authenticateToken,
  requirePermission('view_users'),
  userCtrl.listUsers
);



export default router;