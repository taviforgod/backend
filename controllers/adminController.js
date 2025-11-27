import { createInAppNotification } from '../models/notificationsModel.js';

export async function sendAdminNotification(req, res) {
  try {
    const church_id = req.user.church_id;
    const { title, message, target_user_id, critical } = req.body;
    const options = {};
    if (critical) options.force = true;
    const payload = { church_id, user_id: target_user_id || null, title, message, channel: 'in_app', metadata: { source: 'admin', by: req.user.id } };
    const notif = await createInAppNotification(payload, options);
    return res.json({ ok: true, notification: notif });
  } catch (err) {
    if (err && (err.code === 'RATE_LIMIT_USER' || err.code === 'RATE_LIMIT_CHURCH')) {
      return res.status(429).json({ ok: false, message: err.message, code: err.code });
    }
    console.error('sendAdminNotification', err);
    return res.status(500).json({ message: err.message });
  }
}
