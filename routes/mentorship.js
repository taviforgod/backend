import express from 'express';
import * as ctrl from '../controllers/mentorshipController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/assign', authenticateToken, ctrl.assignMentorCtrl);

// NEW: list mentors (used by frontend: GET /api/mentorship/mentors)
router.get('/mentors', authenticateToken, ctrl.getMentors);

// --- Add "me" routes BEFORE any :id routes ---
router.get('/mentor/me', authenticateToken, ctrl.getMentorAssignmentsForCurrentUser);
router.get('/mentee/me', authenticateToken, ctrl.getMenteeAssignmentsForCurrentUser);

router.get('/mentor/:mentor_id', authenticateToken, ctrl.getMentorAssignments);
router.get('/mentee/:mentee_id', authenticateToken, ctrl.getMenteeAssignments);

router.post('/sessions', authenticateToken, ctrl.createSessionCtrl);
router.get('/sessions/:assignment_id', authenticateToken, ctrl.getSessionsForAssignment);

// assignment routes (single assignment: GET, PUT, DELETE)
router.get('/assignment/:assignment_id', authenticateToken, ctrl.getAssignmentCtrl);
router.put('/assignment/:assignment_id', authenticateToken, ctrl.updateAssignmentCtrl);
router.delete('/assignment/:assignment_id', authenticateToken, ctrl.removeAssignmentCtrl);

// session routes (note: GET/PUT use singular '/session' to avoid conflict with '/sessions/:assignment_id')
router.get('/session/:session_id', authenticateToken, ctrl.getSessionCtrl);
router.put('/session/:session_id', authenticateToken, ctrl.updateSessionCtrl);
router.delete('/sessions/:session_id', authenticateToken, ctrl.removeSessionCtrl);

// summary
router.get('/summary', authenticateToken, ctrl.getSummaryCtrl);

export default router;