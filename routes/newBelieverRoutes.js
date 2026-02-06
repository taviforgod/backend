import { Router } from 'express';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { requirePermission } from '../middleware/rbacMiddleware.js';
import {
  createJourneyHandler,
  getJourneysHandler,
  getJourneyHandler,
  updateJourneyHandler,
  convertVisitorHandler,
  createNtyabaVisitHandler,
  getNtyabaVisitsHandler,
  createSessionHandler,
  getSessionsHandler,
  getStatsHandler
} from '../controllers/newBelieverController.js';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// Cell visitor journeys CRUD
router.post('/journeys', requirePermission('create_member'), createJourneyHandler);
router.get('/journeys', requirePermission('view_members'), getJourneysHandler);
router.get('/journeys/:id', requirePermission('view_members'), getJourneyHandler);
router.put('/journeys/:id', requirePermission('update_member'), updateJourneyHandler);

// Convert cell visitor to church attendee
router.post('/convert-visitor/:visitorId', requirePermission('create_member'), convertVisitorHandler);

// NTYABA visit tracking
router.post('/ntyaba-visits', requirePermission('update_member'), createNtyabaVisitHandler);
router.get('/journeys/:journeyId/ntyaba-visits', requirePermission('view_members'), getNtyabaVisitsHandler);

// Session tracking
router.post('/sessions', requirePermission('update_member'), createSessionHandler);
router.get('/journeys/:journeyId/sessions', requirePermission('view_members'), getSessionsHandler);

// Stats
router.get('/stats', requirePermission('view_members'), getStatsHandler);

export default router;