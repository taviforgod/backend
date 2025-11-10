import express from 'express';
import { authenticateToken } from '../middleware/authMiddleware.js';
import * as notificationCtrl from '../controllers/notificationController.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Notification routes
router.get("/", notificationCtrl.listNotifications);
router.get("/:id", notificationCtrl.getNotification);
router.post("/", notificationCtrl.createNotification); // rate limiter removed
router.put("/:id", notificationCtrl.updateNotification);
router.delete("/:id", notificationCtrl.deleteNotification);
router.post("/:id/read", notificationCtrl.markNotificationRead);
router.post("/mark-all-read", notificationCtrl.markAllNotificationsRead);

export default router;
