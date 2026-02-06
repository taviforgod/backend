import express from 'express';
import { getIO } from '../config/socket.js'; // adjust path if your socket helper is elsewhere
const router = express.Router();

// POST { userId?: number, title?: string, message?: string, broadcast?: boolean }
router.post('/emit-notif', (req, res) => {
  try {
    const { userId, title = 'Test Notification', message = 'Hello from server', broadcast = false, data = {} } = req.body || {};
    const io = getIO();
    const payload = { id: Date.now(), title, message, data };

    if (!io) {
      return res.status(500).json({ error: 'socket.io not initialized on server' });
    }

    if (broadcast || !userId) {
      io.emit('notification', payload);
      return res.json({ ok: true, emitted: 'broadcast', payload });
    }

    // emit to a user room; change room name if your server uses a different convention
    io.to(`user:${userId}`).emit('notification', payload);
    return res.json({ ok: true, emitted: `user:${userId}`, payload });
  } catch (err) {
    console.error('debug emit failed', err);
    return res.status(500).json({ error: 'failed', details: err?.message });
  }
});

export default router;