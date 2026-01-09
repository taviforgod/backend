import * as model from '../models/leadershipModel.js';
import * as notificationModel from '../models/notificationModel.js';
import { getIO } from '../config/socket.js';
 
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
      const title = 'Promotion recorded';
      const message = `A promotion was recorded${memberId ? ` for member ${memberId}` : ''}.`;
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
 
 // Leadership Alerts
 export const createAlert = async (req, res) => {
   const row = await model.addAlert({ ...req.body, church_id: req.user.church_id });
   res.status(201).json(row);

  (async () => {
    try {
      const church_id = req.user.church_id;
      const user_id = req.user?.userId ?? req.user?.id ?? null;
      const targetId = req.body.member_id ?? row?.member_id ?? null;
      const title = 'Leadership alert created';
      const message = `An alert was created${targetId ? ` for member ${targetId}` : ''}.`;
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
 
 // Leadership Milestones
 export const createMilestoneTemplate = async (req, res) => {
   const row = await model.addMilestoneTemplate({ ...req.body, church_id: req.user.church_id });
   res.status(201).json(row);

  (async () => {
    try {
      const church_id = req.user.church_id;
      const user_id = req.user?.userId ?? req.user?.id ?? null;
      const title = 'Milestone template created';
      const message = `Milestone template "${row?.name || req.body.name || 'Untitled'}" was created.`;
      const metadata = { action: 'milestone_template_created', template_id: row?.id ?? null };
      const link = `/leadership/milestones/templates/${row?.id ?? ''}`;

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
      console.warn('Failed to create notification for createMilestoneTemplate', nErr?.message || nErr);
    }
  })();
 };
 export const createMilestoneRecord = async (req, res) => {
   const row = await model.addMilestoneRecord({ ...req.body, church_id: req.user.church_id });
   res.status(201).json(row);

  (async () => {
    try {
      const church_id = req.user.church_id;
      const user_id = req.user?.userId ?? req.user?.id ?? null;
      const memberId = req.body.member_id ?? row?.member_id ?? null;
      const title = 'Milestone recorded';
      const message = `A milestone was recorded${memberId ? ` for member ${memberId}` : ''}.`;
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
     const title = 'Leadership exit recorded';
     const message = `A leadership exit was recorded${memberId ? ` for member ${memberId}` : ''}.`;
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
      const title = 'Promotion updated';
      const message = `Promotion ${id} was updated${memberId ? ` for member ${memberId}` : ''}.`;
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
      const title = 'Alert resolved';
      const message = `Alert ${id} was resolved${memberId ? ` for member ${memberId}` : ''}.`;
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
      const title = 'Exit record updated';
      const message = `Exit record ${id} was updated${memberId ? ` for member ${memberId}` : ''}.`;
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
