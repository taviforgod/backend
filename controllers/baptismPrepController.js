import * as model from '../models/baptismPrepModel.js';
import * as memberModel from '../models/memberModel.js';
import { handleError } from '../utils/errorHandler.js';

// Baptism Prep Checklist CRUD
export async function createChecklistItemHandler(req, res) {
  try {
    const churchId = req.user?.church_id || 1;
    const checklistData = {
      ...req.body,
      church_id: churchId
    };

    const item = await model.createChecklistItem(checklistData);
    res.status(201).json({
      message: 'Checklist item created successfully',
      item
    });
  } catch (err) {
    return handleError(res, 'createChecklistItemHandler', err);
  }
}

export async function getChecklistByCandidateHandler(req, res) {
  try {
    const candidateId = parseInt(req.params.candidateId);
    const checklist = await model.getChecklistByCandidate(candidateId);
    res.json(checklist);
  } catch (err) {
    return handleError(res, 'getChecklistByCandidateHandler', err);
  }
}

export async function updateChecklistItemHandler(req, res) {
  try {
    const itemId = parseInt(req.params.id);
    const item = await model.updateChecklistItem(itemId, req.body);
    if (!item) {
      return res.status(404).json({ message: 'Checklist item not found' });
    }

    res.json({
      message: 'Checklist item updated successfully',
      item
    });
  } catch (err) {
    return handleError(res, 'updateChecklistItemHandler', err);
  }
}

// Initialize checklist for new candidate
export async function initializeChecklistHandler(req, res) {
  try {
    const candidateId = parseInt(req.params.candidateId);
    const churchId = req.user?.church_id || 1;

    const checklistItems = await model.initializeChecklistForCandidate(candidateId, churchId);
    res.json({
      message: `${checklistItems.length} checklist items initialized`,
      checklistItems
    });
  } catch (err) {
    return handleError(res, 'initializeChecklistHandler', err);
  }
}

export async function getChecklistProgressHandler(req, res) {
  try {
    const candidateId = parseInt(req.params.candidateId);
    const progress = await model.getChecklistProgress(candidateId);
    res.json(progress);
  } catch (err) {
    return handleError(res, 'getChecklistProgressHandler', err);
  }
}

// Baptism Prep Sessions CRUD
export async function createPrepSessionHandler(req, res) {
  try {
    const churchId = req.user?.church_id || 1;
    const member = await memberModel.getMemberByUserId(req.user.userId, churchId);
    const creatorId = member ? member.id : null;

    const sessionData = {
      ...req.body,
      church_id: churchId,
      created_by: creatorId
    };

    const session = await model.createPrepSession(sessionData);
    res.status(201).json({
      message: 'Baptism preparation session created successfully',
      session
    });
  } catch (err) {
    return handleError(res, 'createPrepSessionHandler', err);
  }
}

export async function getPrepSessionsByCandidateHandler(req, res) {
  try {
    const candidateId = parseInt(req.params.candidateId);
    const sessions = await model.getPrepSessionsByCandidate(candidateId);
    res.json(sessions);
  } catch (err) {
    return handleError(res, 'getPrepSessionsByCandidateHandler', err);
  }
}

export async function updatePrepSessionHandler(req, res) {
  try {
    const sessionId = parseInt(req.params.id);
    const session = await model.updatePrepSession(sessionId, req.body);
    if (!session) {
      return res.status(404).json({ message: 'Prep session not found' });
    }

    res.json({
      message: 'Prep session updated successfully',
      session
    });
  } catch (err) {
    return handleError(res, 'updatePrepSessionHandler', err);
  }
}

// Analytics & Reporting
export async function getUpcomingPrepSessionsHandler(req, res) {
  try {
    const churchId = req.user?.church_id || 1;
    const limit = req.query.limit ? parseInt(req.query.limit) : 10;

    const sessions = await model.getUpcomingPrepSessions(churchId, limit);
    res.json(sessions);
  } catch (err) {
    return handleError(res, 'getUpcomingPrepSessionsHandler', err);
  }
}

export async function getCandidatesReadyForBaptismHandler(req, res) {
  try {
    const churchId = req.user?.church_id || 1;
    const candidates = await model.getCandidatesReadyForBaptism(churchId);
    res.json(candidates);
  } catch (err) {
    return handleError(res, 'getCandidatesReadyForBaptismHandler', err);
  }
}