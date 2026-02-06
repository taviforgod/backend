import * as model from '../models/crisisFollowupModel.js';
import * as memberModel from '../models/memberModel.js';
import db from '../config/db.js';
import { handleError } from '../utils/errorHandler.js';
import { notifyCrisisCreated, notifyCrisisAssigned } from '../utils/notificationUtils.js';

// Enhanced Crisis Followups CRUD
export async function getAllCrisisFollowups(req, res) {
  try {
    const church_id = req.user?.church_id || req.query.church_id;
    const filters = {
      church_id,
      is_active: req.query.is_active === undefined ? true : req.query.is_active === 'true',
      crisis_type: req.query.crisis_type,
      severity_level: req.query.severity_level,
      case_status: req.query.case_status,
      case_manager: req.query.case_manager,
      limit: req.query.limit ? parseInt(req.query.limit) : 50,
      offset: req.query.offset ? parseInt(req.query.offset) : 0
    };

    // Allow cell leaders to view cases for their cells using ?scope=leader or ?leader_view=true
    if ((req.query.scope === 'leader' || req.query.leader_view === 'true') && req.user?.userId) {
      try {
        const leaderMember = await memberModel.getMemberByUserId(req.user.userId, church_id);
        if (leaderMember && leaderMember.id) {
          const cellRows = await db.query('SELECT id FROM cell_groups WHERE church_id = $1 AND leader_id = $2', [church_id, leaderMember.id]);
          const cellIds = (cellRows.rows || []).map(r => r.id);
          if (cellIds.length) {
            filters.cell_group_ids = cellIds;
          } else {
            // no cell groups found for this leader; restrict to empty set to avoid accidental exposure
            filters.cell_group_ids = [-1];
          }
        }
      } catch (e) {
        // Fail quietly to avoid breaking listing for non-leaders
        console.warn('Failed to determine leader cell groups', e.message || e);
      }
    }

    // Add date filtering if provided
    if (req.query.start_date) {
      filters.start_date = req.query.start_date;
    }
    if (req.query.end_date) {
      filters.end_date = req.query.end_date;
    }

    const records = await model.getAllCrisisFollowups(filters);
    res.json(records);
  } catch (err) {
    return handleError(res, 'getAllCrisisFollowups', err);
  }
}

export async function getCrisisFollowupById(req, res) {
  try {
    const record = await model.getCrisisFollowupById(req.params.id);
    if (!record) return res.status(404).json({ message: 'Crisis case not found' });
    res.json(record);
  } catch (err) {
    return handleError(res, 'getCrisisFollowupById', err);
  }
}

export async function getCaseDetails(req, res) {
  try {
    const caseDetails = await model.getCaseDetails(req.params.id);
    if (!caseDetails) return res.status(404).json({ message: 'Crisis case not found' });
    res.json(caseDetails);
  } catch (err) {
    return handleError(res, 'getCaseDetails', err);
  }
}

export async function createCrisisFollowup(req, res) {
  try {
    console.log('createCrisisFollowup called with req.body:', req.body);
    console.log('req.body type:', typeof req.body);
    
    const church_id = req.user?.church_id || req.body?.church_id;
    const member = await memberModel.getMemberByUserId(req.user?.userId, church_id);
    const reported_by = member ? member.id : req.user?.id;

    // Ensure req.body exists
    const requestBody = req.body || {};
    console.log('Using requestBody:', requestBody);

    const data = {
      ...requestBody,
      church_id,
      reported_by,
      case_manager: requestBody.case_manager || requestBody.caseManager || reported_by,
      case_status: 'active',
      severity_level: requestBody.severity_level || requestBody.severityLevel || 'moderate'
    };

    console.log('Final data for crisis followup:', data);

    const record = await model.createCrisisFollowup(data);
    
    // Notify admins/pastors about the new crisis case
    if (record && record.member_id) {
      try {
        const member = await memberModel.getMemberById(record.member_id, church_id);
        const memberName = member ? `${member.first_name} ${member.surname}` : 'Unknown member';
        
        // Get admin/pastor users to notify
        const adminUsers = await db.query(
          `SELECT DISTINCT u.id FROM users u
           JOIN user_roles ur ON u.id = ur.user_id
           JOIN roles r ON ur.role_id = r.id
           WHERE u.church_id = $1 AND r.name IN ('Admin', 'Pastor')`,
          [church_id]
        );
        
        // Send notification to each admin/pastor
        for (const admin of adminUsers.rows) {
          await notifyCrisisCreated({
            churchId: church_id,
            caseId: record.id,
            memberName,
            severity: record.severity_level || 'moderate',
            notifyUserId: admin.id,
            notifyMemberId: null
          });
        }
      } catch (notifyErr) {
        console.warn('Failed to notify about crisis creation:', notifyErr.message || notifyErr);
        // Don't throw - let the main request succeed even if notification fails
      }
    }
    
    res.status(201).json({
      message: 'Crisis case created successfully',
      case: record
    });
  } catch (err) {
    return handleError(res, 'createCrisisFollowup', err);
  }
}

