import express from 'express';
import * as ctrl from '../controllers/leadershipCtrl.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

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
router.post('/milestones/templates', authenticateToken, ctrl.createMilestoneTemplate);
router.put('/milestones/templates/:id', authenticateToken, ctrl.updateMilestoneTemplate);
router.delete('/milestones/templates/:id', authenticateToken, ctrl.deleteMilestoneTemplate);

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

export default router;