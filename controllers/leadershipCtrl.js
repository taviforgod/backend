import * as model from '../models/leadershipModel.js';

// Leadership Roles
export const createRole = async (req, res) => {
  const row = await model.addLeadershipRole({ ...req.body, church_id: req.user.church_id });
  res.status(201).json(row);
};
export const listRoles = async (req, res) => {
  const rows = await model.listLeadershipRoles(req.user.church_id);
  res.json(rows);
};

// Promotions
export const createPromotion = async (req, res) => {
  const row = await model.addPromotion({ ...req.body, church_id: req.user.church_id, created_by: req.user.id });
  res.status(201).json(row);
};

// Leadership Evaluations
export const createEvaluation = async (req, res) => {
  
  const row = await model.addEvaluation({
    ...req.body,
    church_id: req.user.church_id,
    evaluator_id: req.user.userId // <-- FIXED HERE
  });
  res.status(201).json(row);
};
export const listEvaluations = async (req, res) => {
  const rows = await model.listEvaluations(req.user.church_id, req.params.leaderId);
  res.json(rows);
};

// Leadership Alerts
export const createAlert = async (req, res) => {
  const row = await model.addAlert({ ...req.body, church_id: req.user.church_id });
  res.status(201).json(row);
};
export const listAlerts = async (req, res) => {
  const rows = await model.listAlerts(req.user.church_id);
  res.json(rows);
};

// Leadership Milestones
export const createMilestoneTemplate = async (req, res) => {
  const row = await model.addMilestoneTemplate({ ...req.body, church_id: req.user.church_id });
  res.status(201).json(row);
};
export const createMilestoneRecord = async (req, res) => {
  const row = await model.addMilestoneRecord({ ...req.body, church_id: req.user.church_id });
  res.status(201).json(row);
};
export const listMilestoneRecords = async (req, res) => {
  const rows = await model.listMilestoneRecords(req.user.church_id, req.params.memberId);
  res.json(rows);
};

// Leadership Exit Records
export const createExitRecord = async (req, res) => {
  const row = await model.addExitRecord({ ...req.body, church_id: req.user.church_id, created_by: req.user.id });
  res.status(201).json(row);
};