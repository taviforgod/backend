import express from 'express';
import {
  listPrayers,
  getPrayerCtrl,
  createPrayerCtrl,
  updatePrayerCtrl,
  assignPrayerCtrl,
  addFollowupCtrl,
  closePrayerCtrl,
  urgentCountCtrl,
  slaCtrl,
  trendCtrl
} from '../controllers/prayerController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { requirePermission } from '../middleware/rbacMiddleware.js';

const router = express.Router();

router.get('/', authenticateToken, requirePermission('view_prayer_requests'), listPrayers);
router.get('/urgent-count', authenticateToken, requirePermission('view_prayer_requests'), urgentCountCtrl);
router.get('/sla', authenticateToken, requirePermission('view_prayer_requests'), slaCtrl);
router.get('/trends', authenticateToken, requirePermission('view_prayer_requests'), trendCtrl);

router.post('/', authenticateToken, requirePermission('create_prayer_request'), createPrayerCtrl);

router.get('/:id', authenticateToken, requirePermission('view_prayer_requests'), getPrayerCtrl);
router.put('/:id', authenticateToken, requirePermission('update_prayer_request'), updatePrayerCtrl);

router.post('/:id/assign', authenticateToken, requirePermission('assign_prayer_request'), assignPrayerCtrl);
router.post('/:id/followups', authenticateToken, requirePermission('update_prayer_request'), addFollowupCtrl);
router.post('/:id/close', authenticateToken, requirePermission('close_prayer_request'), closePrayerCtrl);

export default router;
