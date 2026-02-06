import * as model from '../models/leadershipModel.js';
import * as notificationModel from '../models/notificationModel.js';
import * as memberModel from '../models/memberModel.js';
import { getIO } from '../config/socket.js';
import * as leadershipModel from '../models/leadershipModel.js';
 
// Leadership Roles
export const createRole = async (req, res) => {
  const row = await model.addLeadershipRole({ ...req.body, church_id: req.user.church_id });
  res.status(201).json(row);

  // best-effort notification
  (async () => {
    try {
      const church_id = req.user.church_id;
      const user_id = req.user?.userId ?? req.user?.id ?? null;
      const title = 'Leadership role created';
      const message = `Role "${row?.name || req.body.name || 'Unnamed'}" was created.`;
      const metadata = { action: 'leadership_role_created', role_id: row?.id ?? null };
      const link = `/leadership/roles/${row?.id ?? ''}`;

      const notification = await notificationModel.createNotification({
        church_id,
        member_id: null,
        user_id,
        title,
        message,
        channel: 'inapp',
        metadata,
        link
      });

      const io = getIO();
      if (io) {
        if (church_id) io.to(`church:${church_id}`).emit('notification', notification);
        if (notification.user_id) io.to(`user:${notification.user_id}`).emit('notification', notification);
      }
    } catch (nErr) {
      console.warn('Failed to create notification for createRole', nErr?.message || nErr);
    }
  })();
};
 export const listRoles = async (req, res) => {
   const rows = await model.listLeadershipRoles(req.user.church_id);
   res.json(rows);
 };
 
 // Promotions
 export const createPromotion = async (req, res) => {
   const row = await model.addPromotion({ ...req.body, church_id: req.user.church_id, created_by: req.user.id });
   res.status(201).json(row);

  (async () => {
    try {
      const church_id = req.user.church_id;
      const user_id = req.user?.userId ?? req.user?.id ?? null;
      const memberId = req.body.member_id ?? row?.member_id ?? null;
      
      // Get member details for notification
      let memberDisplayName = '';
      if (memberId) {
        const member = await memberModel.getMemberById(memberId);
        memberDisplayName = member ? ` for member ${member.first_name} ${member.surname}`.trim() : ` for member ${memberId}`;
      }
      
      const title = 'Promotion recorded';
      const message = `A promotion was recorded${memberDisplayName}.`;
      const metadata = { action: 'promotion_created', promotion_id: row?.id ?? null };
      const link = memberId ? `/members/${memberId}` : '/leadership/promotions';

      const notification = await notificationModel.createNotification({
        church_id,
        member_id: memberId,
        user_id,
        title,
        message,
        channel: 'inapp',
        metadata,
        link
      });

      const io = getIO();
      if (io) {
        if (church_id) io.to(`church:${church_id}`).emit('notification', notification);
        if (notification.user_id) io.to(`user:${notification.user_id}`).emit('notification', notification);
        if (memberId) io.to(`member:${memberId}`).emit('notification', notification);
      }
    } catch (nErr) {
      console.warn('Failed to create notification for createPromotion', nErr?.message || nErr);
    }
  })();
 };
 
 // Leadership Evaluations
 export const createEvaluation = async (req, res) => {
   
   const row = await model.addEvaluation({
     ...req.body,
     church_id: req.user.church_id,
     evaluator_id: req.user.userId // <-- FIXED HERE
   });
  // invalidate cached readiness for this leader so frontend reads recompute fresh score
  try { await leadershipModel.resetReadinessCache(req.user.church_id, req.body.leader_id ?? row?.leader_id); } catch (e) { /* ignore */ }
  res.status(201).json(row);

  (async () => {
    try {
      const church_id = req.user.church_id;
      const user_id = req.user?.userId ?? req.user?.id ?? null;
      const leaderId = req.body.leader_id ?? row?.leader_id ?? null;
      const title = 'Evaluation submitted';
      const message = `An evaluation was submitted${leaderId ? ` for leader ${leaderId}` : ''}.`;
      const metadata = { action: 'evaluation_created', evaluation_id: row?.id ?? null };
      const link = leaderId ? `/leadership/${leaderId}/evaluations` : '/leadership/evaluations';

      const notification = await notificationModel.createNotification({
        church_id,
        member_id: leaderId,
        user_id,
        title,
        message,
        channel: 'inapp',
        metadata,
        link
      });

      const io = getIO();
      if (io) {
        if (church_id) io.to(`church:${church_id}`).emit('notification', notification);
        if (notification.user_id) io.to(`user:${notification.user_id}`).emit('notification', notification);
        if (leaderId) io.to(`member:${leaderId}`).emit('notification', notification);
      }
    } catch (nErr) {
      console.warn('Failed to create notification for createEvaluation', nErr?.message || nErr);
    }
  })();
 };
 export const listEvaluations = async (req, res) => {
   const rows = await model.listEvaluations(req.user.church_id, req.params.leaderId);
   res.json(rows);
 };

