import * as model from '../models/foundationModel.js';

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
