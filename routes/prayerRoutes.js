import express from 'express';
import * as prayerCtrl from '../controllers/prayerController.js';
import * as membersCtrl from '../controllers/memberController.js';
import {authenticateToken} from '../middleware/authMiddleware.js';
import { requirePermission } from '../middleware/rbacMiddleware.js';

const router = express.Router();

router.use(authenticateToken);

router.get('/urgent-count', requirePermission('view_prayer'), prayerCtrl.getUrgentCount);

router.get('/', requirePermission('view_prayer'), prayerCtrl.list);

// Member-specific route - allows members to view their own prayer requests
router.get('/my', prayerCtrl.listMyPrayers);

// add this alias so "/requests" does not get interpreted as an :id
router.get('/requests', requirePermission('view_prayer'), prayerCtrl.list);

router.get('/:id', requirePermission('view_prayer'), prayerCtrl.getById);
router.post('/', requirePermission('create_prayer'), prayerCtrl.create);
router.post('/:id/assign', requirePermission('assign_prayer'), prayerCtrl.assign);
router.post('/:id/followups', requirePermission('manage_prayer_followups'), prayerCtrl.addFollowup);
router.post('/:id/close', requirePermission('close_prayer'), prayerCtrl.close);

// leaders passthrough for frontend
router.get('/leaders/list', requirePermission('view_members'), membersCtrl.getLeaders);

export default router;
