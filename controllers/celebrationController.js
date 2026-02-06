import * as model from '../models/celebrationModel.js';
import * as memberModel from '../models/memberModel.js';
import { handleError } from '../utils/errorHandler.js';

// Celebrations & Events CRUD
export async function createCelebrationHandler(req, res) {
  try {
    const churchId = req.user?.church_id || 1;
    const member = await memberModel.getMemberByUserId(req.user.userId, churchId);
    const creatorId = member ? member.id : null;

    const celebrationData = {
      ...req.body,
      church_id: churchId,
      created_by: creatorId
    };

    const celebration = await model.createCelebrationEvent(celebrationData);
    res.status(201).json({
      message: 'Celebration event created successfully',
      celebration
    });
  } catch (err) {
    return handleError(res, 'createCelebrationHandler', err);
  }
}

export async function getCelebrationsHandler(req, res) {
  try {
    const churchId = req.user?.church_id || 1;
    const filters = {
      event_type: req.query.event_type,
      status: req.query.status,
      upcoming_only: req.query.upcoming_only === 'true',
      date_from: req.query.date_from,
      date_to: req.query.date_to,
      limit: req.query.limit ? parseInt(req.query.limit) : undefined
    };

    const celebrations = await model.getCelebrationEvents(churchId, filters);
    res.json(celebrations);
  } catch (err) {
    return handleError(res, 'getCelebrationsHandler', err);
  }
}

export async function getCelebrationHandler(req, res) {
  try {
    const celebrationId = parseInt(req.params.id);
    const churchId = req.user?.church_id || 1;

    const celebration = await model.getCelebrationEventById(celebrationId, churchId);
    if (!celebration) {
      return res.status(404).json({ message: 'Celebration event not found' });
    }

    res.json(celebration);
  } catch (err) {
    return handleError(res, 'getCelebrationHandler', err);
  }
}

export async function updateCelebrationHandler(req, res) {
  try {
    const celebrationId = parseInt(req.params.id);
    const churchId = req.user?.church_id || 1;

    const celebration = await model.updateCelebrationEvent(celebrationId, churchId, req.body);
    if (!celebration) {
      return res.status(404).json({ message: 'Celebration event not found' });
    }

    res.json({
      message: 'Celebration updated successfully',
      celebration
    });
  } catch (err) {
    return handleError(res, 'updateCelebrationHandler', err);
  }
}

// Special Dates Management
export async function createSpecialDateHandler(req, res) {
  try {
    const churchId = req.user?.church_id || 1;

    const specialDateData = {
      ...req.body,
      church_id: churchId
    };

    const specialDate = await model.createSpecialDate(specialDateData);
    res.status(201).json({
      message: 'Special date recorded successfully',
      specialDate
    });
  } catch (err) {
    return handleError(res, 'createSpecialDateHandler', err);
  }
}

export async function getSpecialDatesHandler(req, res) {
  try {
    const churchId = req.user?.church_id || 1;
    const filters = {
      date_type: req.query.date_type,
      upcoming_only: req.query.upcoming_only === 'true',
      month: req.query.month ? parseInt(req.query.month) : undefined
    };

    const specialDates = await model.getSpecialDates(churchId, filters);
    res.json(specialDates);
  } catch (err) {
    return handleError(res, 'getSpecialDatesHandler', err);
  }
}

export async function updateSpecialDateHandler(req, res) {
  try {
    const dateId = parseInt(req.params.id);

    const specialDate = await model.updateSpecialDate(dateId, req.body);
    if (!specialDate) {
      return res.status(404).json({ message: 'Special date not found' });
    }

    res.json({
      message: 'Special date updated successfully',
      specialDate
    });
  } catch (err) {
    return handleError(res, 'updateSpecialDateHandler', err);
  }
}

// Achievements Management
export async function createAchievementHandler(req, res) {
  try {
    const churchId = req.user?.church_id || 1;

    const achievementData = {
      ...req.body,
      church_id: churchId
    };

    const achievement = await model.createAchievement(achievementData);
    res.status(201).json({
      message: 'Achievement recorded successfully',
      achievement
    });
  } catch (err) {
    return handleError(res, 'createAchievementHandler', err);
  }
}

export async function getAchievementsHandler(req, res) {
  try {
    const churchId = req.user?.church_id || 1;
    const filters = {
      achievement_type: req.query.achievement_type,
      member_id: req.query.member_id ? parseInt(req.query.member_id) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit) : undefined
    };

    const achievements = await model.getAchievements(churchId, filters);
    res.json(achievements);
  } catch (err) {
    return handleError(res, 'getAchievementsHandler', err);
  }
}

// Analytics & Reporting
export async function getUpcomingCelebrationsHandler(req, res) {
  try {
    const churchId = req.user?.church_id || 1;
    const days = req.query.days ? parseInt(req.query.days) : 30;

    const celebrations = await model.getUpcomingCelebrations(churchId, days);
    res.json(celebrations);
  } catch (err) {
    return handleError(res, 'getUpcomingCelebrationsHandler', err);
  }
}

export async function getCelebrationStatsHandler(req, res) {
  try {
    const churchId = req.user?.church_id || 1;
    const stats = await model.getCelebrationStats(churchId);
    res.json(stats);
  } catch (err) {
    return handleError(res, 'getCelebrationStatsHandler', err);
  }
}