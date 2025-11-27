import * as logModel from '../models/notificationLogModel.js';

export async function listLogs(req, res) {
  const { church_id } = req.user;
  const { page, limit, channel, status } = req.query;
  try {
    const data = await logModel.listLogs({
      church_id,
      channel,
      status,
      page: Number(page || 0),
      limit: Number(limit || 20)
    });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function getLog(req, res) {
  const { church_id } = req.user;
  try {
    const log = await logModel.getLog(Number(req.params.id), church_id);
    if (!log) return res.status(404).json({ error: 'Not found' });
    res.json(log);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function deleteLog(req, res) {
  const { church_id } = req.user;
  try {
    const deleted = await logModel.deleteLog(Number(req.params.id), church_id);
    if (!deleted) return res.status(404).json({ error: 'Not found' });
    res.json(deleted);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}