// --- Leadership readiness helpers (Phase 1, fast path) ---
const computeReadinessScore = async (church_id, leaderId) => {
  // Evaluations average
  const evals = await model.listEvaluations(church_id, leaderId).catch(() => []);
  let evalAvg = 0;
  if (evals && evals.length) {
    const perEval = evals.map(e => {
      const nums = [e.spiritual_maturity, e.relational_health, e.discipleship, e.growth_potential, e.leadership_qualities].filter(n => typeof n === 'number');
      if (!nums.length) return 0;
      return nums.reduce((s, v) => s + (Number(v) || 0), 0) / nums.length;
    });
    evalAvg = perEval.reduce((s, v) => s + v, 0) / perEval.length;
    // scale to 100 (fields assumed 1-10 or 1-5; clamp)
    if (evalAvg <= 5) evalAvg = (evalAvg / 5) * 100;
    else if (evalAvg <= 10) evalAvg = (evalAvg / 10) * 100;
  }

  // Mentorship presence
  const mentorships = await leadershipModel.listMentorshipAssignmentsByMentor(leaderId).catch(() => []);
  const hasMentorship = (mentorships && mentorships.length > 0) ? 1 : 0;

  // Milestones (use as proxy for training completion)
  const milestoneCount = await leadershipModel.countMilestonesForMember(church_id, leaderId).catch(() => 0);
  const milestoneScore = Math.min(milestoneCount, 3) / 3 * 100;

  // Weights (simple): eval 50%, mentorship 30%, milestones 20%
  const score = Math.round((evalAvg * 0.5) + (hasMentorship * 100 * 0.3) + (milestoneScore * 0.2));
  return { score, breakdown: { evalAvg: Math.round(evalAvg), hasMentorship, milestoneCount } };
};

export const getReadiness = async (req, res) => {
  try {
    const church_id = req.user.church_id;
    const leaderId = Number(req.params.leaderId);
    const existing = await leadershipModel.getReadinessForMember(church_id, leaderId).catch(() => null);

    // fetch history
    const history = await leadershipModel.listReadinessApprovals(church_id, leaderId).catch(() => []);

    if (existing && typeof existing.readiness_score === 'number') return res.json({ readiness: { ...existing, history } });

    const computed = await computeReadinessScore(church_id, leaderId);
    // persist to leadership_roles for quick lookup
    await leadershipModel.updateReadinessScore({ church_id, member_id: leaderId, score: computed.score, status: computed.score >= 80 ? 'certified' : (computed.score >= 50 ? 'in_progress' : 'not_started') }).catch(() => null);
    return res.json({ readiness: { score: computed.score, breakdown: computed.breakdown, history } });
  } catch (err) {
    console.error('getReadiness error', err);
    res.status(500).json({ error: 'Failed to compute readiness' });
  }
};

export const requestApproval = async (req, res) => {
  try {
    const church_id = req.user.church_id;
    const leaderId = Number(req.params.leaderId);
    const user_id = req.user?.userId ?? req.user?.id ?? null;

    // log request in approvals table (snapshot leader's zone at request time)
    let member = null;
    try { member = await memberModel.getMemberById(leaderId); } catch (e) { /* ignore */ }
    const zone_id = member?.zone_id ?? null;
    try { await leadershipModel.addReadinessApproval({ church_id, leader_id: leaderId, actor_id: user_id, action: 'requested', reason: null, zone_id }); } catch (e) { /* ignore */ }

    const title = 'Leadership approval requested';
    const message = `Leader #${leaderId} has requested certification approval.`;
    const metadata = { action: 'approval_requested', leader_id: leaderId };
    const link = `/leadership/summary/${leaderId}`;

    const notification = await notificationModel.createNotification({ church_id, member_id: leaderId, user_id, title, message, channel: 'inapp', metadata, link });
    const io = getIO(); if (io) { if (church_id) io.to(`church:${church_id}`).emit('notification', notification); if (notification.user_id) io.to(`user:${notification.user_id}`).emit('notification', notification); }

    res.json({ message: 'Approval requested' });
  } catch (err) {
    console.error('requestApproval error', err);
    res.status(500).json({ error: 'Failed to request approval' });
  }
};

