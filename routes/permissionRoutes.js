import express from 'express';
import * as permCtrl from '../controllers/permissionController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { requirePermission } from '../middleware/rbacMiddleware.js';

const router = express.Router();

router.get(
  '/',
  authenticateToken,
  requirePermission('view_permissions'),
  permCtrl.listPermissions
);

router.post(
  '/',
  authenticateToken,
  requirePermission('create_permission'),
  permCtrl.createPermissionCtrl
);

router.put(
  '/:id',
  authenticateToken,
  requirePermission('update_permission'),
  permCtrl.updatePermissionCtrl
);

router.delete(
  '/:id',
  authenticateToken,
  requirePermission('delete_permission'),
  permCtrl.deletePermissionCtrl
);



export default router;