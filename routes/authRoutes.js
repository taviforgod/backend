import express from 'express';
import * as authCtrl from '../controllers/authController.js';

const router = express.Router();

// Public endpoints
router.post('/register', authCtrl.register);
router.post('/login', authCtrl.login);
router.post('/forgot-password', authCtrl.forgotPassword);
router.post('/reset-password', authCtrl.resetPassword);

// Verification
router.post('/email-verify', authCtrl.emailVerify);
router.post('/phone-verify', authCtrl.phoneVerify);
router.post('/resend-verification', authCtrl.resendVerification);

// Token refresh
router.post('/refresh', authCtrl.refresh);

// Session/me
router.get('/me', authCtrl.me);

// Logout
router.post('/logout', authCtrl.logout);

export default router;