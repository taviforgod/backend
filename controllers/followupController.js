import db from '../config/db.js';
import * as notificationModel from '../models/notificationModel.js';
import { getIO } from '../config/socket.js';

/** ➕ Create a new follow-up */
export async function createFollowUp({
  visitor_id,
  assigned_member_id,
  method,
  notes,
  outcome,
  followup_date,
  created_by
}) {
  if (!visitor_id) throw new Error('visitor_id required');

  const result = await db.query(
    `INSERT INTO visitor_follow_ups
      (visitor_id, assigned_member_id, followup_date, method, notes, outcome, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7)
     RETURNING *`,
    [
      visitor_id,
      assigned_member_id || null,
      followup_date || new Date(),
      method || 'Call',
      notes || null,
      outcome || null,
      created_by || null,
    ]
  );

  // 🧮 Update visitor’s follow-up stats dynamically
  await db.query(
    `UPDATE visitors
     SET follow_up_status = CASE
         WHEN (SELECT COUNT(*) FROM visitor_follow_ups WHERE visitor_id=$1) >= 3 THEN 'done'
         ELSE 'in_progress'
       END,
       updated_at = NOW(),
       next_follow_up_date = (NOW() + interval '7 days')
     WHERE id = $1`,
    [visitor_id]
  );

  // best-effort in-app notification for the assigned member / church
  (async () => {
    try {
      const followup = result.rows[0];
      // fetch visitor to get church_id and names
      const vres = await db.query('SELECT id, first_name, surname, church_id FROM visitors WHERE id = $1', [visitor_id]);
      const visitor = vres.rows[0] || null;
      const church_id = visitor?.church_id ?? null;

      const notifyUser = assigned_member_id || created_by || null;
      const title = 'Follow-up created';
      const message = `${visitor?.first_name || 'A visitor'} has a new follow-up scheduled${visitor?.surname ? ` (${visitor.surname})` : ''}.`;
      const metadata = { action: 'followup_created', followup_id: followup?.id ?? null, visitor_id };
      const link = `/visitors/${visitor_id}`;

      const notification = await notificationModel.createNotification({
        church_id,
        member_id: null,
        user_id: notifyUser,
        title,
        message,
        channel: 'inapp',
        metadata,
        link
      });

      const io = getIO();
      if (io) {
        if (church_id) io.to(`church:${church_id}`).emit('notification', notification);
        if (notification.user_id) io.to(`user:${notification.user_id}`).emit('notification', notification);
        if (assigned_member_id) io.to(`member:${assigned_member_id}`).emit('notification', notification);
      }
    } catch (nErr) {
      console.warn('Failed to create notification for createFollowUp', nErr?.message || nErr);
    }
  })();

  return result.rows[0];
}


/** 📋 List all follow-ups for a visitor (Express handler) */
export async function listFollowUpsForVisitor(req, res) {
  try {
    const { id } = req.params;
    const result = await db.query(
      `SELECT 
          fu.*,
          COALESCE(m.first_name || ' ' || m.surname, '') AS assigned_member_name,
          COALESCE(c.name, '') AS created_by_name
       FROM visitor_follow_ups fu
       LEFT JOIN members m ON fu.assigned_member_id = m.id
       LEFT JOIN users c ON fu.created_by = c.id
       WHERE fu.visitor_id = $1
       ORDER BY fu.followup_date DESC`,
      [id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('listFollowUpsForVisitor error:', err);
    res.status(500).json({ message: 'Server error fetching follow-ups', details: err.message });
  }
}

/** 📅 List due follow-ups (today or overdue) */
export async function listDueFollowUps(church_id, cutoff = new Date().toISOString()) {
  const result = await db.query(
    `SELECT 
       v.id AS visitor_id,
       v.first_name,
       v.surname,
       v.contact_primary,
       v.next_follow_up_date,
       cg.name AS cell_group_name,
       COUNT(fu.id)::int AS total_followups
     FROM visitors v
     LEFT JOIN cell_groups cg ON v.cell_group_id = cg.id
     LEFT JOIN visitor_follow_ups fu ON fu.visitor_id = v.id
     WHERE v.deleted_at IS NULL
       AND v.next_follow_up_date <= $1
       AND v.follow_up_status != 'done'
       AND v.church_id = $2
     GROUP BY v.id, cg.name
     ORDER BY v.next_follow_up_date ASC NULLS LAST`,
    [cutoff, church_id]
  );
  return result.rows;
}
