import {
  createAbsenteeFollowup,
  getAbsenteeFollowupById,
  updateAbsenteeFollowup,
  getAbsenteeFollowups,
  addContactAttempt,
  getContactAttempts,
  generateFollowupsFromWeeklyReport,
  getFollowupStats,
  getOverdueFollowups
} from '../models/absenteeFollowupModel.js';
import { getMemberByUserId } from '../models/memberModel.js';
import { handleError } from '../utils/errorHandler.js';

// ============================================
// Absentee Follow-Up Controller
// ============================================

/**
 * Create a new absentee follow-up
 */
export async function createAbsenteeFollowupHandler(req, res) {
  try {
    // Get the member for the logged-in user
    const member = await getMemberByUserId(req.user.userId, req.user.church_id);
    if (!member) {
      return res.status(404).json({ error: 'Member profile not found' });
    }

    const followupData = {
      ...req.body,
      created_by: member.id  // Use member.id instead of user.id
    };

    const followup = await createAbsenteeFollowup(followupData);
    const fullFollowup = await getAbsenteeFollowupById(followup.id);

    res.status(201).json({
      message: 'Absentee follow-up created successfully',
      followup: fullFollowup
    });
  } catch (err) {
    return handleError(res, 'createAbsenteeFollowupHandler', err);
  }
}

/**
 * Get absentee follow-up by ID
 */
export async function getAbsenteeFollowupHandler(req, res) {
  try {
    const { id } = req.params;
    const followup = await getAbsenteeFollowupById(id);

    if (!followup) {
      return res.status(404).json({ error: 'Absentee follow-up not found' });
    }

    // Get contact attempts
    const contactAttempts = await getContactAttempts(id);

    res.json({
      followup,
      contactAttempts
    });
  } catch (err) {
    return handleError(res, 'getAbsenteeFollowupHandler', err);
  }
}

/**
 * Update an absentee follow-up
 */
export async function updateAbsenteeFollowupHandler(req, res) {
  try {
    const { id } = req.params;

    // Get the member for the logged-in user
    const member = await getMemberByUserId(req.user.userId, req.user.church_id);
    if (!member) {
      return res.status(404).json({ error: 'Member profile not found' });
    }

    const updates = {
      ...req.body,
      updated_by: member.id  // Use member.id instead of user.id
    };

    const followup = await updateAbsenteeFollowup(id, updates);

    if (!followup) {
      return res.status(404).json({ error: 'Absentee follow-up not found' });
    }

    const fullFollowup = await getAbsenteeFollowupById(id);
    const contactAttempts = await getContactAttempts(id);

    res.json({
      message: 'Absentee follow-up updated successfully',
      followup: fullFollowup,
      contactAttempts
    });
  } catch (err) {
    return handleError(res, 'updateAbsenteeFollowupHandler', err);
  }
}

/**
 * Get absentee follow-ups with filtering
 */
export async function getAbsenteeFollowupsHandler(req, res) {
  try {
    const churchId = req.query.church_id || req.user.church_id;
    const filters = {
      member_id: req.query.member_id,
      assigned_to: req.query.assigned_to,
      status: req.query.status,
      priority_level: req.query.priority_level,
      overdue_only: req.query.overdue_only === 'true',
      limit: parseInt(req.query.limit) || 50,
      offset: parseInt(req.query.offset) || 0
    };

    const followups = await getAbsenteeFollowups(churchId, filters);

    res.json({
      followups,
      filters
    });
  } catch (err) {
    return handleError(res, 'getAbsenteeFollowupsHandler', err);
  }
}

/**
 * Add a contact attempt to a follow-up
 */
export async function addContactAttemptHandler(req, res) {
  try {
    const { id } = req.params;

    // Get the member for the logged-in user
    const member = await getMemberByUserId(req.user.userId, req.user.church_id);
    if (!member) {
      return res.status(404).json({ error: 'Member profile not found' });
    }

    const attemptData = {
      ...req.body,
      created_by: member.id  // Use member.id instead of user.id
    };

    const attempt = await addContactAttempt(id, attemptData);
    const followup = await getAbsenteeFollowupById(id);
    const contactAttempts = await getContactAttempts(id);

    res.json({
      message: 'Contact attempt recorded successfully',
      attempt,
      followup,
      contactAttempts
    });
  } catch (err) {
    return handleError(res, 'addContactAttemptHandler', err);
  }
}

