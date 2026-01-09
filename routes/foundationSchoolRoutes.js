import express from 'express';
import {
  getFoundationClassesHandler,
  getFoundationEnrollmentsHandler,
  enrollMemberHandler,
  updateEnrollmentHandler,
  addSessionAttendanceHandler,
  getEnrollmentSessionsHandler,
  getFoundationSchoolStatsHandler
} from '../controllers/foundationSchoolController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Get foundation classes
router.get('/classes', getFoundationClassesHandler);

// Get foundation school statistics
router.get('/stats', getFoundationSchoolStatsHandler);

// Get enrollments
router.get('/enrollments', getFoundationEnrollmentsHandler);

// Enroll member in class
router.post('/enrollments', enrollMemberHandler);

// Update enrollment progress
router.put('/enrollments/:id', updateEnrollmentHandler);

// Add session attendance
router.post('/sessions', addSessionAttendanceHandler);

// Get enrollment sessions
router.get('/enrollments/:enrollmentId/sessions', getEnrollmentSessionsHandler);

export default router;