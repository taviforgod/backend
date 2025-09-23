// FILE: app.js
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';


// routes (same names as your project)
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
import mentorshipRouter from './routes/mentorship.js';
import prayerRoutes from './routes/prayerRoutes.js';
import leadershipRoutes from './routes/leadershipRoutes.js';
import evangelismRoutes from './routes/evangelismRoutes.js';



const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


const app = express();


// Trust proxy when running behind a reverse proxy (Heroku, Render, Vercel, etc.)
// This is important so Express can detect `req.secure` and allow `secure` cookies to be set.
if (process.env.TRUST_PROXY === 'true' || process.env.NODE_ENV === 'production') {
app.set('trust proxy', 1);
}


// Configure CORS with explicit origin and credentials support
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || 'https://frontend-jvvi.onrender.com';


app.use(cors({
origin: (origin, callback) => {
// allow requests with no origin (mobile apps, curl) or the configured frontend origin
if (!origin) return callback(null, true);
if (origin === FRONTEND_ORIGIN) return callback(null, true);
return callback(new Error('CORS origin denied'), false);
},
credentials: true,
}));


app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());


// Serve uploaded files (profile photos, csvs etc.) in a web-accessible folder
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));


// --- API routes ---
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


// simple health check
app.get('/health', (req, res) => res.json({ ok: true, env: process.env.NODE_ENV || 'development' }));


export default app;
