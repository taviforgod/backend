import { Router } from 'express';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { requirePermission } from '../middleware/rbacMiddleware.js';
import {
  createEventHandler,
  getEventsHandler,
  getEventHandler,
  updateEventHandler,
  addParticipantHandler,
  updateAttendanceHandler,
  getParticipantsHandler,
  getUpcomingEventsHandler,
  getEventsSummaryHandler
} from '../controllers/outreachEventController.js';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// Outreach Events CRUD
router.post('/', requirePermission('create_member'), createEventHandler);
router.get('/', requirePermission('view_members'), getEventsHandler);
router.get('/:id', requirePermission('view_members'), getEventHandler);
router.put('/:id', requirePermission('update_member'), updateEventHandler);

// Event Participants
router.post('/participants', requirePermission('update_member'), addParticipantHandler);
router.put('/:eventId/attendance/:memberId', requirePermission('update_member'), updateAttendanceHandler);
router.get('/:eventId/participants', requirePermission('view_members'), getParticipantsHandler);

// Analytics & Reporting
router.get('/upcoming/list', requirePermission('view_members'), getUpcomingEventsHandler);
router.get('/summary/by-type', requirePermission('view_members'), getEventsSummaryHandler);

export default router;