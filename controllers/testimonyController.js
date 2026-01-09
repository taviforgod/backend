import * as model from '../models/testimonyModel.js';
import * as memberModel from '../models/memberModel.js';
import { handleError } from '../utils/errorHandler.js';

// Testimony CRUD
export async function createTestimonyHandler(req, res) {
  try {
    const churchId = req.user?.church_id || 1;
    const member = await memberModel.getMemberByUserId(req.user.userId, churchId);
    const recorderId = member ? member.id : null;

    const testimonyData = {
      ...req.body,
      church_id: churchId,
      recorded_by: recorderId
    };

    const testimony = await model.createTestimony(testimonyData);
    res.status(201).json({
      message: 'Testimony recorded successfully',
      testimony
    });
  } catch (err) {
    return handleError(res, 'createTestimonyHandler', err);
  }
}

export async function getTestimoniesHandler(req, res) {
  try {
    const churchId = req.user?.church_id || 1;
    const filters = {
      testimony_type: req.query.testimony_type,
      is_approved: req.query.is_approved === 'true' ? true : (req.query.is_approved === 'false' ? false : undefined),
      is_published: req.query.is_published === 'true' ? true : (req.query.is_published === 'false' ? false : undefined),
      member_id: req.query.member_id ? parseInt(req.query.member_id) : undefined,
      date_from: req.query.date_from,
      date_to: req.query.date_to,
      limit: req.query.limit ? parseInt(req.query.limit) : undefined
    };

    const testimonies = await model.getTestimonies(churchId, filters);
    res.json(testimonies);
  } catch (err) {
    return handleError(res, 'getTestimoniesHandler', err);
  }
}

export async function getTestimonyHandler(req, res) {
  try {
    const testimonyId = parseInt(req.params.id);
    const churchId = req.user?.church_id || 1;

    const testimony = await model.getTestimonyById(testimonyId, churchId);
    if (!testimony) {
      return res.status(404).json({ message: 'Testimony not found' });
    }

    res.json(testimony);
  } catch (err) {
    return handleError(res, 'getTestimonyHandler', err);
  }
}

export async function updateTestimonyHandler(req, res) {
  try {
    const testimonyId = parseInt(req.params.id);
    const churchId = req.user?.church_id || 1;

    const testimony = await model.updateTestimony(testimonyId, churchId, req.body);
    if (!testimony) {
      return res.status(404).json({ message: 'Testimony not found' });
    }

    res.json({
      message: 'Testimony updated successfully',
      testimony
    });
  } catch (err) {
    return handleError(res, 'updateTestimonyHandler', err);
  }
}

// Approval and Publishing
export async function approveTestimonyHandler(req, res) {
  try {
    const testimonyId = parseInt(req.params.id);
    const churchId = req.user?.church_id || 1;
    const member = await memberModel.getMemberByUserId(req.user.userId, churchId);

    if (!member) {
      return res.status(403).json({ message: 'Member profile required for approval' });
    }

    const testimony = await model.approveTestimony(testimonyId, churchId, member.id);
    if (!testimony) {
      return res.status(404).json({ message: 'Testimony not found' });
    }

    res.json({
      message: 'Testimony approved successfully',
      testimony
    });
  } catch (err) {
    return handleError(res, 'approveTestimonyHandler', err);
  }
}

export async function publishTestimonyHandler(req, res) {
  try {
    const testimonyId = parseInt(req.params.id);
    const churchId = req.user?.church_id || 1;

    const testimony = await model.publishTestimony(testimonyId, churchId);
    if (!testimony) {
      return res.status(404).json({ message: 'Testimony not found' });
    }

    res.json({
      message: 'Testimony published successfully',
      testimony
    });
  } catch (err) {
    return handleError(res, 'publishTestimonyHandler', err);
  }
}

// Analytics & Reporting
export async function getTestimonyStatsHandler(req, res) {
  try {
    const churchId = req.user?.church_id || 1;
    const stats = await model.getTestimonyStats(churchId);
    res.json(stats);
  } catch (err) {
    return handleError(res, 'getTestimonyStatsHandler', err);
  }
}

export async function getTestimoniesByTypeHandler(req, res) {
  try {
    const churchId = req.user?.church_id || 1;
    const typeBreakdown = await model.getTestimoniesByType(churchId);
    res.json(typeBreakdown);
  } catch (err) {
    return handleError(res, 'getTestimoniesByTypeHandler', err);
  }
}

export async function getPublishedTestimoniesHandler(req, res) {
  try {
    const churchId = req.user?.church_id || 1;
    const limit = req.query.limit ? parseInt(req.query.limit) : 10;

    const testimonies = await model.getPublishedTestimonies(churchId, limit);
    res.json(testimonies);
  } catch (err) {
    return handleError(res, 'getPublishedTestimoniesHandler', err);
  }
}

export async function getTestimoniesNeedingFollowupHandler(req, res) {
  try {
    const churchId = req.user?.church_id || 1;
    const testimonies = await model.getTestimoniesNeedingFollowup(churchId);
    res.json(testimonies);
  } catch (err) {
    return handleError(res, 'getTestimoniesNeedingFollowupHandler', err);
  }
}