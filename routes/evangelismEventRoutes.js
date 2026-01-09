// backend/routes/evangelismEventRoutes.js
import express from 'express';
import { createEvent, listEvents, inviteContacts, updateInvite, updateEvent, deleteEvent } from '../controllers/evangelismEventController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', authenticateToken, listEvents); // GET /api/evangelism/events
router.post('/', authenticateToken, createEvent); // POST /api/evangelism/events
router.post('/:id/invite', authenticateToken, inviteContacts); // POST /api/evangelism/events/:id/invite
router.put('/invites/:id', authenticateToken, updateInvite); // PUT /api/evangelism/events/invites/:id
router.put('/:id', authenticateToken, updateEvent); // PUT /api/evangelism/events/:id
router.delete('/:id', authenticateToken, deleteEvent); // DELETE /api/evangelism/events/:id

export default router;
