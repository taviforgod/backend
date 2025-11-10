// routes/exportRoutes.js
import express from 'express';
import exportExits from '../controllers/exportCtrl.js';
import {authenticateToken  as authenticate} from '../middleware/authMiddleware.js';
import { requirePermission as checkPermission } from '../middleware/rbacMiddleware.js';


const router = express.Router();

// exportExits is exported as an array with middleware + handler; wrap with permission/auth
router.get('/exits', authenticate, checkPermission('export_inactive_exits'), exportExits[1]);

export default router;