export const approveLeader = async (req, res) => {
  try {
    const church_id = req.user.church_id;
    const leaderId = Number(req.params.leaderId);
    const approverId = req.user?.userId ?? req.user?.id ?? null;

    const computed = await computeReadinessScore(church_id, leaderId);
    await leadershipModel.updateReadinessScore({ church_id, member_id: leaderId, score: computed.score, status: 'certified', updated_by: approverId });

    // log approval (snapshot zone at approval time)
    try {
      let member = null;
      try { member = await memberModel.getMemberById(leaderId); } catch (e) { /* ignore */ }
      const zone_id = member?.zone_id ?? null;
      await leadershipModel.addReadinessApproval({ church_id, leader_id: leaderId, actor_id: approverId, action: 'approved', reason: req.body?.reason || null, zone_id });
    } catch (e) { /* ignore */ }

    const title = 'Leader certified';
    const message = `Leader #${leaderId} has been certified by approver ${approverId}.`;
    const metadata = { action: 'leader_certified', leader_id: leaderId };
    const notification = await notificationModel.createNotification({ church_id, member_id: leaderId, user_id: approverId, title, message, channel: 'inapp', metadata, link: `/members/${leaderId}` });
    const io = getIO(); if (io) { if (church_id) io.to(`church:${church_id}`).emit('notification', notification); if (notification.user_id) io.to(`user:${notification.user_id}`).emit('notification', notification); if (leaderId) io.to(`member:${leaderId}`).emit('notification', notification); }

    res.json({ message: 'Leader approved and certified', score: computed.score });
  } catch (err) {
    console.error('approveLeader error', err);
    res.status(500).json({ error: 'Failed to approve leader' });
  }
};

export const rejectLeader = async (req, res) => {
  try {
    const church_id = req.user.church_id;
    const leaderId = Number(req.params.leaderId);
    const approverId = req.user?.userId ?? req.user?.id ?? null;
    const reason = (req.body?.reason || '').trim();

    // validation: reason is required
    if (!reason) {
      return res.status(400).json({ error: 'Rejection reason is required' });
    }

    const computed = await computeReadinessScore(church_id, leaderId);
    await leadershipModel.updateReadinessScore({ church_id, member_id: leaderId, score: computed.score, status: 'rejected', updated_by: approverId });

    // log rejection (snapshot zone at rejection time)
    try {
      let member = null;
      try { member = await memberModel.getMemberById(leaderId); } catch (e) { /* ignore */ }
      const zone_id = member?.zone_id ?? null;
      await leadershipModel.addReadinessApproval({ church_id, leader_id: leaderId, actor_id: approverId, action: 'rejected', reason, zone_id });
    } catch (e) { /* ignore */ }

    const title = 'Leader certification rejected';
    const message = `Leader #${leaderId} has been rejected by approver ${approverId}.`;
    const metadata = { action: 'leader_rejected', leader_id: leaderId };
    const notification = await notificationModel.createNotification({ church_id, member_id: leaderId, user_id: approverId, title, message, channel: 'inapp', metadata, link: `/members/${leaderId}` });
    const io = getIO(); if (io) { if (church_id) io.to(`church:${church_id}`).emit('notification', notification); if (notification.user_id) io.to(`user:${notification.user_id}`).emit('notification', notification); if (leaderId) io.to(`member:${leaderId}`).emit('notification', notification); }

    res.json({ message: 'Leader rejected', score: computed.score });
  } catch (err) {
    console.error('rejectLeader error', err);
    res.status(500).json({ error: 'Failed to reject leader' });
  }
};
 
 // Leadership Alerts
 export const createAlert = async (req, res) => {
   const row = await model.addAlert({ ...req.body, church_id: req.user.church_id });
   res.status(201).json(row);

  (async () => {
    try {
      const church_id = req.user.church_id;
      const user_id = req.user?.userId ?? req.user?.id ?? null;
      const targetId = req.body.member_id ?? row?.member_id ?? null;
      
      // Get member details for notification
      let memberDisplayName = '';
      if (targetId) {
        const member = await memberModel.getMemberById(targetId);
        memberDisplayName = member ? ` for member ${member.first_name} ${member.surname}`.trim() : ` for member ${targetId}`;
      }
      
      const title = 'Leadership alert created';
      const message = `An alert was created${memberDisplayName}.`;
      const metadata = { action: 'leadership_alert_created', alert_id: row?.id ?? null };
      const link = targetId ? `/members/${targetId}/alerts` : '/leadership/alerts';

      const notification = await notificationModel.createNotification({
        church_id,
        member_id: targetId,
        user_id,
        title,
        message,
        channel: 'inapp',
        metadata,
        link
      });

      const io = getIO();
      if (io) {
        if (church_id) io.to(`church:${church_id}`).emit('notification', notification);
        if (notification.user_id) io.to(`user:${notification.user_id}`).emit('notification', notification);
        if (targetId) io.to(`member:${targetId}`).emit('notification', notification);
      }
    } catch (nErr) {
      console.warn('Failed to create notification for createAlert', nErr?.message || nErr);
    }
  })();
 };
 export const listAlerts = async (req, res) => {
   const rows = await model.listAlerts(req.user.church_id);
   res.json(rows);
 };

