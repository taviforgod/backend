import express from 'express';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { requirePermission, requirePermissionOrSelf } from '../middleware/rbacMiddleware.js';
import * as userCtrl from '../controllers/userController.js';

const router = express.Router();

// per-user roles
router.get(
  '/:id/roles',
  authenticateToken,
  requirePermission('list_users'),
  userCtrl.getUserRolesHandler
);

router.post(
  '/:id/roles',
  authenticateToken,
  requirePermission('edit_user'),
  userCtrl.assignRoleHandler
);

router.delete(
  '/:id/roles/:roleId',
  authenticateToken,
  requirePermission('edit_user'),
  userCtrl.removeRoleHandler
);

// Profile route (needs to be before /:id routes)
router.get(
  '/profile',
  authenticateToken,
  userCtrl.getProfile
);

// Search and stats routes
router.get(
  '/search',
  authenticateToken,
  requirePermission('list_users'),
  userCtrl.searchUsers
);

router.get(
  '/stats',
  authenticateToken,
  requirePermission('list_users'),
  userCtrl.getUserStats
);

// Bulk operations
router.post(
  '/bulk/delete',
  authenticateToken,
  requirePermission('delete_user'),
  userCtrl.bulkDeleteUsers
);

router.post(
  '/bulk/activate',
  authenticateToken,
  requirePermission('activate_user'),
  userCtrl.bulkActivateUsers
);

router.post(
  '/bulk/deactivate',
  authenticateToken,
  requirePermission('deactivate_user'),
  userCtrl.bulkDeactivateUsers
);

// Base user routes
router.get(
  '/',
  authenticateToken,
  requirePermission('list_users'),
  userCtrl.getUsers
);

router.post(
  '/',
  authenticateToken,
  requirePermission('create_user'),
  userCtrl.createUser
);

router.put(
  '/:id',
  authenticateToken,
  requirePermission('edit_user'),
  userCtrl.updateUser
);

router.delete(
  '/:id',
  authenticateToken,
  requirePermissionOrSelf('delete_user'),
  userCtrl.deleteUser
);

// User actions
router.post(
  '/:id/activate',
  authenticateToken,
  requirePermission('activate_user'),
  userCtrl.activateUser
);

router.post(
  '/:id/deactivate',
  authenticateToken,
  requirePermission('deactivate_user'),
  userCtrl.deactivateUser
);

router.post(
  '/:id/lock',
  authenticateToken,
  requirePermission('lock_user'),
  userCtrl.lockUser
);

router.post(
  '/:id/unlock',
  authenticateToken,
  requirePermission('unlock_user'),
  userCtrl.unlockUser
);

router.post(
  '/:id/change-password',
  authenticateToken,
  requirePermissionOrSelf('change_user_password'),
  userCtrl.changePassword
);

router.post(
  '/:id/password', 
  requirePermissionOrSelf('change_user_password'),
  userCtrl.changePassword
);

export default router;