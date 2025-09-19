

// backend/server.js
import 'dotenv/config';
import app from './app.js';
import { initSocket } from './socket/index.js';

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});

// Initialize socket.io with the same server instance
try {
  initSocket(server);
  console.log('Socket.io initialized and attached to server');
} catch (err) {
  console.warn('Socket init failed', err);
}

// Graceful shutdown
const shutdown = (signal) => {
  console.log(`Received ${signal}. Shutting down gracefully...`);
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
  setTimeout(() => {
    console.error('Forcefully shutting down');
    process.exit(1);
  }, 10_000).unref();
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

process.on('unhandledRejection', (err) => {
  console.error('UnhandledRejection', err);
});
process.on('uncaughtException', (err) => {
  console.error('UncaughtException', err);
  process.exit(1);
});
