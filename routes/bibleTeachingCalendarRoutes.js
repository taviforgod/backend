import express from 'express';
import {
  getBibleTeachingCalendarHandler,
  getBibleTeachingByIdHandler,
  createBibleTeachingHandler,
  updateBibleTeachingHandler,
  deleteBibleTeachingHandler,
  getBibleTeachingStatsHandler
} from '../controllers/bibleTeachingCalendarController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Get all bible teaching calendar entries
router.get('/', getBibleTeachingCalendarHandler);

// Get bible teaching statistics
router.get('/stats', getBibleTeachingStatsHandler);

// Get single bible teaching entry
router.get('/:id', getBibleTeachingByIdHandler);

// Create new bible teaching entry
router.post('/', createBibleTeachingHandler);

// Update bible teaching entry
router.put('/:id', updateBibleTeachingHandler);

// Delete bible teaching entry
router.delete('/:id', deleteBibleTeachingHandler);

export default router;