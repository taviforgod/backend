import express from 'express';
import * as ctrl from '../controllers/crisisFollowupController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { requirePermission } from '../middleware/rbacMiddleware.js';
import { searchMembers, getAllMembersForAutocomplete } from '../models/memberModel.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Get all members for crisis care autocomplete
router.get('/all-members', requirePermission('crisis_view'), async (req, res) => {
  try {
    const { church_id } = req.user || {};
    console.log('Getting all members for crisis care:', { church_id });
    
    if (!church_id) return res.status(400).json({ error: 'Church not specified' });

    // Get all members for the church using the new function
    const results = await getAllMembersForAutocomplete(church_id);
    console.log('All members loaded:', results.length);
    
    res.json(results);
  } catch (err) {
    console.error('Error loading all members:', err);
    res.status(500).json({ error: err.message || 'Failed to load members' });
  }
});

// Test endpoint to verify search
router.get('/test-search', requirePermission('crisis_view'), async (req, res) => {
  try {
    const { church_id } = req.user || {};
    console.log('Test search - church_id:', church_id);
    
    // Test with a simple query first
    const testResults = await searchMembers({ q: 'a', church_id });
    console.log('Test search results:', testResults.length, testResults);
    
    res.json({
      message: 'Test search completed',
      church_id,
      total_results: testResults.length,
      results: testResults.slice(0, 3) // Show first 3 results
    });
  } catch (err) {
    console.error('Test search error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Specific routes must come before parameterized routes
router.get('/resources', requirePermission('crisis_view'), ctrl.getCrisisResources);
// Simple in-memory cache for member search (cache for 5 minutes)
const searchCache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

router.get('/search-members', requirePermission('crisis_view'), async (req, res) => {
  try {
    const { church_id } = req.user || {};
    const q = req.query.q?.trim();
    console.log('Crisis member search:', { church_id, q });
    
    if (!church_id) return res.status(400).json({ error: 'Church not specified' });
    if (!q || q.length < 2) {
      console.log('Query too short, returning empty array');
      return res.json([]);
    }

    // Check cache first
    const cacheKey = `${church_id}:${q.toLowerCase()}`;
    const cached = searchCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      console.log('Returning cached results for:', q);
      return res.json(cached.results);
    }

    const results = await searchMembers({ q, church_id });
    console.log('Search results:', results.length, 'members found');
    
    // Cache the results
    searchCache.set(cacheKey, {
      results,
      timestamp: Date.now()
    });
    
    // Clean old cache entries periodically
    if (searchCache.size > 100) {
      const now = Date.now();
      for (const [key, value] of searchCache.entries()) {
        if (now - value.timestamp > CACHE_DURATION) {
          searchCache.delete(key);
        }
      }
    }
    
    res.json(results);
  } catch (err) {
    console.error('Search error:', err);
    res.status(500).json({ error: err.message || 'Failed to search members' });
  }
});

// Main case management
router.get('/', requirePermission('crisis_view'), ctrl.getAllCrisisFollowups);
router.get('/summary', requirePermission('crisis_view'), ctrl.getCrisisSummary);
router.get('/urgent', requirePermission('crisis_view'), ctrl.getUrgentCases);
router.get('/:id', requirePermission('crisis_view'), ctrl.getCrisisFollowupById);
router.get('/:id/details', requirePermission('crisis_view'), ctrl.getCaseDetails);
// Assign a case to a member (cell leader friendly)
router.post('/:id/assign', requirePermission('crisis_assign'), ctrl.assignCaseToMember);
router.post('/', requirePermission('crisis_manage'), ctrl.createCrisisFollowup);
router.put('/:id', requirePermission('crisis_manage'), ctrl.updateCrisisFollowup);
router.delete('/:id', requirePermission('crisis_manage'), ctrl.deleteCrisisFollowup);

// Crisis assessments
router.post('/:caseId/assessments', requirePermission('crisis_manage'), ctrl.createCrisisAssessment);
router.get('/:caseId/assessments', requirePermission('crisis_view'), ctrl.getCrisisAssessments);

// Intervention plans
router.post('/:caseId/intervention-plans', requirePermission('crisis_manage'), ctrl.createInterventionPlan);
router.get('/:caseId/intervention-plans', requirePermission('crisis_view'), ctrl.getInterventionPlans);

// Follow-up sessions
router.post('/:caseId/sessions', requirePermission('crisis_manage'), ctrl.createFollowupSession);
router.get('/:caseId/sessions', requirePermission('crisis_view'), ctrl.getFollowupSessions);

// Referrals
router.post('/:caseId/referrals', requirePermission('crisis_manage'), ctrl.createCrisisReferral);
router.get('/:caseId/referrals', requirePermission('crisis_view'), ctrl.getCrisisReferrals);

// Recovery milestones
router.post('/:caseId/milestones', requirePermission('crisis_manage'), ctrl.createRecoveryMilestone);
router.get('/:caseId/milestones', requirePermission('crisis_view'), ctrl.getRecoveryMilestones);
router.put('/milestones/:milestoneId/progress', requirePermission('crisis_manage'), ctrl.updateMilestoneProgress);

// Crisis resources (shared across cases) - moved to top to avoid route conflicts

export default router;
