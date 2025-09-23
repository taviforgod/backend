import express from 'express';
import { authenticateToken } from '../middleware/authMiddleware.js';
import * as ctrl from '../controllers/messageboardController.js';
import { requireAdmin } from '../middleware/requireAdmin.js';

const router = express.Router();
router.use(authenticateToken);

router.get('/boards', ctrl.listBoards);
router.post('/boards', requireAdmin, ctrl.createBoard);

router.get('/boards/:board_id/messages', ctrl.listMessages);
router.post('/boards/:board_id/messages', ctrl.postMessage);
router.get('/messages/:id', ctrl.getMessage);
router.delete('/messages/:id', requireAdmin, ctrl.deleteMessage);



export default router;
