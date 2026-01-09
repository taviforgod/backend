import express from 'express';
import * as ctrl from '../controllers/crisisFollowupController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { requirePermission } from '../middleware/rbacMiddleware.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Main case management
router.get('/', requirePermission('crisis_view'), ctrl.getAllCrisisFollowups);
router.get('/summary', requirePermission('crisis_view'), ctrl.getCrisisSummary);
router.get('/urgent', requirePermission('crisis_view'), ctrl.getUrgentCases);
router.get('/:id', requirePermission('crisis_view'), ctrl.getCrisisFollowupById);
router.get('/:id/details', requirePermission('crisis_view'), ctrl.getCaseDetails);
router.post('/', requirePermission('crisis_manage'), ctrl.createCrisisFollowup);
router.put('/:id', requirePermission('crisis_manage'), ctrl.updateCrisisFollowup);
router.delete('/:id', requirePermission('crisis_manage'), ctrl.deleteCrisisFollowup);

// Crisis assessments
router.post('/:caseId/assessments', requirePermission('crisis_manage'), ctrl.createCrisisAssessment);
router.get('/:caseId/assessments', requirePermission('crisis_view'), ctrl.getCrisisAssessments);

// Intervention plans
router.post('/:caseId/intervention-plans', requirePermission('crisis_manage'), ctrl.createInterventionPlan);
router.get('/:caseId/intervention-plans', requirePermission('crisis_view'), ctrl.getInterventionPlans);

// Follow-up sessions
router.post('/:caseId/sessions', requirePermission('crisis_manage'), ctrl.createFollowupSession);
router.get('/:caseId/sessions', requirePermission('crisis_view'), ctrl.getFollowupSessions);

// Referrals
router.post('/:caseId/referrals', requirePermission('crisis_manage'), ctrl.createCrisisReferral);
router.get('/:caseId/referrals', requirePermission('crisis_view'), ctrl.getCrisisReferrals);

// Recovery milestones
router.post('/:caseId/milestones', requirePermission('crisis_manage'), ctrl.createRecoveryMilestone);
router.get('/:caseId/milestones', requirePermission('crisis_view'), ctrl.getRecoveryMilestones);
router.put('/milestones/:milestoneId/progress', requirePermission('crisis_manage'), ctrl.updateMilestoneProgress);

// Crisis resources (shared across cases)
router.get('/resources', requirePermission('crisis_view'), ctrl.getCrisisResources);

export default router;
