import * as model from '../models/crisisFollowupModel.js';

export async function getAllCrisisFollowups(req, res) {
  try {
    const church_id = req.user?.church_id || req.query.church_id;
    const { is_active, crisis_type } = req.query;
    const records = await model.getAllCrisisFollowups({
      church_id,
      is_active: is_active === undefined ? true : is_active === 'true',
      crisis_type
    });
    res.json(records);
  } catch (err) {
    console.error('getAllCrisisFollowups failed', err);
    res.status(500).json({ message: 'Failed to fetch crisis records' });
  }
}

export async function getCrisisFollowupById(req, res) {
  try {
    const record = await model.getCrisisFollowupById(req.params.id);
    if (!record) return res.status(404).json({ message: 'Not found' });
    res.json(record);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

export async function createCrisisFollowup(req, res) {
  try {
    const data = { ...req.body, reported_by: req.user?.id };
    if (!data.church_id) data.church_id = req.user?.church_id;
    const record = await model.createCrisisFollowup(data);
    res.status(201).json(record);
  } catch (err) {
    console.error('createCrisisFollowup failed', err);
    res.status(400).json({ message: err.message });
  }
}

export async function updateCrisisFollowup(req, res) {
  try {
    const updated = await model.updateCrisisFollowup(req.params.id, req.body);
    res.json(updated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
}

export async function deleteCrisisFollowup(req, res) {
  try {
    const ok = await model.deleteCrisisFollowup(req.params.id);
    if (!ok) return res.status(404).json({ message: 'Record not found' });
    res.json({ message: 'Crisis record closed' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

export async function getCrisisSummary(req, res) {
  try {
    const church_id = req.user?.church_id || req.query.church_id;
    const summary = await model.getCrisisSummary(church_id);
    res.json(summary);
  } catch (err) {
    console.error('getCrisisSummary failed', err);
    res.status(500).json({ message: 'Failed to load summary' });
  }
}
