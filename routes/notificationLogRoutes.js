import express from 'express';
import { authenticateToken } from '../middleware/authMiddleware.js';
import * as logCtrl from '../controllers/notificationLogController.js';

const router = express.Router();

router.use(authenticateToken);

// Get notification logs with filters
router.get("/", logCtrl.getLogs);

// Get delivery statistics
router.get("/stats/delivery", logCtrl.getDeliveryStats);

export default router;