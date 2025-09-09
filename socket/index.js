import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import cookie from 'cookie';
import { jwtSecret } from '../config/config.js';

let ioInstance = null;

export function initSocket(server) {
  if (ioInstance) return ioInstance;
  const io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_ORIGIN || 'http://localhost:3000',
      credentials: true
    }
  });

  io.on('connection', (socket) => {
    try {
      const rawCookie = socket.handshake.headers.cookie;
      let token;
      if (rawCookie) {
        const parsed = cookie.parse(rawCookie || '');
        token = parsed.token || null;
      }
      if (!token && socket.handshake.auth && socket.handshake.auth.token) {
        token = socket.handshake.auth.token;
      }
      if (!token) {
        socket.data.user = null;
      } else {
        try {
          const payload = jwt.verify(token, jwtSecret);
          socket.data.user = payload;
          const { user_id = payload.id, church_id } = payload;
          if (user_id) socket.join(`user:${user_id}`);
          if (church_id) socket.join(`church:${church_id}`);
        } catch (err) {
          socket.data.user = null;
        }
      }
    } catch (err) {
      console.error('socket connection error', err);
    }
  });

  ioInstance = io;
  console.log('Socket.io initialized');
  return io;
}

export function getIO() {
  if (!ioInstance) throw new Error('Socket.io not initialized');
  return ioInstance;
}
