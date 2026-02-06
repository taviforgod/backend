import express from 'express';
import * as ctrl from '../controllers/notificationPreferenceController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();


router.use(authenticateToken);

router.get('/', ctrl.getPreferences);
router.put('/', ctrl.updatePreferences);

// optional: enable creation endpoint if controller implements it
// router.post('/', ctrl.createPreferences);

export default router;
