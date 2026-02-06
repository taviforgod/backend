// routes/cellGroupRoutes.js
import express from 'express';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { requirePermission } from '../middleware/rbacMiddleware.js';
import * as ctrl from '../controllers/cellGroupController.js';
import { getLastAttendance } from '../controllers/cellGroupController.js';
import { getCellOverviewCtrl } from '../controllers/cellGroupController.js';

const router = express.Router();

// Add this BEFORE any `/:id` route to avoid route param conflicts
router.get('/my', authenticateToken, ctrl.getMyCellGroups);

// NEW: multiplication readiness endpoint
router.get(
  '/multiplication/readiness',
  authenticateToken,
  requirePermission('view_cell_groups'),
  ctrl.getMultiplicationReadinessCtrl
);

router.get('/', authenticateToken, requirePermission('view_cell_groups'), ctrl.listCellGroups);
router.get('/form-lookups', authenticateToken, requirePermission('view_cell_groups'), ctrl.getCellGroupFormLookups);
router.get('/unassigned-members', authenticateToken, requirePermission('view_members'), ctrl.listUnassignedMembersCtrl);

// Cell Overview Endpoint
router.get('/overview', authenticateToken, requirePermission('view_cell_groups'), getCellOverviewCtrl);

router.get('/:id', authenticateToken, requirePermission('view_cell_groups'), ctrl.getCellGroupCtrl);
router.post('/', authenticateToken, requirePermission('create_cell_group'), ctrl.createCellGroupCtrl);
router.put('/:id', authenticateToken, requirePermission('edit_cell_group'), ctrl.updateCellGroupCtrl);

// members
router.get('/:id/members', authenticateToken, requirePermission('view_cell_groups'), ctrl.listCellMembersCtrl);
router.get('/:id/leaders', authenticateToken, requirePermission('view_cell_groups'), ctrl.listCellLeadersCtrl);

router.post('/members', authenticateToken, requirePermission('manage_cell_members'), ctrl.addCellMemberCtrl);
router.post('/members/bulk', authenticateToken, requirePermission('manage_cell_members'), ctrl.bulkAddCellMembersCtrl);
router.delete('/members', authenticateToken, requirePermission('manage_cell_members'), ctrl.removeCellMemberCtrl);
router.put('/members/role', authenticateToken, requirePermission('manage_cell_members'), ctrl.changeCellMemberRoleCtrl);
router.get('/:id/attendance/last', getLastAttendance);

export default router;
