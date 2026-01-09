import * as model from '../models/personalGrowthModel.js';
import * as memberModel from '../models/memberModel.js';
import { handleError } from '../utils/errorHandler.js';

// Personal Growth Plans CRUD
export async function createGrowthPlanHandler(req, res) {
  try {
    const churchId = req.user?.church_id || 1;
    const member = await memberModel.getMemberByUserId(req.user.userId, churchId);
    const creatorId = member ? member.id : null;

    const planData = {
      ...req.body,
      church_id: churchId,
      created_by: creatorId
    };

    const plan = await model.createGrowthPlan(planData);
    res.status(201).json({
      message: 'Personal growth plan created successfully',
      plan
    });
  } catch (err) {
    return handleError(res, 'createGrowthPlanHandler', err);
  }
}

export async function getGrowthPlansHandler(req, res) {
  try {
    const churchId = req.user?.church_id || 1;
    const filters = {
      member_id: req.query.member_id ? parseInt(req.query.member_id) : undefined,
      plan_category: req.query.plan_category,
      status: req.query.status,
      limit: req.query.limit ? parseInt(req.query.limit) : undefined
    };

    const plans = await model.getGrowthPlans(churchId, filters);
    res.json(plans);
  } catch (err) {
    return handleError(res, 'getGrowthPlansHandler', err);
  }
}

export async function updateGrowthPlanHandler(req, res) {
  try {
    const planId = parseInt(req.params.id);
    const churchId = req.user?.church_id || 1;

    const plan = await model.updateGrowthPlan(planId, churchId, req.body);
    if (!plan) {
      return res.status(404).json({ message: 'Growth plan not found' });
    }

    res.json({
      message: 'Growth plan updated successfully',
      plan
    });
  } catch (err) {
    return handleError(res, 'updateGrowthPlanHandler', err);
  }
}

// Growth Plan Milestones
export async function createPlanMilestoneHandler(req, res) {
  try {
    const milestoneData = req.body;
    const milestone = await model.createPlanMilestone(milestoneData);
    res.status(201).json({
      message: 'Growth plan milestone created successfully',
      milestone
    });
  } catch (err) {
    return handleError(res, 'createPlanMilestoneHandler', err);
  }
}

export async function getPlanMilestonesHandler(req, res) {
  try {
    const planId = parseInt(req.params.planId);
    const milestones = await model.getPlanMilestones(planId);
    res.json(milestones);
  } catch (err) {
    return handleError(res, 'getPlanMilestonesHandler', err);
  }
}

export async function updatePlanMilestoneHandler(req, res) {
  try {
    const milestoneId = parseInt(req.params.id);
    const milestone = await model.updatePlanMilestone(milestoneId, req.body);
    if (!milestone) {
      return res.status(404).json({ message: 'Milestone not found' });
    }

    res.json({
      message: 'Milestone updated successfully',
      milestone
    });
  } catch (err) {
    return handleError(res, 'updatePlanMilestoneHandler', err);
  }
}

// Burnout Assessments CRUD
export async function createBurnoutAssessmentHandler(req, res) {
  try {
    const churchId = req.user?.church_id || 1;
    const member = await memberModel.getMemberByUserId(req.user.userId, churchId);
    const assessorId = member ? member.id : null;

    const assessmentData = {
      ...req.body,
      church_id: churchId,
      assessed_by: assessorId
    };

    const assessment = await model.createBurnoutAssessment(assessmentData);
    res.status(201).json({
      message: 'Burnout assessment completed successfully',
      assessment
    });
  } catch (err) {
    return handleError(res, 'createBurnoutAssessmentHandler', err);
  }
}

export async function getBurnoutAssessmentsHandler(req, res) {
  try {
    const churchId = req.user?.church_id || 1;
    const filters = {
      member_id: req.query.member_id ? parseInt(req.query.member_id) : undefined,
      risk_level: req.query.risk_level,
      intervention_needed: req.query.intervention_needed === 'true' ? true :
                          (req.query.intervention_needed === 'false' ? false : undefined),
      limit: req.query.limit ? parseInt(req.query.limit) : undefined
    };

    const assessments = await model.getBurnoutAssessments(churchId, filters);
    res.json(assessments);
  } catch (err) {
    return handleError(res, 'getBurnoutAssessmentsHandler', err);
  }
}

// Wellness Check-ins CRUD
export async function createWellnessCheckinHandler(req, res) {
  try {
    const churchId = req.user?.church_id || 1;

    const checkinData = {
      ...req.body,
      church_id: churchId
    };

    const checkin = await model.createWellnessCheckin(checkinData);
    res.status(201).json({
      message: 'Wellness check-in recorded successfully',
      checkin
    });
  } catch (err) {
    return handleError(res, 'createWellnessCheckinHandler', err);
  }
}

