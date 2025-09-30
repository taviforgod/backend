import * as model from '../models/notificationsModel.js';
import * as prefModel from './preferencesModelStub.js';

export const listNotifications = async (req, res) => {
  const church_id = req.user?.church_id;
  const user_id = req.user?.user_id;
  const member_id = req.user?.member_id;
  if (!church_id) return res.status(400).json({ message: 'church_id required' });

  const page = Math.max(0, Number(req.query.page || 0));
  const limit = Math.min(200, Number(req.query.limit || 20));
  const status = req.query.status;
  const channel = req.query.channel;
  const q = req.query.q;

  let allowedChannels = null;
  try {
    const prefs = await prefModel.getPreferencesForUser(church_id, member_id);
    const defaults = { in_app: true, email: true, sms: false, whatsapp: false };
    const channelsObj = prefs?.channels ?? defaults;
    allowedChannels = Object.keys(channelsObj).filter(k => channelsObj[k]);
    if (!allowedChannels.length) return res.json({ total: 0, page, limit, notifications: [] });
  } catch (err) {
    allowedChannels = null;
  }

  const result = await model.listNotifications({
    church_id, user_id, member_id, page, limit, status, channel, q, allowedChannels: channel ? [channel] : allowedChannels
  });
  res.json(result);
};

export const getNotification = async (req, res) => {
  const church_id = req.user?.church_id;
  if (!church_id) return res.status(400).json({ message: 'church_id required' });
  const id = Number(req.params.id);
  const row = await model.getNotificationById({ id, church_id });
  if (!row) return res.status(404).json({ message: 'Not found' });
  res.json(row);
};

export const markRead = async (req, res) => {
  const church_id = req.user?.church_id;
  const user_id = req.user?.user_id;
  const member_id = req.user?.member_id;
  const id = Number(req.params.id);
  const updated = await model.markNotificationRead({ id, church_id, user_id, member_id });
  if (!updated) return res.status(404).json({ message: 'Not found' });
  res.json({ ok: true, notification: updated });
};

export const markAllRead = async (req, res) => {
  const church_id = req.user?.church_id;
  const user_id = req.user?.user_id;
  const member_id = req.user?.member_id;
  const result = await model.markAllRead({ church_id, user_id, member_id });
  res.json({ ok: true, ...result });
};

export const deleteNotification = async (req, res) => {
  const church_id = req.user?.church_id;
  const id = Number(req.params.id);
  const deleted = await model.deleteNotification({ id, church_id });
  if (!deleted) return res.status(404).json({ message: 'Not found' });
  res.json({ ok: true, deleted });
};
