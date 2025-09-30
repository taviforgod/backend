import * as model from '../models/foundationModel.js';
import db from '../config/db.js';

export const getByMember = async (req, res) => {
  const churchId = req.user.church_id;
  const rows = await model.getEnrollmentByMember(churchId, req.params.member_id);
  res.json(rows);
};

export const createEnrollment = async (req, res) => {
  const churchId = req.user.church_id;
  const { member_id, level, status, notes } = req.body;
  if (!member_id) return res.status(400).json({ error: 'member_id required' });
  const e = await model.createEnrollment({ church_id: churchId, member_id, level, status, notes });
  res.status(201).json(e);
};

export const updateEnrollment = async (req, res) => {
  const churchId = req.user.church_id;
  const id = req.params.id;
  const updated = await model.updateEnrollment(churchId, id, req.body);
  res.json(updated);
};

export const deleteEnrollment = async (req, res) => {
  const churchId = req.user.church_id;
  await model.deleteEnrollment(churchId, req.params.id);
  res.status(204).send();
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
