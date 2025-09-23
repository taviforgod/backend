import * as model from '../models/milestoneTemplateModel.js';

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
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};
