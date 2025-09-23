import express from 'express';
import * as authCtrl from '../controllers/authController.js';
const router = express.Router();
router.post('/register', authCtrl.register);
router.post('/login', authCtrl.login);
router.post('/forgot-password', authCtrl.forgotPassword);
router.post('/reset-password', authCtrl.resetPassword);
router.post('/verify-phone', authCtrl.phoneVerify);
router.post('/logout', authCtrl.logout);



export default router;