import express from 'express';
import * as ctrl from '../controllers/mentorshipController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/assign', authenticateToken, ctrl.assignMentorCtrl);
router.get('/mentor/:mentor_id', authenticateToken, ctrl.getMentorAssignments);
router.get('/mentee/:mentee_id', authenticateToken, ctrl.getMenteeAssignments);

router.post('/sessions', authenticateToken, ctrl.createSessionCtrl);
router.get('/sessions/:assignment_id', authenticateToken, ctrl.getSessionsForAssignment);

// Add these routes:
router.delete('/assignment/:assignment_id', authenticateToken, ctrl.removeAssignmentCtrl);
router.delete('/sessions/:session_id', authenticateToken, ctrl.removeSessionCtrl);


export default router;