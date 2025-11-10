import express from 'express';
import * as ctrl from '../controllers/mentorshipController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/assign', authenticateToken, ctrl.assignMentorCtrl);

// --- Add "me" routes BEFORE any :id routes ---
router.get('/mentor/me', authenticateToken, ctrl.getMentorAssignmentsForCurrentUser);
router.get('/mentee/me', authenticateToken, ctrl.getMenteeAssignmentsForCurrentUser);

router.get('/mentor/:mentor_id', authenticateToken, ctrl.getMentorAssignments);
router.get('/mentee/:mentee_id', authenticateToken, ctrl.getMenteeAssignments);

router.post('/sessions', authenticateToken, ctrl.createSessionCtrl);
router.get('/sessions/:assignment_id', authenticateToken, ctrl.getSessionsForAssignment);

router.delete('/assignment/:assignment_id', authenticateToken, ctrl.removeAssignmentCtrl);
router.delete('/sessions/:session_id', authenticateToken, ctrl.removeSessionCtrl);

export default router;