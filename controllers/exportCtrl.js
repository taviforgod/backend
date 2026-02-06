// controllers/exportCtrl.js
import db from '../config/db.js';
import { DateTime } from 'luxon';
import * as notificationModel from '../models/notificationModel.js';
import { getIO } from '../config/socket.js';

// helper to safely format values for CSV (escape quotes)
const csvEscape = (val) => {
  if (val === null || val === undefined) return '';
  const s = String(val).replace(/"/g, '""');
  return `"${s}"`;
};

export const exportExits = [
  // middleware to apply in route file (provided inline as array for easy mounting)
  async (req, res, next) => { next(); },
  async (req, res) => {
    try {
      const church_id = req.user.church_id;
      const { fromDate, toDate, format: outFormat = 'csv' } = req.query;

      const params = [church_id];
      let idx = 2;
      let where = 'e.church_id = $1 AND e.soft_deleted = false';
      if (fromDate) { where += ` AND e.exit_date >= $${idx}`; params.push(fromDate); idx++; }
      if (toDate)   { where += ` AND e.exit_date <= $${idx}`; params.push(toDate); idx++; }

      const q = `
        SELECT e.id, e.member_id, m.first_name, m.surname, e.exit_type, e.exit_reason, e.exit_date, e.is_suggestion,
               u.email AS processed_by_email, e.notes, e.created_at,

               -- visit/followup aggregates
               (SELECT COUNT(*) FROM exit_interviews vi WHERE vi.exit_id = e.id AND vi.church_id = e.church_id AND vi.interview_type = 'visit') AS visit_count,
               (SELECT MAX(created_at) FROM exit_interviews vi WHERE vi.exit_id = e.id AND vi.church_id = e.church_id AND vi.interview_type = 'visit') AS last_visit_date,
               (SELECT COUNT(*) FROM exit_interviews fu WHERE fu.exit_id = e.id AND fu.church_id = e.church_id AND fu.interview_type = 'followup') AS followup_count,
               (SELECT MAX(created_at) FROM exit_interviews fu WHERE fu.exit_id = e.id AND fu.church_id = e.church_id AND fu.interview_type = 'followup') AS last_followup_date
        FROM inactive_member_exits e
        LEFT JOIN members m ON m.id = e.member_id
        LEFT JOIN users u ON u.id = e.processed_by
        WHERE ${where}
        ORDER BY e.exit_date DESC
      `;

      const result = await db.query(q, params);

      // best-effort notification about the export (do not block the response)
      try {
        const user_id = req.user?.userId ?? req.user?.id ?? null;
        const title = 'Export performed';
        const message = `Exported ${result.rows.length} inactive exit(s).`;
        const metadata = { action: 'export_inactive_exits', fromDate: fromDate || null, toDate: toDate || null, count: result.rows.length, format: outFormat };
        const link = '/exports/inactive_exits';

        const notification = await notificationModel.createNotification({
          church_id,
          member_id: null,
          user_id,
          title,
          message,
          channel: 'inapp',
          metadata,
          link
        });

        try {
          const io = getIO();
          if (io) {
            if (church_id) io.to(`church:${church_id}`).emit('notification', notification);
            if (notification.user_id) io.to(`user:${notification.user_id}`).emit('notification', notification);
          }
        } catch (emitErr) {
          console.warn('Notification emit failed', emitErr?.message || emitErr);
        }
      } catch (nErr) {
        console.warn('Failed to create notification for exportExits', nErr?.message || nErr);
      }

      if (outFormat === 'json') {
        res.setHeader('Content-Type', 'application/json');
        return res.json(result.rows);
      }

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="inactive_exits_${DateTime.now().toFormat('yyyyLLdd')}.csv"`);

      const headers = ['id','member_id','first_name','surname','exit_type','exit_reason','exit_date','is_suggestion','processed_by_email','notes','created_at','visit_count','last_visit_date','followup_count','last_followup_date'];
      res.write(headers.map(csvEscape).join(',') + '\n');

      for (const row of result.rows) {
        const line = [
          row.id,
          row.member_id,
          row.first_name,
          row.surname,
          row.exit_type,
          row.exit_reason,
          row.exit_date ? row.exit_date.toISOString().slice(0,10) : '',
          row.is_suggestion ? '1' : '0',
          row.processed_by_email,
          row.notes,
          row.created_at ? row.created_at.toISOString() : '',
          row.visit_count ?? 0,
          row.last_visit_date ? (new Date(row.last_visit_date)).toISOString() : '',
          row.followup_count ?? 0,
          row.last_followup_date ? (new Date(row.last_followup_date)).toISOString() : ''
        ].map(csvEscape).join(',');
        res.write(line + '\n');
      }
      res.end();
    } catch (err) {
      console.error('exportExits error', err);
      res.status(500).json({ error: 'Failed to export exits' });
    }
  }
];

export default exportExits;
