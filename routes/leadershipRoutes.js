import express from 'express';
import * as ctrl from '../controllers/leadershipCtrl.js';
import * as milestoneCtrl from '../controllers/milestoneTemplateController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { requirePermission } from '../middleware/rbacMiddleware.js';

const router = express.Router();

router.get('/roles', authenticateToken, ctrl.listRoles);
router.post('/roles', authenticateToken, ctrl.createRole);

// add update / delete for roles
router.put('/roles/:id', authenticateToken, ctrl.updateRole);
router.delete('/roles/:id', authenticateToken, ctrl.deleteRole);

router.post('/promotions', authenticateToken, ctrl.createPromotion);
// add update / delete for promotions
router.put('/promotions/:id', authenticateToken, ctrl.updatePromotion);
router.delete('/promotions/:id', authenticateToken, ctrl.deletePromotion);

router.get('/evaluations/:leaderId', authenticateToken, ctrl.listEvaluations);
router.post('/evaluations', authenticateToken, ctrl.createEvaluation);
// update / delete evaluations
router.put('/evaluations/:id', authenticateToken, ctrl.updateEvaluation);
router.delete('/evaluations/:id', authenticateToken, ctrl.deleteEvaluation);

router.get('/alerts', authenticateToken, ctrl.listAlerts);
router.post('/alerts', authenticateToken, ctrl.createAlert);
// resolve and delete alerts
router.patch('/alerts/:id/resolve', authenticateToken, ctrl.resolveAlert);
router.delete('/alerts/:id', authenticateToken, ctrl.deleteAlert);

router.post('/exit-records', authenticateToken, ctrl.createExitRecord);
// update / delete exit records
router.put('/exit-records/:id', authenticateToken, ctrl.updateExitRecord);
router.delete('/exit-records/:id', authenticateToken, ctrl.deleteExitRecord);

// Milestone templates
router.post('/milestones/templates', authenticateToken, milestoneCtrl.createTemplateCtrl);
router.put('/milestones/templates/:id', authenticateToken, milestoneCtrl.updateTemplateCtrl);
router.delete('/milestones/templates/:id', authenticateToken, milestoneCtrl.deleteTemplateCtrl);

// Milestone records
router.post('/milestones/records', authenticateToken, ctrl.createMilestoneRecord);
router.get('/milestones/:memberId', authenticateToken, ctrl.listMilestoneRecords);
router.put('/milestones/records/:id', authenticateToken, ctrl.updateMilestoneRecord);
router.delete('/milestones/records/:id', authenticateToken, ctrl.deleteMilestoneRecord);

// Mentorship assignments (update / delete)
router.put('/mentorship/:id', authenticateToken, ctrl.updateMentorshipAssignment);
router.delete('/mentorship/:id', authenticateToken, ctrl.deleteMentorshipAssignment);

// Leadership pipeline
router.get('/pipeline', authenticateToken, ctrl.listPipeline);

// Leadership readiness (simple endpoints - Phase 1, fast path)
router.get('/:leaderId/readiness', authenticateToken, ctrl.getReadiness);
router.post('/:leaderId/request-approval', authenticateToken, ctrl.requestApproval);
router.post('/:leaderId/approve', authenticateToken, requirePermission('update_member'), ctrl.approveLeader);
router.post('/:leaderId/reject', authenticateToken, requirePermission('update_member'), express.json(), ctrl.rejectLeader);

// Admin approvals inbox
router.get('/approvals/pending', authenticateToken, requirePermission('update_member'), ctrl.listPendingApprovals);

export default router;