export async function updateCrisisFollowup(req, res) {
  try {
    const updated = await model.updateCrisisFollowup(req.params.id, req.body);
    if (!updated) return res.status(404).json({ message: 'Crisis case not found' });

    res.json({
      message: 'Crisis case updated successfully',
      case: updated
    });
  } catch (err) {
    return handleError(res, 'updateCrisisFollowup', err);
  }
}

export async function deleteCrisisFollowup(req, res) {
  try {
    const ok = await model.deleteCrisisFollowup(req.params.id);
    if (!ok) return res.status(404).json({ message: 'Crisis case not found' });
    console.log('deleteCrisisFollowup returning:', ok);
    res.json({ message: 'Crisis case closed successfully' });
  } catch (err) {
    return handleError(res, 'deleteCrisisFollowup', err);
  }
}

export async function getCrisisSummary(req, res) {
  try {
    const church_id = req.user?.church_id || req.query.church_id;
    const summary = await model.getCrisisSummary(church_id);
    console.log('getCrisisSummary returning:', summary);
    res.json(summary);
  } catch (err) {
    return handleError(res, 'getCrisisSummary', err);
  }
}

// Assign a crisis case to a member (requires 'crisis_assign' permission)
export async function assignCaseToMember(req, res) {
  try {
    const caseId = req.params.id;
    const { assignee_member_id } = req.body || {};
    if (!assignee_member_id) return res.status(400).json({ message: 'assignee_member_id is required' });

    const church_id = req.user?.church_id;

    // Verify assignee exists
    const assignee = await memberModel.getMemberById(assignee_member_id, church_id);
    if (!assignee) return res.status(404).json({ message: 'Assignee member not found' });

    // Prefer to ensure assignee is an active leader (re-use prayerModel helper for consistency)
    try {
      const prayerModel = await import('../models/prayerModel.js');
      const ok = await prayerModel.isActiveLeader(church_id, assignee_member_id);
      if (!ok) return res.status(403).json({ message: 'Assignee is not an active leader' });
    } catch (err) {
      // If the helper import fails for any reason, log and allow assignment (fail-open)
      console.warn('Leader check failed during assignment:', err?.message || err);
    }

    const updated = await model.updateCrisisFollowup(caseId, { case_manager: assignee_member_id });
    if (!updated) return res.status(404).json({ message: 'Crisis case not found' });

    // Notify the assigned member
    try {
      await notifyCrisisAssigned({
        churchId: church_id,
        caseId: updated.id,
        caseTitle: updated.member_name || `Crisis Case #${updated.id}`,
        assignedToName: `${assignee.first_name} ${assignee.surname}`,
        assignedToMemberId: assignee_member_id
      });
    } catch (notifyErr) {
      console.warn('Failed to notify about case assignment:', notifyErr.message || notifyErr);
    }

    res.json({ message: 'Case assigned successfully', case: updated });
  } catch (err) {
    return handleError(res, 'assignCaseToMember', err);
  }
}

// Crisis Assessments
export async function createCrisisAssessment(req, res) {
  try {
    const church_id = req.user?.church_id || req.body.church_id;
    const member = await memberModel.getMemberByUserId(req.user?.userId, church_id);
    const assessed_by = member ? member.id : req.user?.id;

    const data = {
      ...req.body,
      church_id,
      assessed_by
    };

    const assessment = await model.createCrisisAssessment(data);
    res.status(201).json({
      message: 'Crisis assessment completed successfully',
      assessment
    });
  } catch (err) {
    return handleError(res, 'createCrisisAssessment', err);
  }
}

export async function getCrisisAssessments(req, res) {
  try {
    const assessments = await model.getCrisisAssessments(req.params.caseId);
    res.json(assessments);
  } catch (err) {
    return handleError(res, 'getCrisisAssessments', err);
  }
}

