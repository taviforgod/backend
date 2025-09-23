import * as model from '../models/milestoneRecordModel.js';
import { sendNotification } from '../services/notificationService.js';
import db from '../config/db.js';

export const getByMember = async (req, res) => {
  try {
    const church_id = req.user?.church_id;
    const member_id = req.params.member_id;
    if (!church_id || !member_id) return res.status(400).json({ message: 'church_id and member_id required' });
    const rows = await model.getByMember(church_id, member_id);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

export const createRecordCtrl = async (req, res) => {
  try {
    const church_id = req.user?.church_id;
    const payload = { ...req.body, church_id };
    if (!church_id) return res.status(400).json({ message: 'church_id required' });
    if (!payload.member_id) return res.status(400).json({ message: 'member_id required' });
    if (!payload.template_id && !payload.milestone_name) {
      return res.status(400).json({ message: 'template_id or milestone_name required' });
    }
    const rec = await model.createRecord(payload);
    try {
      await sendNotification(payload.member_id, 'Milestone Recorded', `Milestone ${rec.milestone_name} recorded.`);
    } catch (e) {
      console.error(e);
    }
    res.status(201).json({ ok: true, record: rec });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

export const deleteRecordCtrl = async (req, res) => {
  try {
    const church_id = req.user?.church_id;
    const id = req.params.id;
    if (!church_id || !id) return res.status(400).json({ message: 'church_id and id required' });
    const record = await model.deleteRecord(church_id, id);
    if (!record) return res.status(404).json({ message: 'not found' });
    res.json({ ok: true, deleted: record });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

export const getAllRecords = async (req, res) => {
  try {
    const church_id = req.user?.church_id;
    if (!church_id) return res.status(400).json({ message: 'church_id required' });
    const all = await model.getAllRecords(church_id);
    res.json(all);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

export const getByCurrentUser = async (req, res) => {
  const userId = req.user.id || req.user.userId;
  const churchId = req.user.church_id;
  const memberRes = await db.query(
    'SELECT id FROM members WHERE user_id = $1 AND church_id = $2 LIMIT 1',
    [userId, churchId]
  );
  const memberId = memberRes.rows[0]?.id;
  if (!memberId) return res.status(404).json({ error: 'No member found for user' });
  return getByMember({ ...req, params: { member_id: memberId } }, res);
};
