// backend/controllers/evangelismImportController.js
import fs from 'fs';
import { parse } from 'csv-parse/sync';
import db from '../config/db.js';
import ExcelJS from 'exceljs';
import { Parser as Json2csvParser } from 'json2csv';
import * as notificationModel from '../models/notificationModel.js';
import { getIO } from '../config/socket.js';

export const importContactsCSV = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const content = req.file.buffer.toString('utf8');
    const records = parse(content, { columns: true, skip_empty_lines: true });
    const inserted = [];
    for (const r of records) {
      const vals = [req.user.church_id, r.first_name || r.name || '', r.surname || '', r.phone || '', r.whatsapp || '', r.email || '', r.area || '', r.lat || null, r.lon || null, r.contact_date || null, null, r.how_met || null, r.response || null, r.notes || null, null, r.next_follow_up_date || null, null, r.tags ? r.tags.split(';').map(s=>s.trim()) : null, r.status || 'new'];
      const { rows } = await db.query(`INSERT INTO evangelism_contacts (church_id, first_name, surname, phone, whatsapp, email, area, lat, lon, contact_date, contacted_by_user_id, how_met, response, notes, assigned_cell_group_id, next_follow_up_date, assigned_to_user_id, tags, status, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,NOW(),NOW()) RETURNING *`, vals);
      inserted.push(rows[0]);
    }
    res.json({ inserted: inserted.length, sample: inserted.slice(0,5) });

    // best-effort notification after import
    try {
      if (inserted.length) {
        const church_id = req.user?.church_id ?? null;
        const user_id = req.user?.userId ?? req.user?.id ?? null;
        const title = 'Contacts imported';
        const message = `${inserted.length} contact(s) were imported.`;
        const metadata = { action: 'evangelism_import', imported_count: inserted.length };
        const link = '/evangelism';

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
            if (user_id) io.to(`user:${user_id}`).emit('notification', notification);
          }
        } catch (emitErr) {
          console.warn('Notification emit failed', emitErr?.message || emitErr);
        }
      }
    } catch (nErr) {
      console.warn('Failed to create notification for importContactsCSV', nErr?.message || nErr);
    }
  } catch (err) { console.error(err); res.status(500).json({ error: err.message }); }
};

export const exportContactsCSV = async (req, res) => {
  try { const { rows } = await db.query('SELECT * FROM evangelism_contacts WHERE church_id=$1', [req.user.church_id]); const fields = Object.keys(rows[0] || {}); const parser = new Json2csvParser({ fields }); const csv = parser.parse(rows); res.header('Content-Type','text/csv'); res.attachment('evangelism_contacts.csv'); res.send(csv); } catch (err) { console.error(err); res.status(500).json({ error: err.message }); }
};

export const exportContactsExcel = async (req, res) => {
  try { const { rows } = await db.query('SELECT * FROM evangelism_contacts WHERE church_id=$1', [req.user.church_id]); const workbook = new ExcelJS.Workbook(); const sheet = workbook.addWorksheet('Contacts'); if (rows.length) { sheet.columns = Object.keys(rows[0]).map(k=>({ header:k, key:k })); rows.forEach(r=>sheet.addRow(r)); } const buffer = await workbook.xlsx.writeBuffer(); res.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'); res.attachment('evangelism_contacts.xlsx'); res.send(buffer); } catch (err) { console.error(err); res.status(500).json({ error: err.message }); }
};
