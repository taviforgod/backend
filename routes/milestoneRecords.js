import express from 'express';
import * as ctrl from '../controllers/milestoneRecordController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', authenticateToken, ctrl.getAllRecords);
router.get('/me', authenticateToken, ctrl.getByCurrentUser);
router.get('/:member_id', authenticateToken, ctrl.getByMember);
router.post('/', authenticateToken, ctrl.createRecordCtrl);
router.delete('/:id', authenticateToken, ctrl.deleteRecordCtrl);

export default router;
