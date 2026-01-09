import { Router } from 'express';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { requirePermission } from '../middleware/rbacMiddleware.js';
import {
  createCelebrationHandler,
  getCelebrationsHandler,
  getCelebrationHandler,
  updateCelebrationHandler,
  createSpecialDateHandler,
  getSpecialDatesHandler,
  updateSpecialDateHandler,
  createAchievementHandler,
  getAchievementsHandler,
  getUpcomingCelebrationsHandler,
  getCelebrationStatsHandler
} from '../controllers/celebrationController.js';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// Celebrations & Events CRUD
router.post('/events', requirePermission('create_member'), createCelebrationHandler);
router.get('/events', requirePermission('view_members'), getCelebrationsHandler);
router.get('/events/:id', requirePermission('view_members'), getCelebrationHandler);
router.put('/events/:id', requirePermission('update_member'), updateCelebrationHandler);

// Special Dates Management
router.post('/special-dates', requirePermission('create_member'), createSpecialDateHandler);
router.get('/special-dates', requirePermission('view_members'), getSpecialDatesHandler);
router.put('/special-dates/:id', requirePermission('update_member'), updateSpecialDateHandler);

// Achievements Management
router.post('/achievements', requirePermission('create_member'), createAchievementHandler);
router.get('/achievements', requirePermission('view_members'), getAchievementsHandler);

// Analytics & Reporting
router.get('/upcoming/list', requirePermission('view_members'), getUpcomingCelebrationsHandler);
router.get('/stats/overview', requirePermission('view_members'), getCelebrationStatsHandler);

export default router;