export async function getWellnessCheckinsHandler(req, res) {
  try {
    const churchId = req.user?.church_id || 1;
    const filters = {
      member_id: req.query.member_id ? parseInt(req.query.member_id) : undefined,
      date_from: req.query.date_from,
      date_to: req.query.date_to,
      limit: req.query.limit ? parseInt(req.query.limit) : undefined
    };

    const checkins = await model.getWellnessCheckins(churchId, filters);
    res.json(checkins);
  } catch (err) {
    return handleError(res, 'getWellnessCheckinsHandler', err);
  }
}

// Spiritual Disciplines CRUD
export async function createSpiritualDisciplineHandler(req, res) {
  try {
    const churchId = req.user?.church_id || 1;

    const disciplineData = {
      ...req.body,
      church_id: churchId
    };

    const discipline = await model.createSpiritualDiscipline(disciplineData);
    res.status(201).json({
      message: 'Spiritual discipline recorded successfully',
      discipline
    });
  } catch (err) {
    return handleError(res, 'createSpiritualDisciplineHandler', err);
  }
}

export async function getSpiritualDisciplinesHandler(req, res) {
  try {
    const churchId = req.user?.church_id || 1;
    const filters = {
      member_id: req.query.member_id ? parseInt(req.query.member_id) : undefined,
      date_from: req.query.date_from,
      date_to: req.query.date_to,
      limit: req.query.limit ? parseInt(req.query.limit) : undefined
    };

    const disciplines = await model.getSpiritualDisciplines(churchId, filters);
    res.json(disciplines);
  } catch (err) {
    return handleError(res, 'getSpiritualDisciplinesHandler', err);
  }
}

// Personal Development Goals CRUD
export async function createPersonalDevelopmentGoalHandler(req, res) {
  try {
    const churchId = req.user?.church_id || 1;

    const goalData = {
      ...req.body,
      church_id: churchId
    };

    const goal = await model.createPersonalDevelopmentGoal(goalData);
    res.status(201).json({
      message: 'Personal development goal created successfully',
      goal
    });
  } catch (err) {
    return handleError(res, 'createPersonalDevelopmentGoalHandler', err);
  }
}

export async function getPersonalDevelopmentGoalsHandler(req, res) {
  try {
    const churchId = req.user?.church_id || 1;
    const filters = {
      member_id: req.query.member_id ? parseInt(req.query.member_id) : undefined,
      goal_category: req.query.goal_category,
      status: req.query.status,
      limit: req.query.limit ? parseInt(req.query.limit) : undefined
    };

    const goals = await model.getPersonalDevelopmentGoals(churchId, filters);
    res.json(goals);
  } catch (err) {
    return handleError(res, 'getPersonalDevelopmentGoalsHandler', err);
  }
}

// Analytics & Reporting
export async function getBurnoutRiskSummaryHandler(req, res) {
  try {
    const churchId = req.user?.church_id || 1;
    const summary = await model.getBurnoutRiskSummary(churchId);
    res.json(summary);
  } catch (err) {
    return handleError(res, 'getBurnoutRiskSummaryHandler', err);
  }
}

export async function getWellnessTrendsHandler(req, res) {
  try {
    const churchId = req.user?.church_id || 1;
    const memberId = parseInt(req.params.memberId);
    const days = req.query.days ? parseInt(req.query.days) : 30;

    const trends = await model.getWellnessTrends(churchId, memberId, days);
    res.json(trends);
  } catch (err) {
    return handleError(res, 'getWellnessTrendsHandler', err);
  }
}

export async function getSpiritualDisciplineSummaryHandler(req, res) {
  try {
    const churchId = req.user?.church_id || 1;
    const memberId = parseInt(req.params.memberId);
    const weeks = req.query.weeks ? parseInt(req.query.weeks) : 4;

    const summary = await model.getSpiritualDisciplineSummary(churchId, memberId, weeks);
    res.json(summary);
  } catch (err) {
    return handleError(res, 'getSpiritualDisciplineSummaryHandler', err);
  }
}

export async function getMembersNeedingAttentionHandler(req, res) {
  try {
    const churchId = req.user?.church_id || 1;
    const members = await model.getMembersNeedingAttention(churchId);
    res.json(members);
  } catch (err) {
    return handleError(res, 'getMembersNeedingAttentionHandler', err);
  }
}

export async function getGrowthPlanProgressHandler(req, res) {
  try {
    const churchId = req.user?.church_id || 1;
    const memberId = parseInt(req.params.memberId);

    const progress = await model.getGrowthPlanProgress(churchId, memberId);
    res.json(progress);
  } catch (err) {
    return handleError(res, 'getGrowthPlanProgressHandler', err);
  }
}