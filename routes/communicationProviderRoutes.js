import express from 'express';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { requirePermission } from '../middleware/rbacMiddleware.js';
import * as providerCtrl from '../controllers/communicationProviderController.js';

const router = express.Router();

router.use(authenticateToken);
router.use(requirePermission('manage_system')); // Admin only

// Get all providers
router.get('/', providerCtrl.getProviders);

// Get provider by ID
router.get('/:id', providerCtrl.getProvider);

// Create provider
router.post('/', providerCtrl.createProvider);

// Update provider
router.put('/:id', providerCtrl.updateProvider);

// Delete provider
router.delete('/:id', providerCtrl.deleteProvider);

// Test provider
router.post('/:id/test', providerCtrl.testProvider);

export default router;