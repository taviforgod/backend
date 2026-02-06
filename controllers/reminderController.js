import * as reminderModel from '../models/reminderModel.js';

export const getReminders = async (req, res) => {
  try {
    const church_id = req.user?.church_id;
    if (!church_id) return res.status(400).json({ error: 'Church ID required' });

    const filters = {
      type: req.query.type,
      active: req.query.active === 'true' ? true : req.query.active === 'false' ? false : undefined,
      limit: req.query.limit ? parseInt(req.query.limit) : undefined,
      offset: req.query.offset ? parseInt(req.query.offset) : undefined
    };

    const reminders = await reminderModel.getAllReminders(church_id, filters);
    res.json(reminders);
  } catch (err) {
    console.error('Error fetching reminders:', err);
    res.status(500).json({ error: 'Failed to fetch reminders' });
  }
};

export const getReminder = async (req, res) => {
  try {
    const { id } = req.params;
    const church_id = req.user?.church_id;

    if (!church_id) return res.status(400).json({ error: 'Church ID required' });

    const reminder = await reminderModel.getReminderById(id, church_id);
    if (!reminder) {
      return res.status(404).json({ error: 'Reminder not found' });
    }

    res.json(reminder);
  } catch (err) {
    console.error('Error fetching reminder:', err);
    res.status(500).json({ error: 'Failed to fetch reminder' });
  }
};

export const createReminder = async (req, res) => {
  try {
    const church_id = req.user?.church_id;
    const created_by = req.user?.id;

    if (!church_id) return res.status(400).json({ error: 'Church ID required' });

    const reminderData = {
      ...req.body,
      church_id,
      created_by
    };

    const reminder = await reminderModel.createReminder(reminderData);
    res.status(201).json(reminder);
  } catch (err) {
    console.error('Error creating reminder:', err);
    res.status(500).json({ error: 'Failed to create reminder' });
  }
};

export const updateReminder = async (req, res) => {
  try {
    const { id } = req.params;
    const church_id = req.user?.church_id;

    if (!church_id) return res.status(400).json({ error: 'Church ID required' });

    const reminder = await reminderModel.updateReminder(id, church_id, req.body);
    if (!reminder) {
      return res.status(404).json({ error: 'Reminder not found' });
    }

    res.json(reminder);
  } catch (err) {
    console.error('Error updating reminder:', err);
    res.status(500).json({ error: 'Failed to update reminder' });
  }
};

export const deleteReminder = async (req, res) => {
  try {
    const { id } = req.params;
    const church_id = req.user?.church_id;

    if (!church_id) return res.status(400).json({ error: 'Church ID required' });

    const reminder = await reminderModel.deleteReminder(id, church_id);
    if (!reminder) {
      return res.status(404).json({ error: 'Reminder not found' });
    }

    res.json({ message: 'Reminder deleted successfully' });
  } catch (err) {
    console.error('Error deleting reminder:', err);
    res.status(500).json({ error: 'Failed to delete reminder' });
  }
};

export const getUpcomingReminders = async (req, res) => {
  try {
    const church_id = req.user?.church_id;
    const limit = req.query.limit ? parseInt(req.query.limit) : 10;

    if (!church_id) return res.status(400).json({ error: 'Church ID required' });

    const reminders = await reminderModel.getUpcomingReminders(church_id, limit);
    res.json(reminders);
  } catch (err) {
    console.error('Error fetching upcoming reminders:', err);
    res.status(500).json({ error: 'Failed to fetch upcoming reminders' });
  }
};

export default {
  getReminders,
  getReminder,
  createReminder,
  updateReminder,
  deleteReminder,
  getUpcomingReminders
};