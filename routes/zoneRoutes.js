import express from 'express';
import * as zoneController from '../controllers/zoneController.js';
import { requirePermission } from '../middleware/requirePermission.js';

const router = express.Router();

// Get all zones (Zonal Pastors see only their zones, Admins see all)
router.get('/', requirePermission('view_zone_dashboard'), zoneController.getAllZones);

// Get zonal dashboard data (consolidated metrics)
router.get('/:zoneId/dashboard', requirePermission('view_zone_dashboard'), zoneController.getZonalDashboard);

// Get zones for current pastor
router.get('/my-zones', zoneController.getMyZones);

// Get zone by ID with churches (permission-checked)
router.get('/:id', requirePermission('view_zone_dashboard'), zoneController.getZoneById);

// Create zone (Admin only)
router.post('/', requirePermission('manage_zone'), zoneController.createZone);

// Update zone (Admin only)
router.put('/:id', requirePermission('manage_zone'), zoneController.updateZone);

// Delete zone (Admin only)
router.delete('/:id', requirePermission('manage_zone'), zoneController.deleteZone);

// Get zone leaders
router.get('/:id/leaders', requirePermission('view_zone_dashboard'), zoneController.getZoneLeaders);

// Assign leader to zone
router.post('/:id/leaders', requirePermission('manage_zone'), zoneController.assignZoneLeader);

// Remove leader from zone
router.delete('/:id/leaders/:memberId', requirePermission('manage_zone'), zoneController.removeZoneLeader);

// Assign church to zone
router.post('/:zoneId/churches/:churchId/assign', requirePermission('manage_zone'), zoneController.assignChurchToZone);

// Unassign church from zone
router.post('/:zoneId/churches/:churchId/unassign', requirePermission('manage_zone'), zoneController.unassignChurchFromZone);

export default router;