// Intervention Plans
export async function createInterventionPlan(req, res) {
  try {
    const church_id = req.user?.church_id || req.body.church_id;
    const member = await memberModel.getMemberByUserId(req.user?.userId, church_id);
    const created_by = member ? member.id : req.user?.id;

    const data = {
      ...req.body,
      church_id,
      created_by
    };

    const plan = await model.createInterventionPlan(data);
    res.status(201).json({
      message: 'Intervention plan created successfully',
      plan
    });
  } catch (err) {
    return handleError(res, 'createInterventionPlan', err);
  }
}

export async function getInterventionPlans(req, res) {
  try {
    const plans = await model.getInterventionPlans(req.params.caseId);
    res.json(plans);
  } catch (err) {
    return handleError(res, 'getInterventionPlans', err);
  }
}

// Follow-up Sessions
export async function createFollowupSession(req, res) {
  try {
    const church_id = req.user?.church_id || req.body.church_id;
    const member = await memberModel.getMemberByUserId(req.user?.userId, church_id);
    const created_by = member ? member.id : req.user?.id;

    const data = {
      ...req.body,
      church_id,
      created_by
    };

    const session = await model.createFollowupSession(data);
    res.status(201).json({
      message: 'Follow-up session recorded successfully',
      session
    });
  } catch (err) {
    return handleError(res, 'createFollowupSession', err);
  }
}

export async function getFollowupSessions(req, res) {
  try {
    const sessions = await model.getFollowupSessions(req.params.caseId);
    res.json(sessions);
  } catch (err) {
    return handleError(res, 'getFollowupSessions', err);
  }
}

// Crisis Resources
export async function getCrisisResources(req, res) {
  try {
    const church_id = req.user?.church_id || req.query.church_id;
    const filters = {
      resource_type: req.query.resource_type,
      is_active: req.query.is_active !== 'false'
    };

    console.log('getCrisisResources called with:', { church_id, filters });
    const resources = await model.getCrisisResources(church_id, filters);
    console.log('getCrisisResources returning:', resources.length, 'resources');
    res.json(resources);
  } catch (err) {
    return handleError(res, 'getCrisisResources', err);
  }
}

// Crisis Referrals
export async function createCrisisReferral(req, res) {
  try {
    const church_id = req.user?.church_id || req.body.church_id;
    const member = await memberModel.getMemberByUserId(req.user?.userId, church_id);
    const referred_by = member ? member.id : req.user?.id;

    const data = {
      ...req.body,
      church_id,
      referred_by,
      referral_date: req.body.referral_date || new Date().toISOString().split('T')[0]
    };

    const referral = await model.createCrisisReferral(data);
    res.status(201).json({
      message: 'Referral created successfully',
      referral
    });
  } catch (err) {
    return handleError(res, 'createCrisisReferral', err);
  }
}

export async function getCrisisReferrals(req, res) {
  try {
    const referrals = await model.getCrisisReferrals(req.params.caseId);
    res.json(referrals);
  } catch (err) {
    return handleError(res, 'getCrisisReferrals', err);
  }
}

// Recovery Milestones
export async function createRecoveryMilestone(req, res) {
  try {
    const church_id = req.user?.church_id || req.body.church_id;
    const member = await memberModel.getMemberByUserId(req.user?.userId, church_id);
    const created_by = member ? member.id : req.user?.id;

    const data = {
      ...req.body,
      church_id,
      created_by
    };

    const milestone = await model.createRecoveryMilestone(data);
    res.status(201).json({
      message: 'Recovery milestone created successfully',
      milestone
    });
  } catch (err) {
    return handleError(res, 'createRecoveryMilestone', err);
  }
}

export async function getRecoveryMilestones(req, res) {
  try {
    const milestones = await model.getRecoveryMilestones(req.params.caseId);
    res.json(milestones);
  } catch (err) {
    return handleError(res, 'getRecoveryMilestones', err);
  }
}

export async function updateMilestoneProgress(req, res) {
  try {
    const updated = await model.updateMilestoneProgress(req.params.milestoneId, req.body);
    if (!updated) return res.status(404).json({ message: 'Milestone not found' });

    res.json({
      message: 'Milestone progress updated successfully',
      milestone: updated
    });
  } catch (err) {
    return handleError(res, 'updateMilestoneProgress', err);
  }
}

// Urgent Cases Dashboard
export async function getUrgentCases(req, res) {
  try {
    const church_id = req.user?.church_id || req.query.church_id;
    const urgentCases = await model.getUrgentCases(church_id);
    res.json(urgentCases);
  } catch (err) {
    return handleError(res, 'getUrgentCases', err);
  }
}
