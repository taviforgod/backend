import db from '../config/db.js';
import {
  getBibleTeachingCalendar,
  getBibleTeachingById,
  createBibleTeaching,
  updateBibleTeaching,
  deleteBibleTeaching
} from '../models/bibleTeachingCalendarModel.js';
import { getMemberByUserId } from '../models/memberModel.js';
import { handleError } from '../utils/errorHandler.js';

// Get all bible teaching calendar entries
export async function getBibleTeachingCalendarHandler(req, res) {
  try {
    const churchId = req.user?.church_id || 1;
    const filters = {
      cell_group_id: req.query.cell_group_id ? parseInt(req.query.cell_group_id) : null,
      status: req.query.status,
      start_date: req.query.start_date,
      end_date: req.query.end_date,
      limit: req.query.limit ? parseInt(req.query.limit) : null
    };

    const teachings = await getBibleTeachingCalendar(churchId, filters);
    res.json(teachings);
  } catch (err) {
    return handleError(res, 'getBibleTeachingCalendarHandler', err);
  }
}

// Get single bible teaching entry
export async function getBibleTeachingByIdHandler(req, res) {
  try {
    const id = parseInt(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid ID' });

    const teaching = await getBibleTeachingById(id);
    if (!teaching) return res.status(404).json({ error: 'Bible teaching entry not found' });

    res.json(teaching);
  } catch (err) {
    return handleError(res, 'getBibleTeachingByIdHandler', err);
  }
}

// Create new bible teaching entry
export async function createBibleTeachingHandler(req, res) {
  try {
    const churchId = req.user?.church_id || 1;

    // Get member for audit trail
    const member = await getMemberByUserId(req.user.userId, churchId);
    const creatorId = member ? member.id : null;

    const teachingData = {
      ...req.body,
      church_id: churchId,
      created_by: creatorId
    };

    const teaching = await createBibleTeaching(teachingData);
    const fullTeaching = await getBibleTeachingById(teaching.id);

    res.status(201).json({
      message: 'Bible teaching entry created successfully',
      teaching: fullTeaching
    });
  } catch (err) {
    return handleError(res, 'createBibleTeachingHandler', err);
  }
}

// Update bible teaching entry
export async function updateBibleTeachingHandler(req, res) {
  try {
    const id = parseInt(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid ID' });

    const churchId = req.user?.church_id || 1;
    const member = await getMemberByUserId(req.user.userId, churchId);
    const updaterId = member ? member.id : null;

    const updateData = {
      ...req.body,
      updated_by: updaterId
    };

    const teaching = await updateBibleTeaching(id, updateData);
    if (!teaching) return res.status(404).json({ error: 'Bible teaching entry not found' });

    const fullTeaching = await getBibleTeachingById(id);

    res.json({
      message: 'Bible teaching entry updated successfully',
      teaching: fullTeaching
    });
  } catch (err) {
    return handleError(res, 'updateBibleTeachingHandler', err);
  }
}

// Delete bible teaching entry
export async function deleteBibleTeachingHandler(req, res) {
  try {
    const id = parseInt(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid ID' });

    await deleteBibleTeaching(id);

    res.json({ message: 'Bible teaching entry deleted successfully' });
  } catch (err) {
    return handleError(res, 'deleteBibleTeachingHandler', err);
  }
}

// Get teaching statistics
export async function getBibleTeachingStatsHandler(req, res) {
  try {
    const churchId = req.user?.church_id || 1;

    const stats = await db.query(`
      SELECT
        COUNT(*) as total_teachings,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_teachings,
        COUNT(CASE WHEN status = 'planned' THEN 1 END) as planned_teachings,
        COUNT(CASE WHEN planned_date >= CURRENT_DATE THEN 1 END) as upcoming_teachings,
        AVG(attendance_count) as avg_attendance
      FROM bible_teaching_calendar
      WHERE church_id = $1
    `, [churchId]);

    res.json(stats.rows[0]);
  } catch (err) {
    return handleError(res, 'getBibleTeachingStatsHandler', err);
  }
}