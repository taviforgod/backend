import * as preferenceModel from '../models/notificationPreferenceModel.js';

export const getPreferences = async (req, res) => {
  try {
    const user_id = req.user?.id ?? req.user?.userId;
    const church_id = req.user?.church_id ?? null;

    if (!user_id) return res.status(401).json({ message: 'Unauthorized' });

    let prefs = await preferenceModel.getByUserId(user_id);
    if (!prefs) {
      // Create default preferences if none exist
      prefs = await preferenceModel.create(user_id, church_id, {});
    }

    // Convert JSONB fields to objects before sending
    prefs.channels = prefs.channels || { in_app: true, email: true, sms: false, whatsapp: false };
    prefs.quiet_hours = prefs.quiet_hours || { start: "", end: "" };

    res.json(prefs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch preferences' });
  }
};

export const updatePreferences = async (req, res) => {
  try {
    const user_id = req.user?.id ?? req.user?.userId;
    if (!user_id) return res.status(401).json({ message: 'Unauthorized' });

    const updated = await preferenceModel.updateByUserId(user_id, req.body);

    updated.channels = updated.channels || { in_app: true, email: true, sms: false, whatsapp: false };
    updated.quiet_hours = updated.quiet_hours || { start: "", end: "" };

    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to update preferences' });
  }
};
