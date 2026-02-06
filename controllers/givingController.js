import * as model from '../models/givingModel.js';
import * as memberModel from '../models/memberModel.js';
import { handleError } from '../utils/errorHandler.js';

// Giving Log CRUD
export async function createGivingRecordHandler(req, res) {
  try {
    const churchId = req.user?.church_id || 1;
    const member = await memberModel.getMemberByUserId(req.user.userId, churchId);
    const recorderId = member ? member.id : null;

    const givingData = {
      ...req.body,
      church_id: churchId,
      recorded_by: recorderId
    };

    const record = await model.createGivingRecord(givingData);
    res.status(201).json({
      message: 'Giving record created successfully',
      record
    });
  } catch (err) {
    return handleError(res, 'createGivingRecordHandler', err);
  }
}

export async function getGivingRecordsHandler(req, res) {
  try {
    const churchId = req.user?.church_id || 1;
    const filters = {
      giving_type: req.query.giving_type,
      member_id: req.query.member_id ? parseInt(req.query.member_id) : undefined,
      date_from: req.query.date_from,
      date_to: req.query.date_to,
      cell_group_id: req.query.cell_group_id ? parseInt(req.query.cell_group_id) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit) : undefined
    };

    const records = await model.getGivingRecords(churchId, filters);
    res.json(records);
  } catch (err) {
    return handleError(res, 'getGivingRecordsHandler', err);
  }
}

export async function updateGivingRecordHandler(req, res) {
  try {
    const recordId = parseInt(req.params.id);
    const churchId = req.user?.church_id || 1;

    const record = await model.updateGivingRecord(recordId, churchId, req.body);
    if (!record) {
      return res.status(404).json({ message: 'Giving record not found' });
    }

    res.json({
      message: 'Giving record updated successfully',
      record
    });
  } catch (err) {
    return handleError(res, 'updateGivingRecordHandler', err);
  }
}

// Analytics & Reporting
export async function getMemberGivingSummaryHandler(req, res) {
  try {
    const memberId = parseInt(req.params.memberId);
    const churchId = req.user?.church_id || 1;
    const year = req.query.year ? parseInt(req.query.year) : null;

    const summary = await model.getMemberGivingSummary(memberId, churchId, year);
    res.json(summary);
  } catch (err) {
    return handleError(res, 'getMemberGivingSummaryHandler', err);
  }
}

export async function getGivingAnalyticsHandler(req, res) {
  try {
    const churchId = req.user?.church_id || 1;
    const dateRange = {
      start_date: req.query.start_date,
      end_date: req.query.end_date
    };

    const analytics = await model.getGivingAnalytics(churchId, dateRange);
    res.json(analytics);
  } catch (err) {
    return handleError(res, 'getGivingAnalyticsHandler', err);
  }
}

export async function getGivingByTypeHandler(req, res) {
  try {
    const churchId = req.user?.church_id || 1;
    const dateRange = {
      start_date: req.query.start_date,
      end_date: req.query.end_date
    };

    const breakdown = await model.getGivingByType(churchId, dateRange);
    res.json(breakdown);
  } catch (err) {
    return handleError(res, 'getGivingByTypeHandler', err);
  }
}

export async function getGivingTrendsHandler(req, res) {
  try {
    const churchId = req.user?.church_id || 1;
    const months = req.query.months ? parseInt(req.query.months) : 12;

    const trends = await model.getGivingTrends(churchId, months);
    res.json(trends);
  } catch (err) {
    return handleError(res, 'getGivingTrendsHandler', err);
  }
}