import * as model from '../models/foundationSchoolProgressModel.js';
import * as memberModel from '../models/memberModel.js';
import { handleError } from '../utils/errorHandler.js';

// Foundation School Progress CRUD
export async function createProgressEntryHandler(req, res) {
  try {
    const churchId = req.user?.church_id || 1;
    const member = await memberModel.getMemberByUserId(req.user.userId, churchId);
    const creatorId = member ? member.id : null;

    const progressData = {
      ...req.body,
      church_id: churchId,
      created_by: creatorId
    };

    const progressEntry = await model.createProgressEntry(progressData);
    res.status(201).json({
      message: 'Foundation school progress entry created successfully',
      progressEntry
    });
  } catch (err) {
    return handleError(res, 'createProgressEntryHandler', err);
  }
}

export async function getProgressByEnrollmentHandler(req, res) {
  try {
    const enrollmentId = parseInt(req.params.enrollmentId);
    const progress = await model.getProgressByEnrollment(enrollmentId);
    res.json(progress);
  } catch (err) {
    return handleError(res, 'getProgressByEnrollmentHandler', err);
  }
}

export async function updateProgressEntryHandler(req, res) {
  try {
    const progressId = parseInt(req.params.id);
    const progressEntry = await model.updateProgressEntry(progressId, req.body);
    if (!progressEntry) {
      return res.status(404).json({ message: 'Progress entry not found' });
    }

    res.json({
      message: 'Progress entry updated successfully',
      progressEntry
    });
  } catch (err) {
    return handleError(res, 'updateProgressEntryHandler', err);
  }
}

export async function getModuleProgressHandler(req, res) {
  try {
    const enrollmentId = parseInt(req.params.enrollmentId);
    const moduleNumber = parseInt(req.params.moduleNumber);

    const progress = await model.getModuleProgress(enrollmentId, moduleNumber);
    if (!progress) {
      return res.status(404).json({ message: 'Progress entry not found' });
    }

    res.json(progress);
  } catch (err) {
    return handleError(res, 'getModuleProgressHandler', err);
  }
}

// Initialize progress for new enrollment
export async function initializeProgressHandler(req, res) {
  try {
    const enrollmentId = parseInt(req.params.enrollmentId);
    const churchId = req.user?.church_id || 1;

    const progressEntries = await model.initializeStudentProgress(enrollmentId, churchId);
    res.json({
      message: `${progressEntries.length} progress entries initialized`,
      progressEntries
    });
  } catch (err) {
    return handleError(res, 'initializeProgressHandler', err);
  }
}

export async function getProgressSummaryHandler(req, res) {
  try {
    const enrollmentId = parseInt(req.params.enrollmentId);
    const summary = await model.getStudentProgressSummary(enrollmentId);
    res.json(summary);
  } catch (err) {
    return handleError(res, 'getProgressSummaryHandler', err);
  }
}

// Foundation School Modules CRUD
export async function getFoundationModulesHandler(req, res) {
  try {
    const churchId = req.user?.church_id || 1;
    const level = req.query.level ? parseInt(req.query.level) : null;

    const modules = await model.getFoundationModules(churchId, level);
    res.json(modules);
  } catch (err) {
    return handleError(res, 'getFoundationModulesHandler', err);
  }
}

export async function createFoundationModuleHandler(req, res) {
  try {
    const churchId = req.user?.church_id || 1;
    const member = await memberModel.getMemberByUserId(req.user.userId, churchId);
    const creatorId = member ? member.id : null;

    const moduleData = {
      ...req.body,
      church_id: churchId,
      created_by: creatorId
    };

    const module = await model.createFoundationModule(moduleData);
    res.status(201).json({
      message: 'Foundation school module created successfully',
      module
    });
  } catch (err) {
    return handleError(res, 'createFoundationModuleHandler', err);
  }
}

// Certificates
export async function createCertificateHandler(req, res) {
  try {
    const churchId = req.user?.church_id || 1;
    const member = await memberModel.getMemberByUserId(req.user.userId, churchId);

    const certificateData = {
      ...req.body,
      church_id: churchId,
      issued_by: member ? member.id : null
    };

    const certificate = await model.createCertificate(certificateData);
    res.status(201).json({
      message: 'Foundation school certificate created successfully',
      certificate
    });
  } catch (err) {
    return handleError(res, 'createCertificateHandler', err);
  }
}

export async function getCertificatesByEnrollmentHandler(req, res) {
  try {
    const enrollmentId = parseInt(req.params.enrollmentId);
    const certificates = await model.getCertificatesByEnrollment(enrollmentId);
    res.json(certificates);
  } catch (err) {
    return handleError(res, 'getCertificatesByEnrollmentHandler', err);
  }
}