// routes/mentorshipRoutes.js
import express from 'express';
import * as ctrl from '../controllers/mentorshipController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// Mentee-centric assign endpoint (existing)
router.post('/assign-mentee', authenticateToken, ctrl.assignMenteeCtrl);

// Mentor-centric alias for clarity
router.post('/assign-mentor', authenticateToken, ctrl.assignMenteeCtrl);

// fetch assignments (mentor or mentee)
router.get('/mentor/:mentor_id', authenticateToken, ctrl.getMentorAssignments);
router.get('/mentee/:mentee_id', authenticateToken, ctrl.getMenteeAssignments);

// sessions
router.post('/sessions', authenticateToken, ctrl.createSessionCtrl);
router.get('/sessions/:assignment_id', authenticateToken, ctrl.getSessionsForAssignment);

// deletes
router.delete('/assignment/:assignment_id', authenticateToken, ctrl.removeAssignmentCtrl);
router.delete('/sessions/:session_id', authenticateToken, ctrl.removeSessionCtrl);

export default router;
