import db from '../config/db.js';
import { getSpiritualGrowthSummary } from '../models/spiritualModel.js';

export const getSummary = async (req, res) => {
  try {
    const churchId = req.user?.church_id;
    if (!churchId) return res.status(400).json({ error: 'Church not specified' });

    const [{ rows: totalRows }, { rows: newRows }] = await Promise.all([
      db.query('SELECT COUNT(*)::int AS total_members FROM members WHERE church_id = $1', [churchId]),
      db.query("SELECT COUNT(*)::int AS new_members_last_30_days FROM members WHERE church_id = $1 AND created_at >= now() - interval '30 days'", [churchId])
    ]);

    return res.json({
      total_members: totalRows[0]?.total_members ?? 0,
      new_members_last_30_days: newRows[0]?.new_members_last_30_days ?? 0
    });
  } catch (err) {
    console.error('spiritualGrowth.getSummary error', err);
    return res.status(500).json({ error: err.message || 'Failed to fetch spiritual growth summary' });
  }
};

export const getSpiritualSummaryCtrl = async (req, res) => {
  try {
    const churchId = req.user?.church_id || Number(req.query.church_id);
    if (!churchId) return res.status(400).json({ error: 'church_id required' });

    const period = req.query.period || '30d';
    const summary = await getSpiritualGrowthSummary(churchId, { period });
    return res.json(summary);
  } catch (err) {
    console.error('spiritual summary error', err);
    return res.status(500).json({ error: 'Failed to load spiritual summary' });
  }
};