// List pending approval requests for admins/approvers
export const listPendingApprovals = async (req, res) => {
  try {
    const church_id = req.user.church_id;
    const limit = Math.min(100, Number(req.query.limit) || 20);
    const page = Math.max(0, Number(req.query.page) || 0);
    const offset = page * limit;
    const search = req.query.search || null;
    const minScore = typeof req.query.minScore !== 'undefined' ? (req.query.minScore === '' ? null : Number(req.query.minScore)) : null;
    const maxScore = typeof req.query.maxScore !== 'undefined' ? (req.query.maxScore === '' ? null : Number(req.query.maxScore)) : null;
    const status = req.query.status || null;
    const zoneId = typeof req.query.zoneId !== 'undefined' ? (req.query.zoneId === '' ? null : Number(req.query.zoneId)) : null;

    const data = await leadershipModel.listPendingApprovalRequests(church_id, { limit, offset, search, minScore, maxScore, status, zoneId }).catch(() => ({ rows: [], total: 0 }));
    const rows = data.rows || [];
    const total = typeof data.total === 'number' ? data.total : 0;

    // map to friendly shape
    const pending = rows.map(r => ({
      id: r.id,
      leader_id: r.leader_id,
      leader_name: r.first_name ? `${r.first_name} ${r.surname || ''}`.trim() : `Member ${r.leader_id}`,
      requested_at: r.created_at,
      requested_by: r.actor_name,
      readiness_score: r.readiness_score,
      readiness_status: r.readiness_status,
      zone_id: r.zone_id || null
    }));

    res.json({ pending, page, limit, hasMore: rows.length === limit, total });
  } catch (err) {
    console.error('listPendingApprovals error', err);
    res.status(500).json({ error: 'Failed to list pending approvals' });
  }
};
 export const createMilestoneRecord = async (req, res) => {
   const row = await model.addMilestoneRecord({ ...req.body, church_id: req.user.church_id });
   res.status(201).json(row);

  (async () => {
    try {
      const church_id = req.user.church_id;
      const user_id = req.user?.userId ?? req.user?.id ?? null;
      const memberId = req.body.member_id ?? row?.member_id ?? null;
      
      // Get member details for notification
      let memberDisplayName = '';
      if (memberId) {
        const member = await memberModel.getMemberById(memberId);
        memberDisplayName = member ? ` for member ${member.first_name} ${member.surname}`.trim() : ` for member ${memberId}`;
      }
      
      const title = 'Milestone recorded';
      const message = `A milestone was recorded${memberDisplayName}.`;
      const metadata = { action: 'milestone_record_created', record_id: row?.id ?? null };
      const link = memberId ? `/members/${memberId}/milestones` : '/leadership/milestones';

      const notification = await notificationModel.createNotification({
        church_id,
        member_id: memberId,
        user_id,
        title,
        message,
        channel: 'inapp',
        metadata,
        link
      });

      const io = getIO();
      if (io) {
        if (church_id) io.to(`church:${church_id}`).emit('notification', notification);
        if (notification.user_id) io.to(`user:${notification.user_id}`).emit('notification', notification);
        if (memberId) io.to(`member:${memberId}`).emit('notification', notification);
      }
    } catch (nErr) {
      console.warn('Failed to create notification for createMilestoneRecord', nErr?.message || nErr);
    }
  })();
 };
 export const listMilestoneRecords = async (req, res) => {
   const rows = await model.listMilestoneRecords(req.user.church_id, req.params.memberId);
   res.json(rows);
 };
 
 // Leadership Exit Records
 export const createExitRecord = async (req, res) => {
  const row = await model.addExitRecord({ ...req.body, church_id: req.user.church_id, created_by: req.user.id });
  res.status(201).json(row);

 (async () => {
   try {
     const church_id = req.user.church_id;
     const user_id = req.user?.userId ?? req.user?.id ?? null;
     const memberId = req.body.member_id ?? row?.member_id ?? null;
     
     // Get member details for notification
     let memberDisplayName = '';
     if (memberId) {
       const member = await memberModel.getMemberById(memberId);
       memberDisplayName = member ? ` for member ${member.first_name} ${member.surname}`.trim() : ` for member ${memberId}`;
     }
     
     const title = 'Leadership exit recorded';
     const message = `A leadership exit was recorded${memberDisplayName}.`;
     const metadata = { action: 'leadership_exit_created', exit_id: row?.id ?? null };
     const link = memberId ? `/members/${memberId}/exits` : '/leadership/exits';

     const notification = await notificationModel.createNotification({
       church_id,
       member_id: memberId,
       user_id,
       title,
       message,
       channel: 'inapp',
       metadata,
       link
     });

     const io = getIO();
     if (io) {
       if (church_id) io.to(`church:${church_id}`).emit('notification', notification);
       if (notification.user_id) io.to(`user:${notification.user_id}`).emit('notification', notification);
       if (memberId) io.to(`member:${memberId}`).emit('notification', notification);
     }
   } catch (nErr) {
     console.warn('Failed to create notification for createExitRecord', nErr?.message || nErr);
   }
 })();
};

