import express from 'express';
import {
  getAllLookups,
  getAllTitles, createTitle, editTitle, removeTitle,
  getAllGenders, createGender, editGender, removeGender,
  getAllMaritalStatuses, createMaritalStatus, editMaritalStatus, removeMaritalStatus,
  getAllMemberTypes, createMemberType, editMemberType, removeMemberType,
  getAllMemberStatuses, createMemberStatus, editMemberStatus, removeMemberStatus,
  getAllNationalities, createNationality, editNationality, removeNationality,
  getAllChurches, createChurch, editChurch, removeChurch,
  getAllZones, createZone, editZone, removeZone,
  getAllStatusTypes, createStatusType, editStatusType, removeStatusType
} from '../controllers/lookupController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { requirePermission } from '../middleware/rbacMiddleware.js';

const router = express.Router();

router.get(
  '/',
  authenticateToken,
  requirePermission('view_lookups'),
  getAllLookups
);

// Titles
router.route('/titles')
  .get(authenticateToken, requirePermission('view_titles'), getAllTitles)
  .post(authenticateToken, requirePermission('create_title'), createTitle);
router.route('/titles/:id')
  .put(authenticateToken, requirePermission('update_title'), editTitle)
  .delete(authenticateToken, requirePermission('delete_title'), removeTitle);

// Genders
router.route('/genders')
  .get(authenticateToken, requirePermission('view_genders'), getAllGenders)
  .post(authenticateToken, requirePermission('create_gender'), createGender);
router.route('/genders/:id')
  .put(authenticateToken, requirePermission('update_gender'), editGender)
  .delete(authenticateToken, requirePermission('delete_gender'), removeGender);

// Marital Statuses
router.route('/marital-statuses')
  .get(authenticateToken, requirePermission('view_marital_statuses'), getAllMaritalStatuses)
  .post(authenticateToken, requirePermission('create_marital_status'), createMaritalStatus);
router.route('/marital-statuses/:id')
  .put(authenticateToken, requirePermission('update_marital_status'), editMaritalStatus)
  .delete(authenticateToken, requirePermission('delete_marital_status'), removeMaritalStatus);

// Member Types
router.route('/member-types')
  .get(authenticateToken, requirePermission('view_member_types'), getAllMemberTypes)
  .post(authenticateToken, requirePermission('create_member_type'), createMemberType);
router.route('/member-types/:id')
  .put(authenticateToken, requirePermission('update_member_type'), editMemberType)
  .delete(authenticateToken, requirePermission('delete_member_type'), removeMemberType);

// Member Statuses
router.route('/member-statuses')
  .get(authenticateToken, requirePermission('view_member_statuses'), getAllMemberStatuses)
  .post(authenticateToken, requirePermission('create_member_status'), createMemberStatus);
router.route('/member-statuses/:id')
  .put(authenticateToken, requirePermission('update_member_status'), editMemberStatus)
  .delete(authenticateToken, requirePermission('delete_member_status'), removeMemberStatus);

// Nationalities
router.route('/nationalities')
  .get(authenticateToken, requirePermission('view_nationalities'), getAllNationalities)
  .post(authenticateToken, requirePermission('create_nationality'), createNationality);
router.route('/nationalities/:id')
  .put(authenticateToken, requirePermission('update_nationality'), editNationality)
  .delete(authenticateToken, requirePermission('delete_nationality'), removeNationality);

// Churches
router.route('/churches')
  .get(getAllChurches) // <-- Public route, no auth or permission required
  .post(authenticateToken, requirePermission('create_church'), createChurch);
router.route('/churches/:id')
  .put(authenticateToken, requirePermission('update_church'), editChurch)
  .delete(authenticateToken, requirePermission('delete_church'), removeChurch);

// Zones
router.route('/zones')
  .get(authenticateToken, requirePermission('view_zones'), getAllZones)
  .post(authenticateToken, requirePermission('create_zone'), createZone);
router.route('/zones/:id')
  .put(authenticateToken, requirePermission('update_zone'), editZone)
  .delete(authenticateToken, requirePermission('delete_zone'), removeZone);

// Status Types
router.route('/status-types')
  .get(authenticateToken, requirePermission('view_status_types'), getAllStatusTypes)
  .post(authenticateToken, requirePermission('create_status_type'), createStatusType);
router.route('/status-types/:id')
  .put(authenticateToken, requirePermission('update_status_type'), editStatusType)
  .delete(authenticateToken, requirePermission('delete_status_type'), removeStatusType);

export default router;