import * as model from '../models/conflictModel.js';
import * as memberModel from '../models/memberModel.js';
import { handleError } from '../utils/errorHandler.js';

// Conflict Management CRUD
export async function createConflictHandler(req, res) {
  try {
    const churchId = req.user?.church_id || 1;
    const member = await memberModel.getMemberByUserId(req.user.userId, churchId);
    const reporterId = member ? member.id : null;

    const conflictData = {
      ...req.body,
      church_id: churchId,
      reported_by: reporterId
    };

    const conflict = await model.createConflictLog(conflictData);
    res.status(201).json({
      message: 'Conflict logged successfully',
      conflict
    });
  } catch (err) {
    return handleError(res, 'createConflictHandler', err);
  }
}

export async function getConflictsHandler(req, res) {
  try {
    const churchId = req.user?.church_id || 1;
    const filters = {
      status: req.query.status,
      severity: req.query.severity,
      conflict_type: req.query.conflict_type,
      limit: req.query.limit ? parseInt(req.query.limit) : undefined
    };

    const conflicts = await model.getConflictLogs(churchId, filters);
    res.json(conflicts);
  } catch (err) {
    return handleError(res, 'getConflictsHandler', err);
  }
}

export async function getConflictHandler(req, res) {
  try {
    const conflictId = parseInt(req.params.id);
    const churchId = req.user?.church_id || 1;

    const conflict = await model.getConflictLogById(conflictId, churchId);
    if (!conflict) {
      return res.status(404).json({ message: 'Conflict not found' });
    }

    // Get conflict actions
    const actions = await model.getConflictActions(conflictId);
    conflict.actions = actions;

    res.json(conflict);
  } catch (err) {
    return handleError(res, 'getConflictHandler', err);
  }
}

export async function updateConflictHandler(req, res) {
  try {
    const conflictId = parseInt(req.params.id);
    const churchId = req.user?.church_id || 1;

    const conflict = await model.updateConflictLog(conflictId, churchId, req.body);
    if (!conflict) {
      return res.status(404).json({ message: 'Conflict not found' });
    }

    res.json({
      message: 'Conflict updated successfully',
      conflict
    });
  } catch (err) {
    return handleError(res, 'updateConflictHandler', err);
  }
}

// Conflict Actions
export async function createConflictActionHandler(req, res) {
  try {
    const actionData = req.body;
    const action = await model.createConflictAction(actionData);
    res.status(201).json({
      message: 'Conflict action recorded successfully',
      action
    });
  } catch (err) {
    return handleError(res, 'createConflictActionHandler', err);
  }
}

export async function getConflictActionsHandler(req, res) {
  try {
    const conflictId = parseInt(req.params.conflictId);
    const actions = await model.getConflictActions(conflictId);
    res.json(actions);
  } catch (err) {
    return handleError(res, 'getConflictActionsHandler', err);
  }
}

// Analytics & Reporting
export async function getConflictStatsHandler(req, res) {
  try {
    const churchId = req.user?.church_id || 1;
    const stats = await model.getConflictStats(churchId);
    res.json(stats);
  } catch (err) {
    return handleError(res, 'getConflictStatsHandler', err);
  }
}

export async function getActiveConflictsHandler(req, res) {
  try {
    const churchId = req.user?.church_id || 1;
    const limit = req.query.limit ? parseInt(req.query.limit) : 10;

    const conflicts = await model.getActiveConflicts(churchId, limit);
    res.json(conflicts);
  } catch (err) {
    return handleError(res, 'getActiveConflictsHandler', err);
  }
}