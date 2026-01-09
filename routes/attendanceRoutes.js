import express from "express";
import { authenticateToken } from "../middleware/authMiddleware.js";
import { markAttendance, getAttendance, getRepeatAbsentees } from "../controllers/attendanceController.js";

const router = express.Router();

router.post("/", authenticateToken, markAttendance);
router.get("/:cell_group_id", authenticateToken, getAttendance);
router.get("/:cell_group_id/repeat-absentees", authenticateToken, getRepeatAbsentees);

export default router;
