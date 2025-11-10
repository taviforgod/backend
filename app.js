import express from 'express';
import cors from 'cors';
import helmet from 'helmet';


// Routes
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import roleRoutes from './routes/roleRoutes.js';
import permissionRoutes from './routes/permissionRoutes.js';
import memberRoutes from './routes/memberRoutes.js';
import lookupRoutes from './routes/lookupRoutes.js';
import milestoneRecordRoutes from './routes/milestoneRecords.js';
import milestoneTemplateRoutes from './routes/milestoneTemplates.js';
import cellModuleRoutes from './routes/cellGroupRoutes.js';
import notificationRoutes from "./routes/notificationRoutes.js";
import notificationLogRoutes from "./routes/notificationLogRoutes.js";
import notificationJobRoutes from "./routes/notificationJobRoutes.js";
import notificationTemplateRoutes from "./routes/notificationTemplateRoutes.js";
import notificationPreferenceRoutes from "./routes/notificationPreferenceRoutes.js";
import messageBoardRoutes from "./routes/messageBoardRoutes.js";


import foundationRouter from './routes/foundation.js';
import mentorshipRouter from './routes/mentorship.js';
import prayerRoutes from './routes/prayerRoutes.js';
import leadershipRoutes from './routes/leadershipRoutes.js';
import evangelismRoutes from './routes/evangelismRoutes.js';
import evangelismEventRoutes from './routes/evangelismEventRoutes.js';
import evangelismImportRoutes from './routes/evangelismImportRoutes.js';
import attendanceRoutes from './routes/attendanceRoutes.js';
import exitInterviewRoutes from './routes/exitInterviewRoutes.js';
import inactiveExitRoutes from './routes/inactiveExitRoutes.js';
import exportRoutes from './routes/exportRoutes.js';
import visitorRoutes from './routes/visitorRoutes.js';
import weeklyReportsRoutes from './routes/weeklyReportRoutes.js';

const app = express();

// Production proxy trust
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// Security headers
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_ORIGIN || 'http://localhost:3000',
  credentials: true
}));


// Body parser
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/permissions', permissionRoutes);
app.use('/api/members', memberRoutes);
app.use('/api/lookups', lookupRoutes);
app.use('/api/milestone-records', milestoneRecordRoutes);
app.use('/api/milestone-templates', milestoneTemplateRoutes);
app.use('/api/cell-groups', cellModuleRoutes);
app.use('/api/foundation', foundationRouter);
app.use('/api/mentorship', mentorshipRouter);
app.use('/api/prayer', prayerRoutes);
app.use('/api/leadership', leadershipRoutes);
app.use('/api/evangelism', evangelismRoutes);
app.use('/api/evangelism/events', evangelismEventRoutes);
app.use('/api/evangelism/import', evangelismImportRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/exit-interviews', exitInterviewRoutes);
app.use('/api/exits', inactiveExitRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/visitors', visitorRoutes);
app.use('/api/weekly-reports', weeklyReportsRoutes);

// Notification system
app.use("/api/notifications", notificationRoutes);
app.use("/api/notification-logs", notificationLogRoutes);
app.use("/api/notification-jobs", notificationJobRoutes);
app.use("/api/notification-templates", notificationTemplateRoutes);

// ⚡ No rate limiting here, only auth
app.use("/api/notification-preferences", notificationPreferenceRoutes);

app.use("/api/message-board", messageBoardRoutes);

// Health check
app.get('/api/_health', (req, res) => res.json({ ok: true }));

export default app;
