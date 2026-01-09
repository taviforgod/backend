import db from '../config/db.js';

// Meeting Agenda Templates CRUD
export async function createAgendaTemplate(data) {
  const {
    church_id,
    name,
    description,
    meeting_type,
    is_default,
    estimated_duration,
    created_by
  } = data;

  const result = await db.query(`
    INSERT INTO meeting_agenda_templates (
      church_id, name, description, meeting_type, is_default, estimated_duration, created_by
    ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *
  `, [church_id, name, description, meeting_type, is_default, estimated_duration, created_by]);

  return result.rows[0];
}

export async function getAgendaTemplates(churchId, filters = {}) {
  let query = `
    SELECT
      mat.*,
      COUNT(ats.id) as sections_count
    FROM meeting_agenda_templates mat
    LEFT JOIN agenda_template_sections ats ON mat.id = ats.template_id
    WHERE mat.church_id = $1
  `;

  const params = [churchId];
  let paramIndex = 2;

  if (filters.meeting_type) {
    query += ` AND mat.meeting_type = $${paramIndex}`;
    params.push(filters.meeting_type);
    paramIndex++;
  }

  query += ` GROUP BY mat.id ORDER BY mat.is_default DESC, mat.name ASC`;

  const result = await db.query(query, params);
  return result.rows;
}

export async function getAgendaTemplateById(templateId, churchId) {
  const result = await db.query(`
    SELECT * FROM meeting_agenda_templates
    WHERE id = $1 AND church_id = $2
  `, [templateId, churchId]);

  return result.rows[0];
}

export async function updateAgendaTemplate(templateId, churchId, data) {
  const updates = [];
  const params = [];
  let paramIndex = 1;

  Object.keys(data).forEach(key => {
    if (data[key] !== undefined && key !== 'id' && key !== 'church_id') {
      updates.push(`${key} = $${paramIndex}`);
      params.push(data[key]);
      paramIndex++;
    }
  });

  if (updates.length === 0) return null;

  updates.push(`updated_at = NOW()`);

  const query = `
    UPDATE meeting_agenda_templates
    SET ${updates.join(', ')}
    WHERE id = $${paramIndex} AND church_id = $${paramIndex + 1}
    RETURNING *
  `;

  params.push(templateId, churchId);

  const result = await db.query(query, params);
  return result.rows[0];
}

// Template Sections CRUD
export async function createTemplateSection(data) {
  const {
    template_id,
    section_name,
    description,
    duration_minutes,
    section_order,
    is_required,
    section_type
  } = data;

  const result = await db.query(`
    INSERT INTO agenda_template_sections (
      template_id, section_name, description, duration_minutes,
      section_order, is_required, section_type
    ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *
  `, [template_id, section_name, description, duration_minutes, section_order, is_required, section_type]);

  return result.rows[0];
}

export async function getTemplateSections(templateId) {
  const result = await db.query(`
    SELECT * FROM agenda_template_sections
    WHERE template_id = $1
    ORDER BY section_order ASC
  `, [templateId]);

  return result.rows;
}

export async function updateTemplateSection(sectionId, data) {
  const updates = [];
  const params = [];
  let paramIndex = 1;

  Object.keys(data).forEach(key => {
    if (data[key] !== undefined && key !== 'id') {
      updates.push(`${key} = $${paramIndex}`);
      params.push(data[key]);
      paramIndex++;
    }
  });

  if (updates.length === 0) return null;

  const query = `
    UPDATE agenda_template_sections
    SET ${updates.join(', ')}
    WHERE id = $${paramIndex}
    RETURNING *
  `;

  params.push(sectionId);

  const result = await db.query(query, params);
  return result.rows[0];
}

// Meeting Agendas CRUD
export async function createMeetingAgenda(data) {
  const {
    church_id,
    cell_group_id,
    template_id,
    title,
    meeting_date,
    start_time,
    end_time,
    bible_teaching_id,
    facilitator_id,
    worship_leader_id,
    created_by
  } = data;

  const result = await db.query(`
    INSERT INTO meeting_agendas (
      church_id, cell_group_id, template_id, title, meeting_date,
      start_time, end_time, bible_teaching_id, facilitator_id, worship_leader_id, created_by
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    RETURNING *
  `, [church_id, cell_group_id, template_id, title, meeting_date, start_time, end_time, bible_teaching_id, facilitator_id, worship_leader_id, created_by]);

  return result.rows[0];
}

