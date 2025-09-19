
import {
  createPrayerRequest,
  getPrayerRequests,
  getPrayerById,
  updatePrayerRequest,
  assignPrayerRequest,
  addFollowUp,
  closePrayerRequest,
  countUrgentOpen,
  avgTimeToFirstContactSeconds,
  trendByCategory
} from '../models/prayerModel.js';

export const listPrayers = async (req, res) => {
  try {
    const church_id = req.user?.church_id;
    const { limit = 100, offset = 0, status, urgency, assigned_to, q } = req.query;
    const rows = await getPrayerRequests({ church_id, limit: Number(limit), offset: Number(offset), filters: { status, urgency, assigned_to, q } });
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getPrayerCtrl = async (req, res) => {
  try {
    const church_id = req.user?.church_id;
    const id = req.params.id;
    const row = await getPrayerById(id, church_id);
    if (!row) return res.status(404).json({ error: 'Not found' });
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const createPrayerCtrl = async (req, res) => {
  try {
    const church_id = req.user?.church_id;
    const data = { ...req.body, church_id, created_by: req.user?.id || null };
    const created = await createPrayerRequest(data);
    res.status(201).json(created);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

export const updatePrayerCtrl = async (req, res) => {
  try {
    const updated = await updatePrayerRequest(req.params.id, req.user?.church_id, req.body);
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

export const assignPrayerCtrl = async (req, res) => {
  try {
    const updated = await assignPrayerRequest(req.params.id, req.user?.church_id, req.body.assigned_to, req.user?.id);
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

export const addFollowupCtrl = async (req, res) => {
  try {
    const follow = await addFollowUp(req.params.id, req.body.note, req.user?.id, req.body.method, req.body.contacted_at);
    res.status(201).json(follow);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

export const closePrayerCtrl = async (req, res) => {
  try {
    const closed = await closePrayerRequest(req.params.id, req.user?.church_id, req.body.outcome, req.body.resolution_notes, req.user?.id);
    res.json(closed);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

export const urgentCountCtrl = async (req, res) => {
  const cnt = await countUrgentOpen(req.user?.church_id);
  res.json({ urgent_open: cnt });
};

export const slaCtrl = async (req, res) => {
  const seconds = await avgTimeToFirstContactSeconds(req.user?.church_id);
  res.json({ avg_first_contact_seconds: Number(seconds) });
};

export const trendCtrl = async (req, res) => {
  const days = Number(req.query.days) || 90;
  const data = await trendByCategory(req.user?.church_id, days);
  res.json(data);
};
