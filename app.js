import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import path from 'path';
import fs from 'fs';
import morgan from 'morgan'; 

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
import { notificationRateLimiter } from "./middleware/notificationRateLimiter.js";

import foundationClassesRouter from './routes/foundationClasses.js';
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
import adminExitTypeMapRoutes from './routes/adminExitTypeMapRoutes.js';
import exportRoutes from './routes/exportRoutes.js';
import visitorRoutes from './routes/visitorRoutes.js';
import weeklyReportsRoutes from './routes/weeklyReportRoutes.js';
import bibleTeachingCalendarRoutes from './routes/bibleTeachingCalendarRoutes.js';
import foundationSchoolRoutes from './routes/foundationSchoolRoutes.js';
import foundationSchoolProgressRoutes from './routes/foundationSchoolProgressRoutes.js';
import meetingAgendaRoutes from './routes/meetingAgendaRoutes.js';
import outreachEventRoutes from './routes/outreachEventRoutes.js';
import baptismRoutes from './routes/baptismRoutes.js';
import baptismPrepRoutes from './routes/baptismPrepRoutes.js';
import conflictRoutes from './routes/conflictRoutes.js';
import celebrationRoutes from './routes/celebrationRoutes.js';
import givingRoutes from './routes/givingRoutes.js';
import testimonyRoutes from './routes/testimonyRoutes.js';
import financialRoutes from './routes/financialRoutes.js';
import cellGrowthRoutes from './routes/cellGrowthRoutes.js';
import personalGrowthRoutes from './routes/personalGrowthRoutes.js';
import reportingRoutes from './routes/reportingRoutes.js';
import comprehensiveReportsRoutes from './routes/comprehensiveReports.js';
import crisisFollowupRoutes from './routes/crisisFollowupRoutes.js';
import analyticsRoutes from './routes/analyticsRoutes.js';
import spiritualGrowthRoutes from './routes/spiritualGrowthRoutes.js';
import reminderRoutes from './routes/reminderRoutes.js';
import communicationProviderRoutes from './routes/communicationProviderRoutes.js';
import automatedReminderRoutes from './routes/automatedReminderRoutes.js';
import cellVisitorRoutes from './routes/newBelieverRoutes.js';
import absenteeFollowupRoutes from './routes/absenteeFollowupRoutes.js';
import zoneRoutes from './routes/zoneRoutes.js';

// Start notification worker for automated reminders
import './workers/notificationWorker.js';

const app = express();

// ================================================
// 🛡️ Security & Core Middleware
// ================================================

if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1); // trust Render proxy headers
}

app.use(helmet({
  crossOriginResourcePolicy: false,
}));

app.use(compression());

// ================================================
// 🧾 Logging Middleware
// ================================================

// Custom Morgan format for Render-friendly logs
morgan.token('body', (req) => {
  if (req.method !== 'GET' && req.body && Object.keys(req.body).length > 0) {
    return JSON.stringify(req.body);
  }
  return '';
});

// Log to console (and keep it clean for Render)
app.use(morgan(':method :url :status - :response-time ms :body', {
  skip: (req, res) => req.url === '/api/_health', // skip health checks
}));

// ================================================
// 🌐 CORS & Rate Limiting
// ================================================
app.use(cors({
  origin: process.env.FRONTEND_ORIGIN || 'http://localhost:3000',
  credentials: true,
}));

const globalLimiter = rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 60 * 1000,
  max: Number(process.env.RATE_LIMIT_MAX) || 200,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(globalLimiter);

// ================================================
// 🖼️ Static Files
// ================================================

const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

app.use(
  '/uploads',
  express.static(uploadsDir, {
    maxAge: '7d',
    etag: true,
  })
);

// ================================================
// ⚙️ Request Parsing
// ================================================

// parse JSON + urlencoded bodies BEFORE routes so req.body is populated
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));

// optional debug to confirm bodies arrive
app.use((req, res, next) => {
  console.debug('HTTP', req.method, req.url, 'bodyKeys=', Object.keys(req.body || {}));
  next();
});

// ================================================
// 🔗 ROUTES
// ================================================

app.use('/api/auth', authRoutes);
app.use('/api/members', memberRoutes);
app.use('/api/users', userRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/permissions', permissionRoutes);
app.use('/api/lookups', lookupRoutes);
app.use('/api/milestone-records', milestoneRecordRoutes);
app.use('/api/milestone-templates', milestoneTemplateRoutes);
app.use('/api/cell-groups', cellModuleRoutes);

app.use('/api/foundation/classes', foundationClassesRouter);
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
app.use('/api/admin/exit-type-mappings', adminExitTypeMapRoutes);
// debug routes removed
app.use('/api/export', exportRoutes);
app.use('/api/visitors', visitorRoutes);
app.use('/api/weekly-reports', weeklyReportsRoutes);
app.use('/api/bible-teaching-calendar', bibleTeachingCalendarRoutes);
app.use('/api/foundation-school', foundationSchoolRoutes);
app.use('/api/foundation-school-progress', foundationSchoolProgressRoutes);
app.use('/api/meeting-agendas', meetingAgendaRoutes);
app.use('/api/outreach-events', outreachEventRoutes);
app.use('/api/baptisms', baptismRoutes);
app.use('/api/baptism-prep', baptismPrepRoutes);
app.use('/api/conflicts', conflictRoutes);
app.use('/api/celebrations', celebrationRoutes);
app.use('/api/giving', givingRoutes);
app.use('/api/testimonies', testimonyRoutes);
app.use('/api/financial', financialRoutes);
app.use('/api/cell-growth', cellGrowthRoutes);
app.use('/api/personal-growth', personalGrowthRoutes);
app.use('/api/reports', reportingRoutes);
app.use('/api/comprehensive-reports', comprehensiveReportsRoutes);
app.use('/api/cell-visitors', cellVisitorRoutes);

app.use("/api/notifications", notificationRateLimiter, notificationRoutes);
app.use("/api/notification-logs", notificationLogRoutes);
app.use("/api/notification-jobs", notificationJobRoutes);
app.use("/api/notification-templates", notificationTemplateRoutes);
app.use("/api/notification-preferences", notificationPreferenceRoutes);
app.use("/api/reminders", reminderRoutes);
app.use("/api/communication-providers", communicationProviderRoutes);
app.use("/api/automated-reminders", automatedReminderRoutes);
app.use("/api/absentee-followups", absenteeFollowupRoutes);
app.use("/api/message-board", messageBoardRoutes);
app.use("/api/zones", zoneRoutes);
app.use('/api/crisis-followups', crisisFollowupRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/spiritual_growth', spiritualGrowthRoutes);


// ================================================
// ❤️ Health Check
// ================================================
app.get('/api/_health', (req, res) => res.json({ ok: true }));

// ================================================
// 🧩 Error Handling Middleware
// ================================================

app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

app.use((err, req, res, next) => {
  console.error('💥 Server Error:', err);
  if (res.headersSent) return next(err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
  });
});

export default app;
