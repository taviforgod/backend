import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';

let ioInstance = null;
export function initSocket(server) {
  console.log('[socket] initSocket called');
  if (ioInstance) return ioInstance;

  const origin = process.env.FRONTEND_ORIGIN || 'http://localhost:3000';
  const io = new Server(server, { cors: { origin, credentials: true } });
  ioInstance = io;

  io.on('connection', (socket) => {
    console.log('[socket] connection:', socket.id);
    console.log('[socket] handshake.auth:', socket.handshake.auth);
    console.log('[socket] handshake.headers.origin:', socket.handshake.headers?.origin);
    try {
      const token = socket.handshake.auth?.token;
      if (token) {
        const user = jwt.verify(token, process.env.JWT_SECRET || 'supersecret');
        console.log('[socket] token valid, user:', { id: user.userId || user.id, church_id: user.church_id });
        // optionally join rooms...
      } else {
        console.log('[socket] no token provided in handshake.auth');
      }
    } catch (err) {
      console.warn('[socket] token verify failed', err.message || err);
    }

    socket.on('disconnect', (reason) => console.log('[socket] disconnect', socket.id, reason));
  });

  console.log('[socket] initialized');
  return io;
}
export function getIO() {
  if (!ioInstance) throw new Error('Socket.io not initialized');
  return ioInstance;
}