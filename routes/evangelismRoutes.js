// backend/routes/evangelismRoutes.js
import express from 'express';
import { createContact, listContacts, updateContact, updateContactStatus, assignBulkContacts, convertToVisitor, markAttended, deleteContact } from '../controllers/evangelismController.js'; // <-- add deleteContact
import { authenticateToken } from '../middleware/authMiddleware.js';
const router = express.Router();
router.get('/contacts', authenticateToken, listContacts);
router.post('/contacts', authenticateToken, createContact);
router.put('/contacts/:id', authenticateToken, updateContact);
router.put('/contacts/:id/status', authenticateToken, updateContactStatus);
router.post('/contacts/assign-bulk', authenticateToken, assignBulkContacts);
router.post('/contacts/:id/convert-to-visitor', authenticateToken, convertToVisitor);
router.post('/contacts/:id/attended', authenticateToken, markAttended);
router.delete('/contacts/:id', authenticateToken, deleteContact); // <-- add this line
export default router;
