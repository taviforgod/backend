import express from "express";
import { authenticateToken } from "../middleware/authMiddleware.js";
import * as tmplCtrl from "../controllers/notificationTemplateController.js";
const router = express.Router();

router.use(authenticateToken);

router.get("/", tmplCtrl.listTemplates);
router.get("/:id", tmplCtrl.getTemplate);
router.post("/", tmplCtrl.createTemplate);
router.put("/:id", tmplCtrl.updateTemplate);
router.delete("/:id", tmplCtrl.deleteTemplate);
router.post("/:id/preview", tmplCtrl.previewTemplate);
router.post("/:id/copy-to", tmplCtrl.copyTemplateToChurch);

export default router;