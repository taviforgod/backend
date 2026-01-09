import db from '../config/db.js';

export async function getBibleTeachingCalendar(churchId, filters = {}) {
  let query = `
    SELECT btc.*,
           cg.name as cell_group_name,
           teacher.first_name as teacher_first_name,
           teacher.surname as teacher_surname,
           assistant.first_name as assistant_first_name,
           assistant.surname as assistant_surname
    FROM bible_teaching_calendar btc
    LEFT JOIN cell_groups cg ON btc.cell_group_id = cg.id
    LEFT JOIN members teacher ON btc.assigned_teacher = teacher.id
    LEFT JOIN members assistant ON btc.assistant_teacher = assistant.id
    WHERE btc.church_id = $1
  `;

  const params = [churchId];
  let paramIndex = 2;

  if (filters.cell_group_id) {
    query += ` AND btc.cell_group_id = $${paramIndex}`;
    params.push(filters.cell_group_id);
    paramIndex++;
  }

  if (filters.status) {
    query += ` AND btc.status = $${paramIndex}`;
    params.push(filters.status);
    paramIndex++;
  }

  if (filters.start_date && filters.end_date) {
    query += ` AND btc.planned_date BETWEEN $${paramIndex} AND $${paramIndex + 1}`;
    params.push(filters.start_date, filters.end_date);
    paramIndex += 2;
  }

  query += ` ORDER BY btc.planned_date ASC`;

  if (filters.limit) {
    query += ` LIMIT $${paramIndex}`;
    params.push(filters.limit);
  }

  const result = await db.query(query, params);
  return result.rows;
}

export async function getBibleTeachingById(id) {
  const result = await db.query(`
    SELECT btc.*,
           cg.name as cell_group_name,
           teacher.first_name as teacher_first_name,
           teacher.surname as teacher_surname,
           assistant.first_name as assistant_first_name,
           assistant.surname as assistant_surname
    FROM bible_teaching_calendar btc
    LEFT JOIN cell_groups cg ON btc.cell_group_id = cg.id
    LEFT JOIN members teacher ON btc.assigned_teacher = teacher.id
    LEFT JOIN members assistant ON btc.assistant_teacher = assistant.id
    WHERE btc.id = $1
  `, [id]);

  return result.rows[0];
}

export async function createBibleTeaching(data) {
  const {
    church_id, title, scripture_reference, description, teaching_category,
    planned_date, cell_group_id, assigned_teacher, assistant_teacher,
    preparation_notes, materials_needed, key_points, created_by
  } = data;

  const result = await db.query(`
    INSERT INTO bible_teaching_calendar (
      church_id, title, scripture_reference, description, teaching_category,
      planned_date, cell_group_id, assigned_teacher, assistant_teacher,
      preparation_notes, materials_needed, key_points, created_by
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
    RETURNING *
  `, [
    church_id, title, scripture_reference, description, teaching_category,
    planned_date, cell_group_id, assigned_teacher, assistant_teacher,
    preparation_notes, materials_needed, key_points, created_by
  ]);

  return result.rows[0];
}

export async function updateBibleTeaching(id, data) {
  const {
    title, scripture_reference, description, teaching_category,
    planned_date, cell_group_id, assigned_teacher, assistant_teacher,
    preparation_notes, materials_needed, key_points, status,
    actual_date, attendance_count, feedback, follow_up_needed, updated_by
  } = data;

  const result = await db.query(`
    UPDATE bible_teaching_calendar SET
      title = $1, scripture_reference = $2, description = $3, teaching_category = $4,
      planned_date = $5, cell_group_id = $6, assigned_teacher = $7, assistant_teacher = $8,
      preparation_notes = $9, materials_needed = $10, key_points = $11, status = $12,
      actual_date = $13, attendance_count = $14, feedback = $15, follow_up_needed = $16,
      updated_by = $17, updated_at = NOW()
    WHERE id = $18
    RETURNING *
  `, [
    title, scripture_reference, description, teaching_category,
    planned_date, cell_group_id, assigned_teacher, assistant_teacher,
    preparation_notes, materials_needed, key_points, status,
    actual_date, attendance_count, feedback, follow_up_needed, updated_by, id
  ]);

  return result.rows[0];
}

export async function deleteBibleTeaching(id) {
  await db.query('DELETE FROM bible_teaching_calendar WHERE id = $1', [id]);
  return true;
}