// ---------------------------
// Update / Delete controllers
// ---------------------------

// Leadership Roles
export const updateRole = async (req, res) => {
  const id = req.params.id;
  const row = await model.updateLeadershipRole({ id, ...req.body });
  res.json(row);

  (async () => {
    try {
      const church_id = req.user.church_id;
      const user_id = req.user?.userId ?? req.user?.id ?? null;
      const title = 'Leadership role updated';
      const message = `Role ${row?.id ?? id} was updated.`;
      const metadata = { action: 'leadership_role_updated', role_id: row?.id ?? id };
      const link = `/leadership/roles/${row?.id ?? id}`;

      const notification = await notificationModel.createNotification({
        church_id,
        member_id: row?.member_id ?? null,
        user_id,
        title,
        message,
        channel: 'inapp',
        metadata,
        link
      });

      const io = getIO();
      if (io) {
        if (church_id) io.to(`church:${church_id}`).emit('notification', notification);
        if (notification.user_id) io.to(`user:${notification.user_id}`).emit('notification', notification);
        if (row?.member_id) io.to(`member:${row.member_id}`).emit('notification', notification);
      }
    } catch (nErr) {
      console.warn('Failed to create notification for updateRole', nErr?.message || nErr);
    }
  })();
};

export const deleteRole = async (req, res) => {
  const id = req.params.id;
  // prefer soft-deactivate
  const row = await model.deactivateLeadershipRole(id);
  res.json(row);

  (async () => {
    try {
      const church_id = req.user.church_id;
      const user_id = req.user?.userId ?? req.user?.id ?? null;
      const title = 'Leadership role deactivated';
      const message = `Role ${id} was deactivated.`;
      const metadata = { action: 'leadership_role_deactivated', role_id: id };
      const link = `/leadership/roles`;

      const notification = await notificationModel.createNotification({
        church_id,
        member_id: row?.member_id ?? null,
        user_id,
        title,
        message,
        channel: 'inapp',
        metadata,
        link
      });

      const io = getIO();
      if (io) {
        if (church_id) io.to(`church:${church_id}`).emit('notification', notification);
        if (notification.user_id) io.to(`user:${notification.user_id}`).emit('notification', notification);
        if (row?.member_id) io.to(`member:${row.member_id}`).emit('notification', notification);
      }
    } catch (nErr) {
      console.warn('Failed to create notification for deleteRole', nErr?.message || nErr);
    }
  })();
};

