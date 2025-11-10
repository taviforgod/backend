import express from 'express';
import * as ctrl from '../controllers/leadershipCtrl.js';
import { authenticateToken } from '../middleware/authMiddleware.js';



const router = express.Router();

router.get('/roles', authenticateToken, ctrl.listRoles);
router.post('/roles', authenticateToken, ctrl.createRole);

router.post('/promotions', authenticateToken, ctrl.createPromotion);

router.get('/evaluations/:leaderId', authenticateToken, ctrl.listEvaluations);
router.post('/evaluations', authenticateToken, ctrl.createEvaluation);

router.get('/alerts', authenticateToken, ctrl.listAlerts);
router.post('/alerts', authenticateToken, ctrl.createAlert);

router.post('/exit-records', authenticateToken, ctrl.createExitRecord);

export default router;