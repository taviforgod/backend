import express from 'express';
import { authenticateToken } from '../middleware/authMiddleware.js';
import * as jobCtrl from '../controllers/notificationJobController.js';

const router = express.Router();

router.use(authenticateToken);

router.get("/", jobCtrl.listJobs);
router.get("/:id", jobCtrl.getJob);
router.post("/", jobCtrl.createJob);
router.put("/:id", jobCtrl.updateJob);
router.delete("/:id", jobCtrl.deleteJob);

export default router;