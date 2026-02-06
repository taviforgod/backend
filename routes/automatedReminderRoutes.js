import express from 'express';
import { authenticateToken } from '../middleware/authMiddleware.js';
import reminderService from '../services/reminderService.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// GET /api/automated-reminders/trigger/:type
// Trigger specific automated reminder manually
router.post('/trigger/:type', async (req, res) => {
  try {
    const { type } = req.params;
    const { church_id } = req.body;

    if (!church_id) {
      return res.status(400).json({ error: 'church_id is required' });
    }

    let result = null;

    switch (type) {
      case 'followup':
        await reminderService.generateFollowupReminders(church_id);
        result = { message: 'Follow-up reminders processed successfully' };
        break;
      case 'crisis':
        await reminderService.generateCrisisAlerts(church_id);
        result = { message: 'Crisis alerts processed successfully' };
        break;
      case 'reports':
        await reminderService.generateReportReminders(church_id);
        result = { message: 'Report reminders processed successfully' };
        break;
      case 'foundation':
        await reminderService.generateFoundationSchoolReminders(church_id);
        result = { message: 'Foundation school reminders processed successfully' };
        break;
      case 'all':
        await reminderService.runAutomatedReminders(church_id);
        result = { message: 'All automated reminders processed successfully' };
        break;
      default:
        return res.status(400).json({ error: 'Invalid reminder type. Use: followup, crisis, reports, foundation, or all' });
    }

    res.json(result);
  } catch (error) {
    console.error('Error triggering automated reminders:', error);
    res.status(500).json({ error: 'Failed to process automated reminders' });
  }
});

// GET /api/automated-reminders/status
// Get status of automated reminder system
router.get('/status', async (req, res) => {
  try {
    // This could return information about scheduled jobs, last run times, etc.
    // For now, just return a basic status
    res.json({
      status: 'active',
      message: 'Automated reminder system is running',
      available_types: ['followup', 'crisis', 'reports', 'foundation', 'all'],
      description: {
        followup: 'Weekly reminders for members needing pastoral follow-up',
        crisis: 'Immediate alerts for crisis situations requiring care',
        reports: 'Reminders for pending report submissions',
        foundation: 'Monthly foundation school progress updates',
        all: 'Run all automated reminder types'
      }
    });
  } catch (error) {
    console.error('Error getting reminder status:', error);
    res.status(500).json({ error: 'Failed to get reminder system status' });
  }
});

export default router;