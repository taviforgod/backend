import { Router } from 'express';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { requirePermission } from '../middleware/rbacMiddleware.js';
import {
  createCandidateHandler,
  getCandidatesHandler,
  getCandidateHandler,
  updateCandidateHandler,
  createRecordHandler,
  getRecordsHandler,
  getRecordHandler,
  performBaptismHandler,
  getBaptismStatsHandler,
  getUpcomingBaptismsHandler
} from '../controllers/baptismController.js';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// Baptism Candidates CRUD
router.post('/candidates', requirePermission('create_member'), createCandidateHandler);
router.get('/candidates', requirePermission('view_members'), getCandidatesHandler);
router.get('/candidates/:id', requirePermission('view_members'), getCandidateHandler);
router.put('/candidates/:id', requirePermission('update_member'), updateCandidateHandler);

// Baptism Records
router.post('/records', requirePermission('create_member'), createRecordHandler);
router.get('/records', requirePermission('view_members'), getRecordsHandler);
router.get('/records/:id', requirePermission('view_members'), getRecordHandler);

// Perform Baptism
router.post('/candidates/:candidateId/perform', requirePermission('update_member'), performBaptismHandler);

// Analytics & Reporting
router.get('/stats/overview', requirePermission('view_members'), getBaptismStatsHandler);
router.get('/upcoming/list', requirePermission('view_members'), getUpcomingBaptismsHandler);

export default router;