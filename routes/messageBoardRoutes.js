import express from 'express';
import { authenticateToken } from '../middleware/authMiddleware.js';
import * as postCtrl from '../controllers/messageBoardController.js';

const router = express.Router();

router.use(authenticateToken);

router.get("/", postCtrl.listPosts);
router.get("/:id", postCtrl.getPost);
router.post("/", postCtrl.createPost);
router.put("/:id", postCtrl.updatePost);
router.delete("/:id", postCtrl.deletePost);

export default router;