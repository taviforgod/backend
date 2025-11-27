import express from 'express';
import { authenticateToken } from '../middleware/authMiddleware.js';
import * as logCtrl from '../controllers/notificationLogController.js';

const router = express.Router();

router.use(authenticateToken);

router.get("/", logCtrl.listLogs);
router.get("/:id", logCtrl.getLog);
router.delete("/:id", logCtrl.deleteLog);

export default router;