import * as model from '../models/exitTypeMapModel.js';

export const list = async (req, res) => {
  try {
    const rows = await model.listMappings();
    res.json(rows);
  } catch (err) {
    console.error('adminExitTypeMapCtrl.list', err);
    res.status(500).json({ error: 'Failed to list mappings' });
  }
};

export const get = async (req, res) => {
  try {
    const exit_type = req.params.exit_type;
    const row = await model.getMapping(exit_type);
    if (!row) return res.status(404).json({ error: 'Mapping not found' });
    res.json(row);
  } catch (err) {
    console.error('adminExitTypeMapCtrl.get', err);
    res.status(500).json({ error: 'Failed to get mapping' });
  }
};

export const upsert = async (req, res) => {
  try {
    const { exit_type, member_status_id } = req.body;
    if (!exit_type) return res.status(400).json({ error: 'exit_type required' });
    if (!member_status_id) return res.status(400).json({ error: 'member_status_id required' });
    const row = await model.createOrUpdateMapping({ exit_type, member_status_id });
    res.json(row);
  } catch (err) {
    console.error('adminExitTypeMapCtrl.upsert', err);
    res.status(500).json({ error: 'Failed to create/update mapping' });
  }
};

export const remove = async (req, res) => {
  try {
    const exit_type = req.params.exit_type;
    const row = await model.deleteMapping(exit_type);
    if (!row) return res.status(404).json({ error: 'Mapping not found' });
    res.json(row);
  } catch (err) {
    console.error('adminExitTypeMapCtrl.remove', err);
    res.status(500).json({ error: 'Failed to delete mapping' });
  }
};

export default { list, get, upsert, remove };
