import { Router } from 'express';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { requirePermission } from '../middleware/rbacMiddleware.js';
import {
  createChecklistItemHandler,
  getChecklistByCandidateHandler,
  updateChecklistItemHandler,
  initializeChecklistHandler,
  getChecklistProgressHandler,
  createPrepSessionHandler,
  getPrepSessionsByCandidateHandler,
  updatePrepSessionHandler,
  getUpcomingPrepSessionsHandler,
  getCandidatesReadyForBaptismHandler
} from '../controllers/baptismPrepController.js';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// Baptism Prep Checklist
router.post('/checklist', requirePermission('update_member'), createChecklistItemHandler);
router.get('/candidates/:candidateId/checklist', requirePermission('view_members'), getChecklistByCandidateHandler);
router.put('/checklist/:id', requirePermission('update_member'), updateChecklistItemHandler);

// Initialize checklist for new candidate
router.post('/candidates/:candidateId/initialize-checklist', requirePermission('update_member'), initializeChecklistHandler);
router.get('/candidates/:candidateId/checklist-progress', requirePermission('view_members'), getChecklistProgressHandler);

// Baptism Prep Sessions
router.post('/sessions', requirePermission('update_member'), createPrepSessionHandler);
router.get('/candidates/:candidateId/sessions', requirePermission('view_members'), getPrepSessionsByCandidateHandler);
router.put('/sessions/:id', requirePermission('update_member'), updatePrepSessionHandler);

// Analytics & Reporting
router.get('/upcoming-sessions', requirePermission('view_members'), getUpcomingPrepSessionsHandler);
router.get('/candidates-ready', requirePermission('view_members'), getCandidatesReadyForBaptismHandler);

export default router;