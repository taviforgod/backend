import express from 'express';
import {
  getAllLookups,

  // Titles
  getAllTitles, createTitle, editTitle, removeTitle,

  // Genders
  getAllGenders, createGender, editGender, removeGender,

  // Marital Statuses
  getAllMaritalStatuses, createMaritalStatus, editMaritalStatus, removeMaritalStatus,

  // Member Types
  getAllMemberTypes, createMemberType, editMemberType, removeMemberType,

  // Member Statuses
  getAllMemberStatuses, createMemberStatus, editMemberStatus, removeMemberStatus,

  // Nationalities
  getAllNationalities, createNationality, editNationality, removeNationality,

  // Churches
  getAllChurches, createChurch, editChurch, removeChurch,
  editChurchZone,

  // Zones
  getAllZones, createZone, editZone, removeZone,

  // Status Types
  getAllStatusTypes, createStatusType, editStatusType, removeStatusType
} from '../controllers/lookupController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { requirePermission } from '../middleware/requirePermission.js';

const router = express.Router();

/* -----------------------------------------------------
   ALL LOOKUPS (PUBLIC)
----------------------------------------------------- */
router.get('/', getAllLookups);

/* -----------------------------------------------------
   TITLES
----------------------------------------------------- */
router.route('/titles')
  .get(getAllTitles)
  .post(createTitle);

router.route('/titles/:id')
  .put(editTitle)
  .delete(removeTitle);

/* -----------------------------------------------------
   GENDERS
----------------------------------------------------- */
router.route('/genders')
  .get(getAllGenders)
  .post(createGender);

router.route('/genders/:id')
  .put(editGender)
  .delete(removeGender);

/* -----------------------------------------------------
   MARITAL STATUSES
----------------------------------------------------- */
router.route('/marital-statuses')
  .get(getAllMaritalStatuses)
  .post(createMaritalStatus);

router.route('/marital-statuses/:id')
  .put(editMaritalStatus)
  .delete(removeMaritalStatus);

/* -----------------------------------------------------
   MEMBER TYPES
----------------------------------------------------- */
router.route('/member-types')
  .get(getAllMemberTypes)
  .post(createMemberType);

router.route('/member-types/:id')
  .put(editMemberType)
  .delete(removeMemberType);

/* -----------------------------------------------------
   MEMBER STATUSES
----------------------------------------------------- */
router.route('/member-statuses')
  .get(getAllMemberStatuses)
  .post(createMemberStatus);

router.route('/member-statuses/:id')
  .put(editMemberStatus)
  .delete(removeMemberStatus);

/* -----------------------------------------------------
   NATIONALITIES
----------------------------------------------------- */
router.route('/nationalities')
  .get(getAllNationalities)
  .post(createNationality);

router.route('/nationalities/:id')
  .put(editNationality)
  .delete(removeNationality);

/* -----------------------------------------------------
   CHURCHES
----------------------------------------------------- */
router.route('/churches')
  .get(getAllChurches)
  .post(createChurch);

router.route('/churches/:id')
  .put(editChurch)
  .delete(removeChurch);

// Update church zone
router.put('/churches/:id/zone', authenticateToken, requirePermission('manage_zone'), editChurchZone);

/* -----------------------------------------------------
   ZONES
----------------------------------------------------- */
router.route('/zones')
  .get(getAllZones)
  .post(createZone);

router.route('/zones/:id')
  .put(editZone)
  .delete(removeZone);

/* -----------------------------------------------------
   STATUS TYPES
----------------------------------------------------- */
router.route('/status-types')
  .get(getAllStatusTypes)
  .post(createStatusType);

router.route('/status-types/:id')
  .put(editStatusType)
  .delete(removeStatusType);

/* ----------------------------------------------------- */

export default router;
