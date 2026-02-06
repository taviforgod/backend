import {
  getFoundationClasses,
  getFoundationEnrollments,
  enrollMemberInClass,
  updateEnrollmentProgress,
  addSessionAttendance,
  getEnrollmentSessions,
  getFoundationSchoolStats
} from '../models/foundationSchoolModel.js';
import { getMemberByUserId } from '../models/memberModel.js';
import { handleError } from '../utils/errorHandler.js';

// Get all foundation classes
export async function getFoundationClassesHandler(req, res) {
  try {
    const churchId = req.user?.church_id || 1;
    const classes = await getFoundationClasses(churchId);
    res.json(classes);
  } catch (err) {
    return handleError(res, 'getFoundationClassesHandler', err);
  }
}

// Get foundation enrollments
export async function getFoundationEnrollmentsHandler(req, res) {
  try {
    const churchId = req.user?.church_id || 1;
    const filters = {
      member_id: req.query.member_id ? parseInt(req.query.member_id) : null,
      class_id: req.query.class_id ? parseInt(req.query.class_id) : null,
      status: req.query.status,
      limit: req.query.limit ? parseInt(req.query.limit) : null
    };

    const enrollments = await getFoundationEnrollments(churchId, filters);
    res.json(enrollments);
  } catch (err) {
    return handleError(res, 'getFoundationEnrollmentsHandler', err);
  }
}

// Enroll member in foundation class
export async function enrollMemberHandler(req, res) {
  try {
    const churchId = req.user?.church_id || 1;
    const member = await getMemberByUserId(req.user.userId, churchId);
    const creatorId = member ? member.id : null;

    const enrollmentData = {
      ...req.body,
      church_id: churchId,
      created_by: creatorId
    };

    const enrollment = await enrollMemberInClass(enrollmentData);
    res.status(201).json({
      message: 'Member enrolled in foundation class successfully',
      enrollment
    });
  } catch (err) {
    return handleError(res, 'enrollMemberHandler', err);
  }
}

// Update enrollment progress
export async function updateEnrollmentHandler(req, res) {
  try {
    const enrollmentId = parseInt(req.params.id);
    if (!enrollmentId) return res.status(400).json({ error: 'Invalid enrollment ID' });

    const churchId = req.user?.church_id || 1;
    const member = await getMemberByUserId(req.user.userId, churchId);
    const updaterId = member ? member.id : null;

    const updateData = {
      ...req.body,
      updated_by: updaterId
    };

    const enrollment = await updateEnrollmentProgress(enrollmentId, updateData);
    if (!enrollment) return res.status(404).json({ error: 'Enrollment not found' });

    res.json({
      message: 'Enrollment progress updated successfully',
      enrollment
    });
  } catch (err) {
    if (err.code === 'FOUNDATION_COMPLETED_LOCK') {
      return res.status(409).json({ error: 'Enrollment is completed and locked' });
    }
    return handleError(res, 'updateEnrollmentHandler', err);
  }
}

// Add session attendance
export async function addSessionAttendanceHandler(req, res) {
  try {
    const churchId = req.user?.church_id || 1;
    const member = await getMemberByUserId(req.user.userId, churchId);
    const creatorId = member ? member.id : null;

    const sessionData = {
      ...req.body,
      created_by: creatorId
    };

    const session = await addSessionAttendance(sessionData);
    res.status(201).json({
      message: 'Session attendance recorded successfully',
      session
    });
  } catch (err) {
    return handleError(res, 'addSessionAttendanceHandler', err);
  }
}

// Get enrollment sessions
export async function getEnrollmentSessionsHandler(req, res) {
  try {
    const enrollmentId = parseInt(req.params.enrollmentId);
    if (!enrollmentId) return res.status(400).json({ error: 'Invalid enrollment ID' });

    const sessions = await getEnrollmentSessions(enrollmentId);
    res.json(sessions);
  } catch (err) {
    return handleError(res, 'getEnrollmentSessionsHandler', err);
  }
}

// Get foundation school statistics
export async function getFoundationSchoolStatsHandler(req, res) {
  try {
    const churchId = req.user?.church_id || 1;
    const stats = await getFoundationSchoolStats(churchId);
    res.json(stats);
  } catch (err) {
    return handleError(res, 'getFoundationSchoolStatsHandler', err);
  }
}
