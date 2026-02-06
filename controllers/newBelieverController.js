import * as model from '../models/newBelieverModel.js';
import * as memberModel from '../models/memberModel.js';
import { handleError } from '../utils/errorHandler.js';

// Create new believer journey
export async function createJourneyHandler(req, res) {
  try {
    const churchId = req.user?.church_id || 1;
    const member = await memberModel.getMemberByUserId(req.user.userId, churchId);
    const creatorId = member ? member.id : null;

    const journeyData = {
      ...req.body,
      church_id: churchId,
      created_by: creatorId
    };

    const journey = await model.createCellVisitorJourney(journeyData);
    res.status(201).json({
      message: 'New believer journey created successfully',
      journey
    });
  } catch (err) {
    return handleError(res, 'createJourneyHandler', err);
  }
}

// Get all journeys for church
export async function getJourneysHandler(req, res) {
  try {
    const churchId = req.user?.church_id || 1;
    const filters = {
      stage: req.query.stage,
      status: req.query.status,
      is_ntyaba: req.query.is_ntyaba === 'true' ? true : req.query.is_ntyaba === 'false' ? false : undefined,
      mentor_id: req.query.mentor_id,
      limit: req.query.limit ? parseInt(req.query.limit) : undefined
    };

    const journeys = await model.getCellVisitorJourneys(churchId, filters);
    res.json(journeys);
  } catch (err) {
    return handleError(res, 'getJourneysHandler', err);
  }
}

// Get specific journey
export async function getJourneyHandler(req, res) {
  try {
    const journeyId = parseInt(req.params.id);
    const churchId = req.user?.church_id || 1;

    const journey = await model.getCellVisitorJourneyById(journeyId, churchId);
    if (!journey) {
      return res.status(404).json({ message: 'New believer journey not found' });
    }

    res.json(journey);
  } catch (err) {
    return handleError(res, 'getJourneyHandler', err);
  }
}

// Update journey
export async function updateJourneyHandler(req, res) {
  try {
    const journeyId = parseInt(req.params.id);
    const churchId = req.user?.church_id || 1;
    const member = await memberModel.getMemberByUserId(req.user.userId, churchId);
    const updaterId = member ? member.id : null;

    const updateData = {
      ...req.body,
      updated_by: updaterId
    };

    const journey = await model.updateCellVisitorJourney(journeyId, churchId, updateData);
    if (!journey) {
      return res.status(404).json({ message: 'New believer journey not found' });
    }

    res.json({
      message: 'New believer journey updated successfully',
      journey
    });
  } catch (err) {
    return handleError(res, 'updateJourneyHandler', err);
  }
}

// Convert visitor to new believer
export async function convertVisitorHandler(req, res) {
  try {
    const visitorId = parseInt(req.params.visitorId);
    const churchId = req.user?.church_id || 1;
    const member = await memberModel.getMemberByUserId(req.user.userId, churchId);
    const creatorId = member ? member.id : null;

    const conversionData = {
      ...req.body,
      created_by: creatorId
    };

    const journey = await model.convertCellVisitorToChurchAttendee(visitorId, churchId, conversionData);
    res.status(201).json({
      message: 'Visitor converted to new believer successfully',
      journey
    });
  } catch (err) {
    return handleError(res, 'convertVisitorHandler', err);
  }
}

// NTYABA visit tracking
export async function createNtyabaVisitHandler(req, res) {
  try {
    const churchId = req.user?.church_id || 1;
    const member = await memberModel.getMemberByUserId(req.user.userId, churchId);
    const creatorId = member ? member.id : null;

    const visitData = {
      ...req.body,
      church_id: churchId,
      created_by: creatorId
    };

    const visit = await model.createNTYABAVisit(visitData);
    res.status(201).json({
      message: 'NTYABA visit recorded successfully',
      visit
    });
  } catch (err) {
    return handleError(res, 'createNtyabaVisitHandler', err);
  }
}

export async function getNtyabaVisitsHandler(req, res) {
  try {
    const journeyId = parseInt(req.params.journeyId);
    const visits = await model.getNTYABAVisits(journeyId);
    res.json(visits);
  } catch (err) {
    return handleError(res, 'getNtyabaVisitsHandler', err);
  }
}

// Session tracking
export async function createSessionHandler(req, res) {
  try {
    const member = await memberModel.getMemberByUserId(req.user.userId, req.user?.church_id || 1);
    const creatorId = member ? member.id : null;

    const sessionData = {
      ...req.body,
      created_by: creatorId
    };

    const session = await model.createCellVisitorSession(sessionData);
    res.status(201).json({
      message: 'New believer session recorded successfully',
      session
    });
  } catch (err) {
    return handleError(res, 'createSessionHandler', err);
  }
}

export async function getSessionsHandler(req, res) {
  try {
    const journeyId = parseInt(req.params.journeyId);
    const sessions = await model.getCellVisitorSessions(journeyId);
    res.json(sessions);
  } catch (err) {
    return handleError(res, 'getSessionsHandler', err);
  }
}

// Get stats
export async function getStatsHandler(req, res) {
  try {
    const churchId = req.user?.church_id || 1;
    const stats = await model.getCellVisitorStats(churchId);
    res.json(stats);
  } catch (err) {
    return handleError(res, 'getStatsHandler', err);
  }
}