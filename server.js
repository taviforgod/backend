// backend/server.js
import 'dotenv/config';
import http from 'http';
import app from './app.js';
import { initSocket } from './config/socket.js';

const PORT = process.env.PORT || 5000;

// create an HTTP server from the Express app (required/reliable for Socket.IO)
const server = http.createServer(app);

// initialize Socket.IO with the HTTP server
initSocket(server);

// start listening
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});

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


