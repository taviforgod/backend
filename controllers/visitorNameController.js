import * as model from '../models/visitorNameModel.js';

/** No IDs in response */
export const listVisitorsNameSafe = async (req, res) => {
  res.json(await model.getVisitorsNameSafe(req.user?.church_id));
};

export const createVisitor = async (req, res) => {
  const church_id = req.user?.church_id;
  res.status(201).json(await model.createVisitor({ ...req.body, church_id }));
};

export const updateVisitor = async (req, res) => {
  const church_id = req.user?.church_id;
  res.json(await model.updateVisitorByName({ ...req.body, church_id }));
};

export const deleteVisitor = async (req, res) => {
  const church_id = req.user?.church_id;
  try {
    if (req.body.id) {
      // Delete by ID if provided
      const deleted = await model.deleteVisitorById(req.body.id, church_id);
      if (!deleted) return res.status(404).json({ error: 'Visitor not found' });
    } else {
      // Fallback to name-based delete
      const deleted = await model.deleteVisitorByName({ ...req.body, church_id });
      if (!deleted) return res.status(404).json({ error: 'Visitor not found' });
    }
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const updateVisitorFollowUpStatus = async (req, res) => {
  const { id, follow_up_status } = req.body;
  res.json(await model.updateVisitorFollowUpStatusById({ id, follow_up_status }));
};

export const convertVisitorByName = async (req, res) => {
  const { id, cell_group_name } = req.body;
  res.json(await model.convertVisitorById({ id, cell_group_name }));
};

export const exportVisitorCSV = async (req, res) => {
  const church_id = req.user?.church_id;
  const { first_name, surname } = req.body;
  try {
    const csv = await model.exportVisitorCSV({ church_id, first_name, surname });
    res.header('Content-Type', 'text/csv');
    res.attachment('visitor.csv');
    res.send(csv);
  } catch (e) {
    res.status(404).json({ error: e.message });
  }
};

export const exportVisitorExcel = async (req, res) => {
  const church_id = req.user?.church_id;
  const { first_name, surname } = req.body;
  try {
    const buffer = await model.exportVisitorExcel({ church_id, first_name, surname });
    res.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.attachment('visitor.xlsx');
    res.send(buffer);
  } catch (e) {
    res.status(404).json({ error: e.message });
  }
};