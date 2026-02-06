import * as model from '../models/milestoneTemplateModel.js';
import * as notificationModel from '../models/notificationModel.js';
import { getIO } from '../config/socket.js';

export const listTemplates = async (req, res) => {
  try {
    const church_id = req.user?.church_id;
    if (!church_id) return res.status(400).json({ message: 'church_id required' });
    const list = await model.getAllTemplates(church_id);
    res.json(list);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

export const getTemplate = async (req, res) => {
  try {
    const church_id = req.user?.church_id;
    const id = req.params.id;
    if (!church_id || !id) return res.status(400).json({ message: 'church_id and id required' });
    const t = await model.getTemplateById(church_id, id);
    if (!t) return res.status(404).json({ message: 'not found' });
    res.json(t);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

export const createTemplateCtrl = async (req, res) => {
  try {
    const church_id = req.user?.church_id;
    const { name, description, required_for_promotion } = req.body;
    if (!church_id || !name) return res.status(400).json({ message: 'church_id and name required' });
    const created = await model.createTemplate({ church_id, name, description, required_for_promotion });
    res.status(201).json(created);

    // best-effort notification (non-blocking)
    (async () => {
      try {
        const user_id = req.user?.userId ?? req.user?.id ?? null;
        const title = 'Milestone template created';
        const message = `Template "${created?.name || name}" was created.`;
        const metadata = { action: 'milestone_template_created', template_id: created?.id ?? null };
        const link = `/leadership/milestones/templates/${created?.id ?? ''}`;

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
        console.warn('Failed to create notification for createTemplateCtrl', nErr?.message || nErr);
      }
    })();
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

export const updateTemplateCtrl = async (req, res) => {
  try {
    const church_id = req.user?.church_id;
    const id = req.params.id;
    if (!church_id || !id) return res.status(400).json({ message: 'church_id and id required' });
    const updated = await model.updateTemplate(church_id, id, req.body);
    res.json(updated);

    // best-effort notification (non-blocking)
    (async () => {
      try {
        const user_id = req.user?.userId ?? req.user?.id ?? null;
        const title = 'Milestone template updated';
        const message = `Template "${req.body.name || updated?.name || id}" was updated.`;
        const metadata = { action: 'milestone_template_updated', template_id: id };
        const link = `/leadership/milestones/templates/${id}`;

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
        console.warn('Failed to create notification for updateTemplateCtrl', nErr?.message || nErr);
      }
    })();
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

export const deleteTemplateCtrl = async (req, res) => {
  try {
    const church_id = req.user?.church_id;
    const id = req.params.id;
    if (!church_id || !id) return res.status(400).json({ message: 'church_id and id required' });
    const deleted = await model.deleteTemplate(church_id, id);
    if (!deleted) return res.status(404).json({ message: 'not found' });
    res.json({ ok: true, deleted });

    // best-effort notification (non-blocking)
    (async () => {
      try {
        const user_id = req.user?.userId ?? req.user?.id ?? null;
        const title = 'Milestone template deleted';
        const message = `Template ${id} was deleted.`;
        const metadata = { action: 'milestone_template_deleted', template_id: id };
        const link = '/leadership/milestones/templates';

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
        console.warn('Failed to create notification for deleteTemplateCtrl', nErr?.message || nErr);
      }
    })();
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};
