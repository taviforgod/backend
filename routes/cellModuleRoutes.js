import express from 'express';
import {
    listZones, createZoneCtrl, updateZoneCtrl, deleteZoneCtrl,
    listStatusTypes, createStatusTypeCtrl, updateStatusTypeCtrl, deleteStatusTypeCtrl,
    listCellGroups, getCellGroupCtrl, createCellGroupCtrl, updateCellGroupCtrl, deleteCellGroupCtrl,
    listCellGroupMembers, addCellGroupMemberCtrl, removeCellGroupMemberCtrl, listUnassignedMembers,
    listCellHealthHistory, addCellHealthHistoryCtrl,
    listWeeklyReports, createWeeklyReportCtrl, getLastWeeklyReportCtrl, updateWeeklyReportCtrl, deleteWeeklyReportCtrl,
    consolidatedReportCtrl, cellHealthDashboardCtrl,
    listUserNotifications, markNotificationReadCtrl,
    exportCellGroupsCSVCtrl, exportCellHealthPDFCtrl,
    absenteeTrendsCtrl, atRiskMembersCtrl, absenteeRetentionRateCtrl
} from '../controllers/cellModuleController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { requirePermission } from '../middleware/rbacMiddleware.js';

const router = express.Router();

// Zones
router.get('/zones', authenticateToken, requirePermission('view_cell_groups'), listZones);
router.post('/zones', authenticateToken, requirePermission('create_cell_group'), createZoneCtrl);
router.put('/zones/:id', authenticateToken, requirePermission('update_cell_group'), updateZoneCtrl);
router.delete('/zones/:id', authenticateToken, requirePermission('delete_cell_group'), deleteZoneCtrl);

// Status Types
router.get('/status-types', authenticateToken, requirePermission('view_cell_groups'), listStatusTypes);
router.post('/status-types', authenticateToken, requirePermission('create_cell_group'), createStatusTypeCtrl);
router.put('/status-types/:id', authenticateToken, requirePermission('update_cell_group'), updateStatusTypeCtrl);
router.delete('/status-types/:id', authenticateToken, requirePermission('delete_cell_group'), deleteStatusTypeCtrl);

// Members in cell groups
router.get('/:id/members', authenticateToken, requirePermission('view_cell_group_members'), listCellGroupMembers);

// Batch assign/remove members (frontend expects these endpoints)
router.post('/:id/assign-members', authenticateToken, requirePermission('assign_cell_group_member'), addCellGroupMemberCtrl);
router.delete('/:id/remove-member', authenticateToken, requirePermission('remove_cell_group_member'), removeCellGroupMemberCtrl);

router.get('/unassigned-members', authenticateToken, requirePermission('view_members'), listUnassignedMembers);

// Health History
router.get('/:cell_group_id/health-history', authenticateToken, requirePermission('view_cell_groups'), listCellHealthHistory);
router.post('/health-history', authenticateToken, requirePermission('update_cell_group'), addCellHealthHistoryCtrl);

// Weekly Reports & Dashboards (specific routes BEFORE :id)
router.get('/weekly-reports', authenticateToken, requirePermission('view_cell_groups'), listWeeklyReports);
router.get('/:id/last-report', authenticateToken, requirePermission('view_cell_groups'), getLastWeeklyReportCtrl);
router.post('/weekly-reports', authenticateToken, requirePermission('update_cell_group'), createWeeklyReportCtrl);
router.put('/weekly-reports/:id', authenticateToken, requirePermission('update_cell_group'), updateWeeklyReportCtrl);
router.delete('/weekly-reports/:id', authenticateToken, requirePermission('delete_cell_group'), deleteWeeklyReportCtrl);
router.get('/consolidated-report', authenticateToken, requirePermission('view_cell_groups'), consolidatedReportCtrl);
router.get('/health-dashboard', authenticateToken, requirePermission('view_cell_groups'), cellHealthDashboardCtrl);

// Notifications
router.get('/notifications', authenticateToken, listUserNotifications);
router.post('/notifications/:id/read', authenticateToken, markNotificationReadCtrl);

// Export endpoints
router.get('/export/cell-groups/csv', authenticateToken, requirePermission('export_cell_groups'), exportCellGroupsCSVCtrl);
router.get('/export/cell-groups/:cell_group_id/health/pdf', authenticateToken, exportCellHealthPDFCtrl);

// Absentee Trends
router.get('/absentees/trends', authenticateToken, absenteeTrendsCtrl);
router.get('/absentees/at-risk', authenticateToken, atRiskMembersCtrl);
router.get('/absentees/retention-rate', authenticateToken, absenteeRetentionRateCtrl);

// Cell Groups (keep these last!)
router.get('/', authenticateToken, requirePermission('view_cell_groups'), listCellGroups);
router.get('/:id', authenticateToken, requirePermission('view_cell_groups'), getCellGroupCtrl);
router.post('/', authenticateToken, requirePermission('create_cell_group'), createCellGroupCtrl);
router.put('/:id', authenticateToken, requirePermission('update_cell_group'), updateCellGroupCtrl);
router.delete('/:id', authenticateToken, requirePermission('delete_cell_group'), deleteCellGroupCtrl);



export default router;