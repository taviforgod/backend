// backend/routes/evangelismImportRoutes.js
import express from 'express';
import multer from 'multer';
import { importContactsCSV, exportContactsCSV, exportContactsExcel } from '../controllers/evangelismImportController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });
router.post('/contacts/import', authenticateToken, upload.single('file'), importContactsCSV);
router.get('/contacts/export/csv', authenticateToken, exportContactsCSV);
router.get('/contacts/export/excel', authenticateToken, exportContactsExcel);
export default router;