// Promotions
export const updatePromotion = async (req, res) => {
  const id = req.params.id;
  const row = await model.updatePromotion({ id, ...req.body });
  res.json(row);

  (async () => {
    try {
      const church_id = req.user.church_id;
      const user_id = req.user?.userId ?? req.user?.id ?? null;
      const memberId = row?.member_id ?? req.body.member_id ?? null;
      
      // Get member details for notification
      let memberDisplayName = '';
      if (memberId) {
        const member = await memberModel.getMemberById(memberId);
        memberDisplayName = member ? ` for member ${member.first_name} ${member.surname}`.trim() : ` for member ${memberId}`;
      }
      
      const title = 'Promotion updated';
      const message = `Promotion ${id} was updated${memberDisplayName}.`;
      const metadata = { action: 'promotion_updated', promotion_id: id };
      const link = memberId ? `/members/${memberId}` : '/leadership/promotions';

      const notification = await notificationModel.createNotification({
        church_id,
        member_id: memberId,
        user_id,
        title,
        message,
        channel: 'inapp',
        metadata,
        link
      });

      const io = getIO();
      if (io) {
        if (church_id) io.to(`church:${church_id}`).emit('notification', notification);
        if (notification.user_id) io.to(`user:${notification.user_id}`).emit('notification', notification);
        if (memberId) io.to(`member:${memberId}`).emit('notification', notification);
      }
    } catch (nErr) {
      console.warn('Failed to create notification for updatePromotion', nErr?.message || nErr);
    }
  })();
};

export const deletePromotion = async (req, res) => {
  const id = req.params.id;
  const row = await model.deletePromotion(id);
  res.json(row);
};

// Leadership Evaluations
export const updateEvaluation = async (req, res) => {
  const id = req.params.id;
  const row = await model.updateEvaluation({ id, ...req.body });
  res.json(row);

  (async () => {
    try {
      const church_id = req.user.church_id;
      const user_id = req.user?.userId ?? req.user?.id ?? null;
      const leaderId = row?.leader_id ?? req.body.leader_id ?? null;
      const title = 'Evaluation updated';
      const message = `Evaluation ${id} was updated${leaderId ? ` for leader ${leaderId}` : ''}.`;
      const metadata = { action: 'evaluation_updated', evaluation_id: id };
      const link = leaderId ? `/leadership/${leaderId}/evaluations` : '/leadership/evaluations';

      const notification = await notificationModel.createNotification({
        church_id,
        member_id: leaderId,
        user_id,
        title,
        message,
        channel: 'inapp',
        metadata,
        link
      });

      const io = getIO();
      if (io) {
        if (church_id) io.to(`church:${church_id}`).emit('notification', notification);
        if (notification.user_id) io.to(`user:${notification.user_id}`).emit('notification', notification);
        if (leaderId) io.to(`member:${leaderId}`).emit('notification', notification);
      }
    } catch (nErr) {
      console.warn('Failed to create notification for updateEvaluation', nErr?.message || nErr);
    }
  })();
};

export const deleteEvaluation = async (req, res) => {
  const id = req.params.id;
  const row = await model.deleteEvaluation(id);
  res.json(row);
};

// Leadership Alerts
export const resolveAlert = async (req, res) => {
  const id = req.params.id;
  const row = await model.resolveAlert({ id, resolved_by: req.user.id });
  res.json(row);

  (async () => {
    try {
      const church_id = req.user.church_id;
      const user_id = req.user?.userId ?? req.user?.id ?? null;
      const memberId = row?.member_id ?? null;
      
      // Get member details for notification
      let memberDisplayName = '';
      if (memberId) {
        const member = await memberModel.getMemberById(memberId);
        memberDisplayName = member ? ` for member ${member.first_name} ${member.surname}`.trim() : ` for member ${memberId}`;
      }
      
      const title = 'Alert resolved';
      const message = `Alert ${id} was resolved${memberDisplayName}.`;
      const metadata = { action: 'alert_resolved', alert_id: id };
      const link = memberId ? `/members/${memberId}/alerts` : '/leadership/alerts';

      const notification = await notificationModel.createNotification({
        church_id,
        member_id: memberId,
        user_id,
        title,
        message,
        channel: 'inapp',
        metadata,
        link
      });

      const io = getIO();
      if (io) {
        if (church_id) io.to(`church:${church_id}`).emit('notification', notification);
        if (notification.user_id) io.to(`user:${notification.user_id}`).emit('notification', notification);
        if (memberId) io.to(`member:${memberId}`).emit('notification', notification);
      }
    } catch (nErr) {
      console.warn('Failed to create notification for resolveAlert', nErr?.message || nErr);
    }
  })();
};

