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
    if (!church_id) return res.status(400).json({ error: 'Church not specified' });

    const { limit = 100, offset = 0, status, urgency, assigned_to, q } = req.query;
    const filters = { status, urgency, assigned_to, q };
    const rows = await getPrayerRequests({ church_id, limit: Number(limit), offset: Number(offset), filters });
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to list prayer requests' });
  }
};

export const getPrayerCtrl = async (req, res) => {
  try {
    const church_id = req.user?.church_id;
    const id = req.params.id;
    if (!church_id) return res.status(400).json({ error: 'Church not specified' });
    const row = await getPrayerById(id, church_id);
    if (!row) return res.status(404).json({ error: 'Prayer request not found' });
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to get prayer request' });
  }
};

export const createPrayerCtrl = async (req, res) => {
  try {
    const church_id = req.user?.church_id;
    if (!church_id) return res.status(400).json({ error: 'Church not specified' });

    const data = {
      member_id: req.body.member_id || null,
      church_id,
      created_by: req.user?.id || null,
      category: req.body.category,
      sub_category: req.body.sub_category,
      urgency: req.body.urgency || 'normal',
      preferred_contact_method: req.body.preferred_contact_method,
      contact_details: req.body.contact_details,
      description: req.body.description,
      confidentiality: req.body.confidentiality !== undefined ? req.body.confidentiality : true
    };

    const created = await createPrayerRequest(data);
    res.status(201).json(created);
  } catch (err) {
    res.status(400).json({ error: err.message || 'Failed to create prayer request' });
  }
};

export const updatePrayerCtrl = async (req, res) => {
  try {
    const church_id = req.user?.church_id;
    const id = req.params.id;
    if (!church_id) return res.status(400).json({ error: 'Church not specified' });
    const updates = req.body;
    const updated = await updatePrayerRequest(id, church_id, updates);
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message || 'Failed to update prayer request' });
  }
};

export const assignPrayerCtrl = async (req, res) => {
  try {
    const church_id = req.user?.church_id;
    const id = req.params.id;
    const { assigned_to } = req.body;
    if (!church_id) return res.status(400).json({ error: 'Church not specified' });
    if (!assigned_to) return res.status(400).json({ error: 'assigned_to (member id) required' });

    const updated = await assignPrayerRequest(id, church_id, assigned_to, req.user?.id || null);
    res.json(updated);
  } catch (err) {
    if (err && err.code === 'INVALID_MEMBER') {
      return res.status(400).json({ error: err.message || 'Invalid assignee' });
    }
    res.status(400).json({ error: err.message || 'Failed to assign prayer request' });
  }
};

export const addFollowupCtrl = async (req, res) => {
  try {
    const church_id = req.user?.church_id;
    const id = req.params.id;
    const { note, method, contacted_at } = req.body;
    const prayer = await getPrayerById(id, church_id);
    if (!prayer) return res.status(404).json({ error: 'Prayer request not found' });

    const follow = await addFollowUp(id, note, req.user?.id || null, method || null, contacted_at || null);
    res.status(201).json(follow);
  } catch (err) {
    res.status(400).json({ error: err.message || 'Failed to add follow-up' });
  }
};

export const closePrayerCtrl = async (req, res) => {
  try {
    const church_id = req.user?.church_id;
    const id = req.params.id;
    const { outcome, resolution_notes } = req.body;
    if (!church_id) return res.status(400).json({ error: 'Church not specified' });
    const closed = await closePrayerRequest(id, church_id, outcome, resolution_notes, req.user?.id || null);
    res.json(closed);
  } catch (err) {
    res.status(400).json({ error: err.message || 'Failed to close prayer request' });
  }
};

export const urgentCountCtrl = async (req, res) => {
  try {
    const church_id = req.user?.church_id;
    const cnt = await countUrgentOpen(church_id);
    res.json({ urgent_open: cnt });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to get urgent count' });
  }
};

export const slaCtrl = async (req, res) => {
  try {
    const church_id = req.user?.church_id;
    const seconds = await avgTimeToFirstContactSeconds(church_id);
    res.json({ avg_first_contact_seconds: Number(seconds) });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to compute SLA' });
  }
};

export const trendCtrl = async (req, res) => {
  try {
    const church_id = req.user?.church_id;
    const days = Number(req.query.days) || 90;
    const data = await trendByCategory(church_id, days);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to get trends' });
  }
};
