import { Router } from 'express';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { requirePermission } from '../middleware/rbacMiddleware.js';
import {
  createPerformanceMetricsHandler,
  getPerformanceMetricsHandler,
  createHealthAssessmentHandler,
  getHealthAssessmentsHandler,
  createLeadershipEntryHandler,
  getLeadershipPipelineHandler,
  createMultiplicationPlanHandler,
  getMultiplicationPlansHandler,
  createGrowthTargetHandler,
  getGrowthTargetsHandler,
  getCellGrowthAnalyticsHandler,
  getLeadershipDevelopmentStatsHandler,
  getMultiplicationSuccessRateHandler,
  getCellsNeedingAttentionHandler
} from '../controllers/cellGrowthController.js';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// Cell Performance Metrics
router.post('/performance-metrics', requirePermission('update_member'), createPerformanceMetricsHandler);
router.get('/performance-metrics', requirePermission('view_members'), getPerformanceMetricsHandler);

// Cell Health Assessments
router.post('/health-assessments', requirePermission('update_member'), createHealthAssessmentHandler);
router.get('/health-assessments', requirePermission('view_members'), getHealthAssessmentsHandler);

// Leadership Pipeline
router.post('/leadership-pipeline', requirePermission('update_member'), createLeadershipEntryHandler);
router.get('/leadership-pipeline', requirePermission('view_members'), getLeadershipPipelineHandler);

// Cell Multiplication Planning
router.post('/multiplication-plans', requirePermission('update_member'), createMultiplicationPlanHandler);
router.get('/multiplication-plans', requirePermission('view_members'), getMultiplicationPlansHandler);

// Growth Targets
router.post('/growth-targets', requirePermission('update_member'), createGrowthTargetHandler);
router.get('/growth-targets', requirePermission('view_members'), getGrowthTargetsHandler);

// Analytics & Reporting
router.get('/analytics/overview', requirePermission('view_members'), getCellGrowthAnalyticsHandler);
router.get('/analytics/leadership', requirePermission('view_members'), getLeadershipDevelopmentStatsHandler);
router.get('/analytics/multiplication-success', requirePermission('view_members'), getMultiplicationSuccessRateHandler);
router.get('/analytics/cells-needing-attention', requirePermission('view_members'), getCellsNeedingAttentionHandler);

export default router;