/**
 * Generate follow-ups from weekly report absentees
 */
export async function generateFollowupsFromWeeklyReportHandler(req, res) {
  try {
    const { weekly_report_id } = req.body;
    console.log('Generating followups for report:', weekly_report_id);

    // Get the member for the logged-in user (optional for admins/staff)
    const member = await getMemberByUserId(req.user.userId, req.user.church_id);
    const creatorId = member ? member.id : null; // Allow operation even without member record
    console.log('Creator ID:', creatorId);

    if (!weekly_report_id) {
      return res.status(400).json({ error: 'weekly_report_id is required' });
    }

    const generatedFollowups = await generateFollowupsFromWeeklyReport(weekly_report_id, creatorId);
    console.log('Generated followups:', generatedFollowups.length);

    res.json({
      message: `Generated ${generatedFollowups.length} follow-up(s) from weekly report`,
      followups: generatedFollowups
    });
  } catch (err) {
    console.error('Generate followups error:', err);
    return handleError(res, 'generateFollowupsFromWeeklyReportHandler', err);
  }
}

/**
 * Get follow-up statistics
 */
export async function getFollowupStatsHandler(req, res) {
  try {
    const churchId = req.query.church_id || req.user.church_id;
    const stats = await getFollowupStats(churchId);

    res.json({
      stats,
      church_id: churchId
    });
  } catch (err) {
    return handleError(res, 'getFollowupStatsHandler', err);
  }
}

/**
 * Get overdue follow-ups
 */
export async function getOverdueFollowupsHandler(req, res) {
  try {
    const churchId = req.query.church_id || req.user.church_id;
    const overdue = await getOverdueFollowups(churchId);

    res.json({
      overdue_followups: overdue,
      count: overdue.length,
      church_id: churchId
    });
  } catch (err) {
    return handleError(res, 'getOverdueFollowupsHandler', err);
  }
}

/**
 * Assign a follow-up to a member
 */
export async function assignFollowupHandler(req, res) {
  try {
    const { id } = req.params;
    const { assigned_to, due_date } = req.body;

    // Get the member for the logged-in user
    const member = await getMemberByUserId(req.user.userId, req.user.church_id);
    if (!member) {
      return res.status(404).json({ error: 'Member profile not found' });
    }

    const updates = {
      assigned_to,
      due_date,
      updated_by: member.id  // Use member.id instead of user.id
    };

    const followup = await updateAbsenteeFollowup(id, updates);

    if (!followup) {
      return res.status(404).json({ error: 'Absentee follow-up not found' });
    }

    const fullFollowup = await getAbsenteeFollowupById(id);

    res.json({
      message: 'Follow-up assigned successfully',
      followup: fullFollowup
    });
  } catch (err) {
    return handleError(res, 'assignFollowupHandler', err);
  }
}

/**
 * Resolve a follow-up
 */
export async function resolveFollowupHandler(req, res) {
  try {
    const { id } = req.params;
    const { resolution_type, resolution_notes } = req.body;

    // Get the member for the logged-in user
    const member = await getMemberByUserId(req.user.userId, req.user.church_id);
    if (!member) {
      return res.status(404).json({ error: 'Member profile not found' });
    }

    const updates = {
      status: 'resolved',
      resolution_type,
      resolution_notes,
      resolution_date: new Date(),
      updated_by: member.id  // Use member.id instead of user.id
    };

    const followup = await updateAbsenteeFollowup(id, updates);

    if (!followup) {
      return res.status(404).json({ error: 'Absentee follow-up not found' });
    }

    const fullFollowup = await getAbsenteeFollowupById(id);

    res.json({
      message: 'Follow-up resolved successfully',
      followup: fullFollowup
    });
  } catch (err) {
    return handleError(res, 'resolveFollowupHandler', err);
  }
}