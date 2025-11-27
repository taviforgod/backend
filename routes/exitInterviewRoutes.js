// routes/exitInterviewRoutes.js
import express from 'express';
import * as ctrl from '../controllers/exitInterviewCtrl.js';
import {authenticateToken  as authenticate} from '../middleware/authMiddleware.js';
import { requirePermission as checkPermission } from '../middleware/rbacMiddleware.js';

const router = express.Router();

router.post('/', authenticate, checkPermission('create_exit_interviews'), ctrl.createInterview);
router.get('/:id', authenticate, checkPermission('view_exit_interviews'), ctrl.getInterview);
router.get('/', authenticate, checkPermission('view_exit_interviews'), ctrl.listInterviews);

export default router;
