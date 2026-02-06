import * as model from '../models/baptismModel.js';
import * as memberModel from '../models/memberModel.js';
import { handleError } from '../utils/errorHandler.js';

// Baptism Candidates CRUD
export async function createCandidateHandler(req, res) {
  try {
    const churchId = req.user?.church_id || 1;
    const member = await memberModel.getMemberByUserId(req.user.userId, churchId);
    const creatorId = member ? member.id : null;

    // Convert empty strings to null for integer fields
    const candidateData = {
      ...req.body,
      church_id: churchId,
      created_by: creatorId,
      // Integer fields - convert empty strings to null
      member_id: req.body.member_id ? parseInt(req.body.member_id) : null,
      visitor_id: req.body.visitor_id ? parseInt(req.body.visitor_id) : null,
      sponsor_1_id: req.body.sponsor_1_id ? parseInt(req.body.sponsor_1_id) : null,
      sponsor_2_id: req.body.sponsor_2_id ? parseInt(req.body.sponsor_2_id) : null,
      counselor_id: req.body.counselor_id ? parseInt(req.body.counselor_id) : null,
      age: req.body.age ? parseInt(req.body.age) : null
    };

    const candidate = await model.createBaptismCandidate(candidateData);
    res.status(201).json({
      message: 'Baptism candidate created successfully',
      candidate
    });
  } catch (err) {
    return handleError(res, 'createCandidateHandler', err);
  }
}

export async function getCandidatesHandler(req, res) {
  try {
    const churchId = req.user?.church_id || 1;
    const filters = {
      status: req.query.status,
      baptism_type: req.query.baptism_type,
      counseling_completed: req.query.counseling_completed === 'true' ? true :
                           req.query.counseling_completed === 'false' ? false : undefined,
      limit: req.query.limit ? parseInt(req.query.limit) : undefined
    };

    const candidates = await model.getBaptismCandidates(churchId, filters);
    res.json(candidates);
  } catch (err) {
    return handleError(res, 'getCandidatesHandler', err);
  }
}

export async function getCandidateHandler(req, res) {
  try {
    const candidateId = parseInt(req.params.id);
    const churchId = req.user?.church_id || 1;

    const candidate = await model.getBaptismCandidateById(candidateId, churchId);
    if (!candidate) {
      return res.status(404).json({ message: 'Baptism candidate not found' });
    }

    res.json(candidate);
  } catch (err) {
    return handleError(res, 'getCandidateHandler', err);
  }
}

export async function updateCandidateHandler(req, res) {
  try {
    const candidateId = parseInt(req.params.id);
    const churchId = req.user?.church_id || 1;
    const member = await memberModel.getMemberByUserId(req.user.userId, churchId);
    const updaterId = member ? member.id : null;

    // Convert empty strings to null for integer fields
    const updateData = {
      ...req.body,
      updated_by: updaterId,
      // Integer fields - convert empty strings to null
      member_id: req.body.member_id ? parseInt(req.body.member_id) : null,
      visitor_id: req.body.visitor_id ? parseInt(req.body.visitor_id) : null,
      sponsor_1_id: req.body.sponsor_1_id ? parseInt(req.body.sponsor_1_id) : null,
      sponsor_2_id: req.body.sponsor_2_id ? parseInt(req.body.sponsor_2_id) : null,
      counselor_id: req.body.counselor_id ? parseInt(req.body.counselor_id) : null,
      age: req.body.age ? parseInt(req.body.age) : null
    };

    const candidate = await model.updateBaptismCandidate(candidateId, churchId, updateData);
    if (!candidate) {
      return res.status(404).json({ message: 'Baptism candidate not found' });
    }

    res.json({
      message: 'Candidate updated successfully',
      candidate
    });
  } catch (err) {
    return handleError(res, 'updateCandidateHandler', err);
  }
}

// Baptism Records
export async function createRecordHandler(req, res) {
  try {
    const churchId = req.user?.church_id || 1;
    const member = await memberModel.getMemberByUserId(req.user.userId, churchId);
    const creatorId = member ? member.id : null;

    // Convert empty strings to null for integer fields
    const recordData = {
      ...req.body,
      church_id: churchId,
      created_by: creatorId,
      // Integer fields - convert empty strings to null
      candidate_id: req.body.candidate_id ? parseInt(req.body.candidate_id) : null,
      location_id: req.body.location_id ? parseInt(req.body.location_id) : null
    };

    const record = await model.createBaptismRecord(recordData);
    res.status(201).json({
      message: 'Baptism record created successfully',
      record
    });
  } catch (err) {
    return handleError(res, 'createRecordHandler', err);
  }
}

export async function getRecordsHandler(req, res) {
  try {
    const churchId = req.user?.church_id || 1;
    const filters = {
      date_from: req.query.date_from,
      date_to: req.query.date_to,
      limit: req.query.limit ? parseInt(req.query.limit) : undefined
    };

    const records = await model.getBaptismRecords(churchId, filters);
    res.json(records);
  } catch (err) {
    return handleError(res, 'getRecordsHandler', err);
  }
}

export async function getRecordHandler(req, res) {
  try {
    const recordId = parseInt(req.params.id);
    const churchId = req.user?.church_id || 1;

    const record = await model.getBaptismRecordById(recordId, churchId);
    if (!record) {
      return res.status(404).json({ message: 'Baptism record not found' });
    }

    res.json(record);
  } catch (err) {
    return handleError(res, 'getRecordHandler', err);
  }
}

// Perform Baptism
export async function performBaptismHandler(req, res) {
  try {
    const candidateId = parseInt(req.params.candidateId);
    const churchId = req.user?.church_id || 1;

    // Convert empty strings to null for integer fields
    const baptismData = {
      ...req.body,
      location_id: req.body.location_id ? parseInt(req.body.location_id) : null
    };
    const record = await model.performBaptism(candidateId, churchId, baptismData);

    // If the candidate is already a member, update their member record
    if (record.candidate_member_id) {
      const memberModel = (await import('../models/memberModel.js')).default;
      await memberModel.updateMember(record.candidate_member_id, {
        date_baptized_immersion: baptismData.baptism_date,
        baptized_in_christ_embassy: true
      }, churchId);
    }

    res.status(201).json({
      message: 'Baptism performed successfully',
      record
    });
  } catch (err) {
    return handleError(res, 'performBaptismHandler', err);
  }
}

// Analytics & Reporting
export async function getBaptismStatsHandler(req, res) {
  try {
    const churchId = req.user?.church_id || 1;
    const stats = await model.getBaptismStats(churchId);
    res.json(stats);
  } catch (err) {
    return handleError(res, 'getBaptismStatsHandler', err);
  }
}

export async function getUpcomingBaptismsHandler(req, res) {
  try {
    const churchId = req.user?.church_id || 1;
    const limit = req.query.limit ? parseInt(req.query.limit) : 10;

    const baptisms = await model.getUpcomingBaptisms(churchId, limit);
    res.json(baptisms);
  } catch (err) {
    return handleError(res, 'getUpcomingBaptismsHandler', err);
  }
}