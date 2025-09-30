import express from 'express';
import * as roleCtrl from '../controllers/roleController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { requirePermission } from '../middleware/rbacMiddleware.js';

const router = express.Router();

router.get(
  '/',
  authenticateToken,
  requirePermission('view_roles'),
  roleCtrl.listRoles
);

router.post(
  '/',
  authenticateToken,
  requirePermission('create_role'),
  roleCtrl.createRoleCtrl
);

router.put(
  '/:id',
  authenticateToken,
  requirePermission('update_role'),
  roleCtrl.updateRoleCtrl
);

router.delete(
  '/:id',
  authenticateToken,
  requirePermission('delete_role'),
  roleCtrl.deleteRoleCtrl
);

router.post(
  '/:id/permissions',
  authenticateToken,
  requirePermission('update_role'),
  roleCtrl.assignPermissionCtrl
);

router.delete(
  '/:id/permissions',
  authenticateToken,
  requirePermission('update_role'),
  roleCtrl.removePermissionCtrl
);

router.get(
  '/:id/permissions',
  authenticateToken,
  requirePermission('view_roles'),
  roleCtrl.getRolePermissionsCtrl
);

router.get(
  '/permissions-matrix',
  authenticateToken,
  requirePermission('view_roles'),
  roleCtrl.getPermissionsMatrix
);



export default router;