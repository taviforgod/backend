import express from 'express';
import * as ctrl from '../controllers/foundationController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { requirePermission } from '../middleware/rbacMiddleware.js';

const router = express.Router();

/** Get current user's foundation enrollments */
router.get('/me', authenticateToken, requirePermission('view_foundation'), ctrl.getByCurrentUser);

/** Analytics / progress summary - keep before param routes */
router.get('/progress', authenticateToken, requirePermission('view_foundation'), ctrl.getProgress);

/** Get all available classes for a church */
router.get('/classes', authenticateToken, requirePermission('view_foundation'), ctrl.getAvailableClasses);

/** Get a specific enrollment by id */
router.get('/enrollment/:id', authenticateToken, requirePermission('view_foundation'), ctrl.getEnrollmentById);

/** Get all enrollments for church admins */
router.get('/', authenticateToken, requirePermission('view_foundation'), ctrl.getAllEnrollments);

/** Enroll a member (supports class selection) */
router.post('/', authenticateToken, requirePermission('create_foundation'), ctrl.createEnrollment);

/** Get enrollments for a specific member (explicit path) */
router.get('/member/:member_id', authenticateToken, requirePermission('view_foundation'), ctrl.getByMember);

/** Update an enrollment (plain param; validate in controller) */
router.put('/:id', authenticateToken, requirePermission('update_foundation'), ctrl.updateEnrollment);

/** Delete an enrollment (plain param; validate in controller) */
router.delete('/:id', authenticateToken, requirePermission('delete_foundation'), ctrl.deleteEnrollment);

export default router;