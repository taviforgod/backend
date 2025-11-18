// server/routes/visitorRoutes.js
import express from 'express';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { requirePermission } from '../middleware/rbacMiddleware.js';
import * as ctrl from '../controllers/visitorController.js'; 
import { getVisitorsInvitedByMember } from '../models/visitorModel.js';
import db from '../config/db.js'; 

const router = express.Router();

router.get('/', authenticateToken, requirePermission('view_visitors'), ctrl.listVisitors);

router.get('/my/recent', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.userId ?? req.user?.id;
    const churchId = req.user?.church_id;
    const recent = parseInt(req.query.recent || 30);

    if (!userId || !churchId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Get member record
    const memberRes = await db.query(
      'SELECT id FROM members WHERE user_id = $1 AND church_id = $2 LIMIT 1',
      [userId, churchId]
    );

    if (!memberRes.rows.length) {
      return res.json([]); // Return empty if no member
    }

    const memberId = memberRes.rows[0].id;
    const visitors = await getVisitorsInvitedByMember(memberId, churchId, recent);

    res.json(visitors);
  } catch (err) {
    console.error('GET /visitors/my/recent error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', authenticateToken, requirePermission('view_visitors'), ctrl.getVisitor);
router.post('/', authenticateToken, requirePermission('create_visitor'), ctrl.createVisitor);
router.put('/:id', authenticateToken, requirePermission('update_visitor'), ctrl.updateVisitor);
router.delete('/:id', authenticateToken, requirePermission('delete_visitor'), ctrl.deleteVisitor);

router.post('/:id/convert', authenticateToken, requirePermission('convert_visitor'), ctrl.convertVisitor);
router.post('/:id/follow-ups', authenticateToken, requirePermission('add_followup'), ctrl.createFollowUp);
router.get('/:id/follow-ups', authenticateToken, requirePermission('view_followups'), ctrl.listFollowUpsForVisitor);

export default router;
