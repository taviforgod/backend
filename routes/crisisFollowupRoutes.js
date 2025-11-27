import express from 'express';
import * as ctrl from '../controllers/crisisFollowupController.js';
import {authenticateToken} from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', authenticateToken, ctrl.getAllCrisisFollowups);
router.get('/summary', authenticateToken, ctrl.getCrisisSummary);
router.get('/:id', authenticateToken, ctrl.getCrisisFollowupById);
router.post('/', authenticateToken, ctrl.createCrisisFollowup);
router.put('/:id', authenticateToken, ctrl.updateCrisisFollowup);
router.delete('/:id', authenticateToken, ctrl.deleteCrisisFollowup);

export default router;
