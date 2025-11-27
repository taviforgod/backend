import * as model from '../models/analyticsModel.js';

// GET /api/analytics/cell-health?weeks=8
export async function cellHealthDashboard(req, res) {
  try {
    const churchId = req.user?.church_id;
    const weeks = Number(req.query.weeks || 8);
    if (!churchId) return res.status(400).json({ error: 'church_id required' });
    const data = await model.getCellHealthDashboard(churchId, { weeks });
    res.json(data);
  } catch (err) {
    console.error('cellHealthDashboard error', err);
    res.status(500).json({ error: err.message || 'Failed to fetch cell health' });
  }
}

// GET /api/analytics/consolidated?month=11&year=2025
export async function consolidatedReport(req, res) {
  try {
    const churchId = req.user?.church_id;
    const month = Number(req.query.month);
    const year = Number(req.query.year);
    if (!churchId || !month || !year) return res.status(400).json({ error: 'church_id, month and year required' });
    const data = await model.getConsolidatedReport(churchId, month, year);
    res.json(data);
  } catch (err) {
    console.error('consolidatedReport error', err);
    res.status(500).json({ error: err.message || 'Failed to fetch consolidated meetings' });
  }
}

// GET /api/analytics/absentees?weeks=12
export async function absenteeTrends(req, res) {
  try {
    const churchId = req.user?.church_id;
    const weeks = Number(req.query.weeks || 12);
    if (!churchId) return res.status(400).json({ error: 'church_id required' });
    const data = await model.getAbsenteeTrends(churchId, { weeks });
    res.json(data);
  } catch (err) {
    console.error('absenteeTrends error', err);
    res.status(500).json({ error: err.message || 'Failed to fetch absentee trends' });
  }
}

// GET /api/analytics/at-risk?weeks=12&threshold=3
export async function atRiskMembers(req, res) {
  try {
    const churchId = req.user?.church_id;
    const weeks = Number(req.query.weeks || 12);
    const threshold = Number(req.query.threshold || 3);
    if (!churchId) return res.status(400).json({ error: 'church_id required' });
    const data = await model.getAtRiskMembers(churchId, { weeks, threshold });
    res.json(data);
  } catch (err) {
    console.error('atRiskMembers error', err);
    res.status(500).json({ error: err.message || 'Failed to fetch at-risk members' });
  }
}