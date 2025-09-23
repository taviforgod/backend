import express from 'express';
import {
  listContacts,
  createContact,
  getContact,
  updateContact,
  deleteContact,
  promoteToVisitor
} from '../controllers/evangelismCtrl.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { requirePermission } from '../middleware/rbacMiddleware.js';

const router = express.Router();

router.get('/', authenticateToken, requirePermission('view_evangelism_contacts'), listContacts);
router.post('/', authenticateToken, requirePermission('create_evangelism_contacts'), createContact);
router.get('/:id', authenticateToken, requirePermission('view_evangelism_contacts'), getContact);
router.put('/:id', authenticateToken, requirePermission('update_evangelism_contacts'), updateContact);
router.delete('/:id', authenticateToken, requirePermission('delete_evangelism_contacts'), deleteContact);
router.post('/promote', authenticateToken, requirePermission('convert_evangelism_contact'), promoteToVisitor);

export default router;