import express from 'express';
import { authenticateToken } from '../middleware/authMiddleware.js';
import * as ctrl from '../controllers/notificationsController.js';
import { notificationRateLimitExpress } from '../middleware/notificationRateLimitExpress.js';
import { requireAdmin } from '../middleware/requireAdmin.js';

const router = express.Router();

router.use(authenticateToken);

router.get('/', ctrl.listNotifications);
router.get('/:id', ctrl.getNotification);
router.post('/:id/read', ctrl.markRead);
router.post('/mark-all-read', ctrl.markAllRead);
router.delete('/:id', requireAdmin, ctrl.deleteNotification);

router.post('/', notificationRateLimitExpress, async (req, res) => {
  const { church_id, user_id, member_id, title, message, channel, metadata } = req.body;
  try {
    const { createNotification } = await import('../models/notificationsModel.js');
    const created = await createNotification({ church_id, user_id, member_id, title, message, channel, metadata }, { force: req.body.force });
    res.status(201).json({ ok: true, notification: created });
  } catch (err) {
    if (err && (err.code === 'RATE_LIMIT_USER' || err.code === 'RATE_LIMIT_CHURCH')) {
      return res.status(429).json({ ok:false, message: err.message });
    }
    res.status(500).json({ ok:false, message: err.message });
  }
});


export default router;
