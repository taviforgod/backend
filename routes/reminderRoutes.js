import express from 'express';
import { authenticateToken } from '../middleware/authMiddleware.js';
import * as reminderCtrl from '../controllers/reminderController.js';

const router = express.Router();

router.use(authenticateToken);

// Get all reminders
router.get('/', reminderCtrl.getReminders);

// Get upcoming reminders
router.get('/upcoming', reminderCtrl.getUpcomingReminders);

// Get specific reminder
router.get('/:id', reminderCtrl.getReminder);

// Create reminder
router.post('/', reminderCtrl.createReminder);

// Update reminder
router.put('/:id', reminderCtrl.updateReminder);

// Delete reminder
router.delete('/:id', reminderCtrl.deleteReminder);

export default router;