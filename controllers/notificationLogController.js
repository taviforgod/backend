import * as logModel from '../models/notificationLogModel.js';

export const getLogs = async (req, res) => {
  try {
    const church_id = req.user?.church_id;
    if (!church_id) return res.status(400).json({ error: 'Church ID required' });

    const filters = {
      status: req.query.status,
      channel: req.query.channel,
      user_id: req.query.user_id,
      member_id: req.query.member_id,
      date_from: req.query.date_from,
      date_to: req.query.date_to
    };

    const pagination = {
      limit: req.query.limit ? parseInt(req.query.limit) : 50,
      offset: req.query.offset ? parseInt(req.query.offset) : 0
    };

    const result = await logModel.getLogs(church_id, filters, pagination);
    res.json(result);
  } catch (err) {
    console.error('Error fetching notification logs:', err);
    res.status(500).json({ error: 'Failed to fetch notification logs' });
  }
};

export const getDeliveryStats = async (req, res) => {
  try {
    const church_id = req.user?.church_id;
    if (!church_id) return res.status(400).json({ error: 'Church ID required' });

    const dateRange = {
      from: req.query.from,
      to: req.query.to
    };

    const stats = await logModel.getDeliveryStats(church_id, dateRange);
    res.json(stats);
  } catch (err) {
    console.error('Error fetching delivery stats:', err);
    res.status(500).json({ error: 'Failed to fetch delivery statistics' });
  }
};

export default {
  getLogs,
  getDeliveryStats
};