export async function getMeetingAgendas(churchId, filters = {}) {
  let query = `
    SELECT
      ma.*,
      cg.name as cell_group_name,
      btc.title as bible_teaching_title,
      fm.first_name as facilitator_first_name, fm.surname as facilitator_surname,
      wm.first_name as worship_leader_first_name, wm.surname as worship_leader_surname,
      COUNT(mp.id) as participant_count
    FROM meeting_agendas ma
    LEFT JOIN cell_groups cg ON ma.cell_group_id = cg.id
    LEFT JOIN bible_teaching_calendar btc ON ma.bible_teaching_id = btc.id
    LEFT JOIN members fm ON ma.facilitator_id = fm.id
    LEFT JOIN members wm ON ma.worship_leader_id = wm.id
    LEFT JOIN meeting_participants mp ON ma.id = mp.agenda_id
    WHERE ma.church_id = $1
  `;

  const params = [churchId];
  let paramIndex = 2;

  if (filters.cell_group_id) {
    query += ` AND ma.cell_group_id = $${paramIndex}`;
    params.push(filters.cell_group_id);
    paramIndex++;
  }

  if (filters.status) {
    query += ` AND ma.status = $${paramIndex}`;
    params.push(filters.status);
    paramIndex++;
  }

  if (filters.date_from) {
    query += ` AND ma.meeting_date >= $${paramIndex}`;
    params.push(filters.date_from);
    paramIndex++;
  }

  if (filters.date_to) {
    query += ` AND ma.meeting_date <= $${paramIndex}`;
    params.push(filters.date_to);
    paramIndex++;
  }

  query += ` GROUP BY ma.id, cg.name, btc.title, fm.first_name, fm.surname, wm.first_name, wm.surname ORDER BY ma.meeting_date DESC`;

  const result = await db.query(query, params);
  return result.rows;
}

export async function getMeetingAgendaById(agendaId, churchId) {
  const result = await db.query(`
    SELECT
      ma.*,
      cg.name as cell_group_name,
      btc.title as bible_teaching_title,
      fm.first_name as facilitator_first_name, fm.surname as facilitator_surname,
      wm.first_name as worship_leader_first_name, wm.surname as worship_leader_surname
    FROM meeting_agendas ma
    LEFT JOIN cell_groups cg ON ma.cell_group_id = cg.id
    LEFT JOIN bible_teaching_calendar btc ON ma.bible_teaching_id = btc.id
    LEFT JOIN members fm ON ma.facilitator_id = fm.id
    LEFT JOIN members wm ON ma.worship_leader_id = wm.id
    WHERE ma.id = $1 AND ma.church_id = $2
  `, [agendaId, churchId]);

  return result.rows[0];
}

export async function updateMeetingAgenda(agendaId, churchId, data) {
  const updates = [];
  const params = [];
  let paramIndex = 1;

  Object.keys(data).forEach(key => {
    if (data[key] !== undefined && key !== 'id' && key !== 'church_id') {
      updates.push(`${key} = $${paramIndex}`);
      params.push(data[key]);
      paramIndex++;
    }
  });

  if (updates.length === 0) return null;

  updates.push(`updated_at = NOW()`);

  const query = `
    UPDATE meeting_agendas
    SET ${updates.join(', ')}
    WHERE id = $${paramIndex} AND church_id = $${paramIndex + 1}
    RETURNING *
  `;

  params.push(agendaId, churchId);

  const result = await db.query(query, params);
  return result.rows[0];
}

