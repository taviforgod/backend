import * as model from '../models/notificationModel.js';

export async function listNotifications(req, res) {
  const { church_id, userId: user_id, member_id } = req.user;
  const { page, limit, status, channel, q } = req.query;
  try {
    const result = await model.listNotifications({
      church_id,
      user_id,
      member_id,
      page: Number(page || 0),
      limit: Number(limit || 20),
      status,
      channel,
      q
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function getNotification(req, res) {
  const { church_id } = req.user;
  try {
    const notification = await model.getNotification(Number(req.params.id), church_id);
    if (!notification) return res.status(404).json({ error: "Not found" });
    res.json(notification);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function createNotification(req, res) {
  const { church_id, userId: user_id, member_id } = req.user;
  const { title, message, channel, metadata, link } = req.body;
  try {
    const notification = await model.createNotification({
      church_id,
      member_id,
      user_id,
      title,
      message,
      channel,
      metadata,
      link
    });
    res.status(201).json(notification);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

export async function updateNotification(req, res) {
  const { church_id } = req.user;
  try {
    const notification = await model.updateNotification(Number(req.params.id), church_id, req.body);
    if (!notification) return res.status(404).json({ error: "Not found" });
    res.json(notification);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

export async function deleteNotification(req, res) {
  const { church_id } = req.user;
  try {
    const deleted = await model.deleteNotification(Number(req.params.id), church_id);
    if (!deleted) return res.status(404).json({ error: "Not found" });
    res.json(deleted);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

export async function markNotificationRead(req, res) {
  const { church_id } = req.user;
  try {
    const updated = await model.markRead(Number(req.params.id), church_id);
    if (!updated) return res.status(404).json({ error: "Not found" });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function markAllNotificationsRead(req, res) {
  const { church_id, userId: user_id, member_id } = req.user;
  try {
    const ids = await model.markAllRead(church_id, user_id, member_id ?? null);
    res.json({ updated: ids.length, ids });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}