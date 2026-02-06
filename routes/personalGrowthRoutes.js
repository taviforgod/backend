import { Router } from 'express';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { requirePermission } from '../middleware/rbacMiddleware.js';
import {
  createGrowthPlanHandler,
  getGrowthPlansHandler,
  updateGrowthPlanHandler,
  createPlanMilestoneHandler,
  getPlanMilestonesHandler,
  updatePlanMilestoneHandler,
  createBurnoutAssessmentHandler,
  getBurnoutAssessmentsHandler,
  createWellnessCheckinHandler,
  getWellnessCheckinsHandler,
  createSpiritualDisciplineHandler,
  getSpiritualDisciplinesHandler,
  createPersonalDevelopmentGoalHandler,
  getPersonalDevelopmentGoalsHandler,
  getBurnoutRiskSummaryHandler,
  getWellnessTrendsHandler,
  getSpiritualDisciplineSummaryHandler,
  getMembersNeedingAttentionHandler,
  getGrowthPlanProgressHandler
} from '../controllers/personalGrowthController.js';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// Personal Growth Plans
router.post('/growth-plans', requirePermission('update_member'), createGrowthPlanHandler);
router.get('/growth-plans', requirePermission('view_members'), getGrowthPlansHandler);
router.put('/growth-plans/:id', requirePermission('update_member'), updateGrowthPlanHandler);

// Growth Plan Milestones
router.post('/growth-plans/milestones', requirePermission('update_member'), createPlanMilestoneHandler);
router.get('/growth-plans/:planId/milestones', requirePermission('view_members'), getPlanMilestonesHandler);
router.put('/growth-plans/milestones/:id', requirePermission('update_member'), updatePlanMilestoneHandler);

// Burnout Assessments
router.post('/burnout-assessments', requirePermission('update_member'), createBurnoutAssessmentHandler);
router.get('/burnout-assessments', requirePermission('view_members'), getBurnoutAssessmentsHandler);

// Wellness Check-ins
router.post('/wellness-checkins', requirePermission('update_member'), createWellnessCheckinHandler);
router.get('/wellness-checkins', requirePermission('view_members'), getWellnessCheckinsHandler);

// Spiritual Disciplines
router.post('/spiritual-disciplines', requirePermission('update_member'), createSpiritualDisciplineHandler);
router.get('/spiritual-disciplines', requirePermission('view_members'), getSpiritualDisciplinesHandler);

// Personal Development Goals
router.post('/personal-development-goals', requirePermission('update_member'), createPersonalDevelopmentGoalHandler);
router.get('/personal-development-goals', requirePermission('view_members'), getPersonalDevelopmentGoalsHandler);

// Analytics & Reporting
router.get('/analytics/burnout-risk-summary', requirePermission('view_members'), getBurnoutRiskSummaryHandler);
router.get('/analytics/wellness-trends/:memberId', requirePermission('view_members'), getWellnessTrendsHandler);
router.get('/analytics/spiritual-discipline-summary/:memberId', requirePermission('view_members'), getSpiritualDisciplineSummaryHandler);
router.get('/analytics/members-needing-attention', requirePermission('view_members'), getMembersNeedingAttentionHandler);
router.get('/analytics/growth-plan-progress/:memberId', requirePermission('view_members'), getGrowthPlanProgressHandler);

export default router;