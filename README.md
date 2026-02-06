Notifications + Messageboard module
----------------------------------

Files included:
- migrations/0001_create_notifications.sql
- migrations/0002_messageboard_and_indexes.sql
- models/
- controllers/
- routes/
- middleware/
- utils/
- socket/
- services/

Quick setup:
1. Run migrations against your Postgres DB.
   psql $DATABASE_URL -f backend/migrations/0001_create_notifications.sql
   psql $DATABASE_URL -f backend/migrations/0002_messageboard_and_indexes.sql

2. Mount routes in your Express app:
   import notificationsRoutes from './routes/notificationsRoutes.js';
   import messageboardRoutes from './routes/messageboardRoutes.js';
   app.use('/api/notifications', notificationsRoutes);
   app.use('/api/messageboard', messageboardRoutes);

3. Initialize socket.io server:
   import { initSocket } from './socket/index.js';
   const server = app.listen(PORT);
   initSocket(server);

4. Ensure your auth middleware sets req.user with church_id and user_id / member_id.

No Redis required. Rate limiting is DB-based.
