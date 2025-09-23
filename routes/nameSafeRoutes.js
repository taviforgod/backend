import express from 'express';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { requirePermission } from '../middleware/rbacMiddleware.js';
import {
  listCellGroupsNameSafe,
  listGroupMembersNameSafe,
  listWeeklyReportsNameSafe,
  createWeeklyReportByNames,
  getLastWeeklyReportNameSafe
} from '../controllers/weeklyReportNameController.js';
import {
  listVisitorsNameSafe,
  createVisitor,
  updateVisitor,
  deleteVisitor,
  convertVisitorByName,
  updateVisitorFollowUpStatus,
  exportVisitorCSV,
  exportVisitorExcel
} from '../controllers/visitorNameController.js';

const router = express.Router();

// Name-safe cell group & members
router.get('/cell-groups', authenticateToken, requirePermission('view_cell_groups'), listCellGroupsNameSafe);
router.get('/cell-groups/:groupName/members', authenticateToken, requirePermission('view_cell_group_members'), listGroupMembersNameSafe);
router.get('/cell-groups/:groupName/last-report', authenticateToken, requirePermission('view_cell_groups'), getLastWeeklyReportNameSafe);

// Weekly reports (name-based IO)
router.get('/weekly-reports', authenticateToken, requirePermission('view_cell_groups'), listWeeklyReportsNameSafe);
router.post('/weekly-reports', authenticateToken, requirePermission('update_cell_group'), createWeeklyReportByNames);

// Visitors (name-safe IO)
router.get('/visitors', authenticateToken, requirePermission('view_members'), listVisitorsNameSafe);
router.post('/visitors', authenticateToken, requirePermission('create_member'), createVisitor);
router.put('/visitors', authenticateToken, requirePermission('update_member'), updateVisitor);          // match by first_name+surname in body
router.delete('/visitors', authenticateToken, requirePermission('delete_member'), deleteVisitor);       // match by first_name+surname in body
router.post('/visitors/convert', authenticateToken, requirePermission('create_member'), convertVisitorByName);
router.post('/visitors/follow-up', authenticateToken, requirePermission('update_member'), updateVisitorFollowUpStatus);
router.post('/visitors/export/csv', authenticateToken, exportVisitorCSV);
router.post('/visitors/export/excel', authenticateToken, exportVisitorExcel);



export default router;