import * as model from '../models/cellGrowthModel.js';
import * as memberModel from '../models/memberModel.js';
import { handleError } from '../utils/errorHandler.js';

// Cell Performance Metrics CRUD
export async function createPerformanceMetricsHandler(req, res) {
  try {
    const churchId = req.user?.church_id || 1;
    const member = await memberModel.getMemberByUserId(req.user.userId, churchId);
    const recorderId = member ? member.id : null;

    const metricsData = {
      ...req.body,
      church_id: churchId,
      recorded_by: recorderId
    };

    const metrics = await model.createPerformanceMetrics(metricsData);
    res.status(201).json({
      message: 'Cell performance metrics recorded successfully',
      metrics
    });
  } catch (err) {
    return handleError(res, 'createPerformanceMetricsHandler', err);
  }
}

export async function getPerformanceMetricsHandler(req, res) {
  try {
    const churchId = req.user?.church_id || 1;
    const filters = {
      cell_group_id: req.query.cell_group_id ? parseInt(req.query.cell_group_id) : undefined,
      date_from: req.query.date_from,
      date_to: req.query.date_to,
      limit: req.query.limit ? parseInt(req.query.limit) : undefined
    };

    const metrics = await model.getPerformanceMetrics(churchId, filters);
    res.json(metrics);
  } catch (err) {
    return handleError(res, 'getPerformanceMetricsHandler', err);
  }
}

// Cell Health Assessments CRUD
export async function createHealthAssessmentHandler(req, res) {
  try {
    const churchId = req.user?.church_id || 1;
    const member = await memberModel.getMemberByUserId(req.user.userId, churchId);
    const assessorId = member ? member.id : null;

    const assessmentData = {
      ...req.body,
      church_id: churchId,
      assessed_by: assessorId
    };

    const assessment = await model.createHealthAssessment(assessmentData);
    res.status(201).json({
      message: 'Cell health assessment completed successfully',
      assessment
    });
  } catch (err) {
    return handleError(res, 'createHealthAssessmentHandler', err);
  }
}

export async function getHealthAssessmentsHandler(req, res) {
  try {
    const churchId = req.user?.church_id || 1;
    const filters = {
      cell_group_id: req.query.cell_group_id ? parseInt(req.query.cell_group_id) : undefined,
      wbs_stage: req.query.wbs_stage,
      limit: req.query.limit ? parseInt(req.query.limit) : undefined
    };

    const assessments = await model.getHealthAssessments(churchId, filters);
    res.json(assessments);
  } catch (err) {
    return handleError(res, 'getHealthAssessmentsHandler', err);
  }
}

// Leadership Pipeline CRUD
export async function createLeadershipEntryHandler(req, res) {
  try {
    const churchId = req.user?.church_id || 1;
    const member = await memberModel.getMemberByUserId(req.user.userId, churchId);
    const identifierId = member ? member.id : null;

    const leadershipData = {
      ...req.body,
      church_id: churchId,
      identified_by: identifierId
    };

    const entry = await model.createLeadershipEntry(leadershipData);
    res.status(201).json({
      message: 'Leadership pipeline entry created successfully',
      entry
    });
  } catch (err) {
    return handleError(res, 'createLeadershipEntryHandler', err);
  }
}

export async function getLeadershipPipelineHandler(req, res) {
  try {
    const churchId = req.user?.church_id || 1;
    const filters = {
      development_stage: req.query.development_stage,
      ready_for_multiplication: req.query.ready_for_multiplication === 'true' ? true :
                               (req.query.ready_for_multiplication === 'false' ? false : undefined)
    };

    const pipeline = await model.getLeadershipPipeline(churchId, filters);
    res.json(pipeline);
  } catch (err) {
    return handleError(res, 'getLeadershipPipelineHandler', err);
  }
}

// Cell Multiplication Planning CRUD
export async function createMultiplicationPlanHandler(req, res) {
  try {
    const churchId = req.user?.church_id || 1;
    const member = await memberModel.getMemberByUserId(req.user.userId, churchId);
    const coordinatorId = member ? member.id : null;

    const planData = {
      ...req.body,
      church_id: churchId,
      coordinator: coordinatorId
    };

    const plan = await model.createMultiplicationPlan(planData);
    res.status(201).json({
      message: 'Cell multiplication plan created successfully',
      plan
    });
  } catch (err) {
    return handleError(res, 'createMultiplicationPlanHandler', err);
  }
}

export async function getMultiplicationPlansHandler(req, res) {
  try {
    const churchId = req.user?.church_id || 1;
    const filters = {
      status: req.query.status,
      parent_cell_id: req.query.parent_cell_id ? parseInt(req.query.parent_cell_id) : undefined
    };

    const plans = await model.getMultiplicationPlans(churchId, filters);
    res.json(plans);
  } catch (err) {
    return handleError(res, 'getMultiplicationPlansHandler', err);
  }
}

// Growth Targets CRUD
export async function createGrowthTargetHandler(req, res) {
  try {
    const churchId = req.user?.church_id || 1;
    const member = await memberModel.getMemberByUserId(req.user.userId, churchId);
    const setterId = member ? member.id : null;

    const targetData = {
      ...req.body,
      church_id: churchId,
      set_by: setterId
    };

    const target = await model.createGrowthTarget(targetData);
    res.status(201).json({
      message: 'Growth target set successfully',
      target
    });
  } catch (err) {
    return handleError(res, 'createGrowthTargetHandler', err);
  }
}

export async function getGrowthTargetsHandler(req, res) {
  try {
    const churchId = req.user?.church_id || 1;
    const filters = {
      target_year: req.query.target_year ? parseInt(req.query.target_year) : undefined,
      target_period: req.query.target_period
    };

    const targets = await model.getGrowthTargets(churchId, filters);
    res.json(targets);
  } catch (err) {
    return handleError(res, 'getGrowthTargetsHandler', err);
  }
}

// Analytics & Reporting
export async function getCellGrowthAnalyticsHandler(req, res) {
  try {
    const churchId = req.user?.church_id || 1;
    const dateRange = {
      start_date: req.query.start_date,
      end_date: req.query.end_date
    };

    const analytics = await model.getCellGrowthAnalytics(churchId, dateRange);
    res.json(analytics);
  } catch (err) {
    return handleError(res, 'getCellGrowthAnalyticsHandler', err);
  }
}

export async function getLeadershipDevelopmentStatsHandler(req, res) {
  try {
    const churchId = req.user?.church_id || 1;
    const stats = await model.getLeadershipDevelopmentStats(churchId);
    res.json(stats);
  } catch (err) {
    return handleError(res, 'getLeadershipDevelopmentStatsHandler', err);
  }
}

export async function getMultiplicationSuccessRateHandler(req, res) {
  try {
    const churchId = req.user?.church_id || 1;
    const successRate = await model.getMultiplicationSuccessRate(churchId);
    res.json(successRate);
  } catch (err) {
    return handleError(res, 'getMultiplicationSuccessRateHandler', err);
  }
}

export async function getCellsNeedingAttentionHandler(req, res) {
  try {
    const churchId = req.user?.church_id || 1;
    const cells = await model.getCellsNeedingAttention(churchId);
    res.json(cells);
  } catch (err) {
    return handleError(res, 'getCellsNeedingAttentionHandler', err);
  }
}