// FILE: routes/authRoutes.js
import express from 'express';
import * as authCtrl from '../controllers/authController.js';
import { authenticateToken } from '../controllers/authController.js';

const router = express.Router();

// Auth flow
router.post('/register', authCtrl.register);
router.post('/login', authCtrl.login);
router.post('/forgot-password', authCtrl.forgotPassword);
router.post('/reset-password', authCtrl.resetPassword);
router.post('/verify-phone', authCtrl.phoneVerify);
router.post('/logout', authCtrl.logout);

// Current user profile (works with cookie OR Authorization header for Safari)
router.get('/me', authenticateToken, authCtrl.getCurrentUser);

export default router;