export const deleteAlert = async (req, res) => {
  const id = req.params.id;
  const row = await model.deleteAlert(id);
  res.json(row);
};

// Leadership Milestone Templates
export const updateMilestoneTemplate = async (req, res) => {
  const id = req.params.id;
  const row = await model.updateMilestoneTemplate({ id, ...req.body });
  res.json(row);
};

export const deleteMilestoneTemplate = async (req, res) => {
  const id = req.params.id;
  const row = await model.deleteMilestoneTemplate(id);
  res.json(row);
};

// Milestone Records
export const updateMilestoneRecord = async (req, res) => {
  const id = req.params.id;
  const row = await model.updateMilestoneRecord({ id, ...req.body });
  res.json(row);
};

export const deleteMilestoneRecord = async (req, res) => {
  const id = req.params.id;
  const row = await model.deleteMilestoneRecord(id);
  res.json(row);
};

// Leadership Exit Records
export const updateExitRecord = async (req, res) => {
  const id = req.params.id;
  const row = await model.updateExitRecord({ id, ...req.body });
  res.json(row);

  (async () => {
    try {
      const church_id = req.user.church_id;
      const user_id = req.user?.userId ?? req.user?.id ?? null;
      const memberId = row?.member_id ?? req.body.member_id ?? null;
      
      // Get member details for notification
      let memberDisplayName = '';
      if (memberId) {
        const member = await memberModel.getMemberById(memberId);
        memberDisplayName = member ? ` for member ${member.first_name} ${member.surname}`.trim() : ` for member ${memberId}`;
      }
      
      const title = 'Exit record updated';
      const message = `Exit record ${id} was updated${memberDisplayName}.`;
      const metadata = { action: 'exit_record_updated', exit_id: id };
      const link = memberId ? `/members/${memberId}/exits` : '/leadership/exits';

      const notification = await notificationModel.createNotification({
        church_id,
        member_id: memberId,
        user_id,
        title,
        message,
        channel: 'inapp',
        metadata,
        link
      });

      const io = getIO();
      if (io) {
        if (church_id) io.to(`church:${church_id}`).emit('notification', notification);
        if (notification.user_id) io.to(`user:${notification.user_id}`).emit('notification', notification);
        if (memberId) io.to(`member:${memberId}`).emit('notification', notification);
      }
    } catch (nErr) {
      console.warn('Failed to create notification for updateExitRecord', nErr?.message || nErr);
    }
  })();
};

export const deleteExitRecord = async (req, res) => {
  const id = req.params.id;
  const row = await model.deleteExitRecord(id);
  res.json(row);
};

// Mentorship Assignments
export const updateMentorshipAssignment = async (req, res) => {
  const id = req.params.id;
  const row = await model.updateMentorshipAssignment({ id, ...req.body });
  res.json(row);
};

export const deleteMentorshipAssignment = async (req, res) => {
  const id = req.params.id;
  const row = await model.deleteMentorshipAssignment(id);
  res.json(row);
};

// Pipeline
export const listPipeline = async (req, res) => {
  try {
    const query = `
      SELECT 
        lr.id,
        lr.member_id,
        m.first_name,
        m.surname,
        lr.role,
        lr.phase,
        lr.readiness_score as readiness,
        lr.created_at
      FROM leadership_roles lr
      JOIN members m ON lr.member_id = m.id
      WHERE lr.phase IS NOT NULL
      ORDER BY lr.readiness_score DESC, lr.created_at DESC
      LIMIT 20
    `;
    
    const [rows] = await db.query(query);
    res.json(rows);
  } catch (err) {
    console.error('List pipeline error', err);
    res.status(500).json({ error: 'Failed to fetch pipeline' });
  }
};