// Generate agenda from template
export async function generateAgendaFromTemplate(templateId, meetingData) {
  const { church_id, cell_group_id, meeting_date, created_by } = meetingData;

  // Get template details
  const templateResult = await db.query(`
    SELECT * FROM meeting_agenda_templates WHERE id = $1 AND church_id = $2
  `, [templateId, church_id]);

  if (templateResult.rows.length === 0) {
    throw new Error('Template not found');
  }

  const template = templateResult.rows[0];

  // Get template sections
  const sectionsResult = await db.query(`
    SELECT * FROM agenda_template_sections
    WHERE template_id = $1
    ORDER BY section_order ASC
  `, [templateId]);

  const sections = sectionsResult.rows;

  // Create meeting agenda
  const agendaData = {
    church_id,
    cell_group_id,
    template_id: templateId,
    title: `${template.name} - ${meeting_date}`,
    meeting_date,
    created_by
  };

  const agenda = await createMeetingAgenda(agendaData);

  // Create agenda sections
  for (const section of sections) {
    await db.query(`
      INSERT INTO meeting_agenda_sections (
        agenda_id, section_name, description, planned_duration,
        section_order, section_type, is_completed
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [
      agenda.id,
      section.section_name,
      section.description,
      section.duration_minutes,
      section.section_order,
      section.section_type,
      false
    ]);
  }

  return agenda;
}

// Get agenda sections
export async function getAgendaSections(agendaId) {
  const result = await db.query(`
    SELECT * FROM meeting_agenda_sections
    WHERE agenda_id = $1
    ORDER BY section_order ASC
  `, [agendaId]);

  return result.rows;
}

export async function updateAgendaSection(sectionId, data) {
  const updates = [];
  const params = [];
  let paramIndex = 1;

  Object.keys(data).forEach(key => {
    if (data[key] !== undefined && key !== 'id') {
      updates.push(`${key} = $${paramIndex}`);
      params.push(data[key]);
      paramIndex++;
    }
  });

  if (updates.length === 0) return null;

  const query = `
    UPDATE meeting_agenda_sections
    SET ${updates.join(', ')}, updated_at = NOW()
    WHERE id = $${paramIndex}
    RETURNING *
  `;

  params.push(sectionId);

  const result = await db.query(query, params);
  return result.rows[0];
}

// Meeting Participants
export async function addMeetingParticipant(data) {
  const { agenda_id, member_id, attendance_status, check_in_time, notes } = data;

  const result = await db.query(`
    INSERT INTO meeting_participants (
      agenda_id, member_id, attendance_status, check_in_time, notes
    ) VALUES ($1, $2, $3, $4, $5)
    ON CONFLICT (agenda_id, member_id) DO UPDATE SET
      attendance_status = EXCLUDED.attendance_status,
      check_in_time = EXCLUDED.check_in_time,
      notes = EXCLUDED.notes
    RETURNING *
  `, [agenda_id, member_id, attendance_status, check_in_time, notes]);

  return result.rows[0];
}

export async function getMeetingParticipants(agendaId) {
  const result = await db.query(`
    SELECT
      mp.*,
      m.first_name, m.surname, m.contact_primary
    FROM meeting_participants mp
    JOIN members m ON mp.member_id = m.id
    WHERE mp.agenda_id = $1
    ORDER BY m.first_name, m.surname
  `, [agendaId]);

  return result.rows;
}

// Auto-generate weekly agendas for cell groups
export async function autoGenerateWeeklyAgendas(churchId, weekStartDate) {
  // Get all active cell groups
  const cellGroupsResult = await db.query(`
    SELECT id, name FROM cell_groups WHERE church_id = $1 AND is_active = true
  `, [churchId]);

  const cellGroups = cellGroupsResult.rows;

  // Get default template
  const templateResult = await db.query(`
    SELECT id FROM meeting_agenda_templates
    WHERE church_id = $1 AND is_default = true AND meeting_type = 'bible_study'
    LIMIT 1
  `, [churchId]);

  if (templateResult.rows.length === 0) {
    throw new Error('No default Bible study template found');
  }

  const templateId = templateResult.rows[0].id;

  // Get scheduled Bible teachings for the week
  const teachingsResult = await db.query(`
    SELECT id, title, planned_date
    FROM bible_teaching_calendar
    WHERE church_id = $1 AND planned_date >= $2 AND planned_date < $2 + INTERVAL '7 days'
    ORDER BY planned_date ASC
  `, [churchId, weekStartDate]);

  const teachings = teachingsResult.rows;

  const generatedAgendas = [];

  // Generate agenda for each cell group
  for (const cellGroup of cellGroups) {
    // Find appropriate teaching for this cell group (could be enhanced with cell group teaching assignments)
    const teaching = teachings[0]; // Use first teaching for now, could be enhanced

    const agendaData = {
      church_id: churchId,
      cell_group_id: cellGroup.id,
      template_id: templateId,
      title: `${cellGroup.name} Bible Study - ${weekStartDate}`,
      meeting_date: weekStartDate,
      bible_teaching_id: teaching ? teaching.id : null,
      created_by: null // System generated
    };

    try {
      const agenda = await createMeetingAgenda(agendaData);
      generatedAgendas.push(agenda);
    } catch (error) {
      console.error(`Failed to generate agenda for ${cellGroup.name}:`, error.message);
    }
  }

  return generatedAgendas;
}

// Get upcoming meetings for a cell group
export async function getUpcomingMeetings(cellGroupId, limit = 5) {
  const result = await db.query(`
    SELECT
      ma.*,
      btc.title as bible_teaching_title,
      fm.first_name as facilitator_first_name, fm.surname as facilitator_surname
    FROM meeting_agendas ma
    LEFT JOIN bible_teaching_calendar btc ON ma.bible_teaching_id = btc.id
    LEFT JOIN members fm ON ma.facilitator_id = fm.id
    WHERE ma.cell_group_id = $1 AND ma.meeting_date >= CURRENT_DATE AND ma.status != 'cancelled'
    ORDER BY ma.meeting_date ASC
    LIMIT $2
  `, [cellGroupId, limit]);

  return result.rows;
}