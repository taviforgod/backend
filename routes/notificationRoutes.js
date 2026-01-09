import express from 'express';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { notificationRateLimiter } from '../middleware/notificationRateLimiter.js';
import * as notificationCtrl from '../controllers/notificationController.js';

const router = express.Router();

router.use(authenticateToken);

router.get("/", notificationCtrl.listNotifications);
router.get("/:id", notificationCtrl.getNotification);
router.post("/", notificationRateLimiter, notificationCtrl.createNotification);
router.put("/:id", notificationCtrl.updateNotification);
router.delete("/:id", notificationCtrl.deleteNotification);
router.post("/:id/read", notificationCtrl.markNotificationRead);
router.post("/mark-all-read", notificationCtrl.markAllNotificationsRead);

export default router;