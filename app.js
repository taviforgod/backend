import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser'; 
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import roleRoutes from './routes/roleRoutes.js';
import permissionRoutes from './routes/permissionRoutes.js';
import memberRoutes from './routes/memberRoutes.js';
import lookupRoutes from './routes/lookupRoutes.js';
import milestoneRecordRoutes from './routes/milestoneRecords.js';
import milestoneTemplateRoutes from './routes/milestoneTemplates.js';
import cellModuleRoutes from './routes/cellModuleRoutes.js';
import nameSafeRoutes from './routes/nameSafeRoutes.js';
import messageboardRoutes from './routes/messageboardRoutes.js';
import notificationsRoutes from './routes/notificationsRoutes.js';
import foundationRouter from './routes/foundation.js';
import mentorshipRouter from './routes/mentorship.js'
import prayerRoutes from './routes/prayerRoutes.js';
import leadershipRoutes from './routes/leadershipRoutes.js';
import evangelismRoutes from './routes/evangelismRoutes.js';
import evangelismEventRoutes from './routes/evangelismEventRoutes.js';
import evangelismImportRoutes from './routes/evangelismImportRoutes.js';

const app = express();

app.use(cors({
  origin: process.env.FRONTEND_ORIGIN || 'http://localhost:3000', 
  credentials: true
}));

app.use(express.json());
app.use(cookieParser()); 

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/permissions', permissionRoutes);
app.use('/api/members', memberRoutes);
app.use('/api/lookups', lookupRoutes);
app.use('/api/milestone-records', milestoneRecordRoutes);
app.use('/api/milestone-templates', milestoneTemplateRoutes);
app.use('/api/cell-groups', cellModuleRoutes);
app.use('/api/name-safe', nameSafeRoutes);
app.use('/api/message-board', messageboardRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/foundation', foundationRouter);
app.use('/api/mentorship', mentorshipRouter);
app.use('/api/prayer', prayerRoutes);
app.use('/api/leadership', leadershipRoutes);
app.use('/api/evangelism', evangelismRoutes);
app.use('/api/evangelism/events', evangelismEventRoutes);
app.use('/api/evangelism/import', evangelismImportRoutes);

// basic auth endpoints stub (login/logout/profile) - implement in your app
app.post('/api/auth/logout', (req, res) => { res.json({ ok: true }); });


export default app;
