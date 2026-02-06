import * as model from '../models/meetingAgendaModel.js';
import * as memberModel from '../models/memberModel.js';
import { handleError } from '../utils/errorHandler.js';

// Template Management
export async function createTemplateHandler(req, res) {
  try {
    const churchId = req.user?.church_id || 1;
    const member = await memberModel.getMemberByUserId(req.user.userId, churchId);
    const creatorId = member ? member.id : null;

    const templateData = {
      ...req.body,
      church_id: churchId,
      created_by: creatorId
    };

    const template = await model.createAgendaTemplate(templateData);
    res.status(201).json({
      message: 'Meeting agenda template created successfully',
      template
    });
  } catch (err) {
    return handleError(res, 'createTemplateHandler', err);
  }
}

export async function getTemplatesHandler(req, res) {
  try {
    const churchId = req.user?.church_id || 1;
    const filters = {
      meeting_type: req.query.meeting_type
    };

    const templates = await model.getAgendaTemplates(churchId, filters);
    res.json(templates);
  } catch (err) {
    return handleError(res, 'getTemplatesHandler', err);
  }
}

export async function getTemplateHandler(req, res) {
  try {
    const templateId = parseInt(req.params.id);
    const churchId = req.user?.church_id || 1;

    const template = await model.getAgendaTemplateById(templateId, churchId);
    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }

    // Get template sections
    const sections = await model.getTemplateSections(templateId);
    template.sections = sections;

    res.json(template);
  } catch (err) {
    return handleError(res, 'getTemplateHandler', err);
  }
}

export async function updateTemplateHandler(req, res) {
  try {
    const templateId = parseInt(req.params.id);
    const churchId = req.user?.church_id || 1;
    const member = await memberModel.getMemberByUserId(req.user.userId, churchId);
    const updaterId = member ? member.id : null;

    const updateData = {
      ...req.body,
      updated_by: updaterId
    };

    const template = await model.updateAgendaTemplate(templateId, churchId, updateData);
    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }

    res.json({
      message: 'Template updated successfully',
      template
    });
  } catch (err) {
    return handleError(res, 'updateTemplateHandler', err);
  }
}

// Template Sections
export async function createTemplateSectionHandler(req, res) {
  try {
    const sectionData = req.body;
    const section = await model.createTemplateSection(sectionData);
    res.status(201).json({
      message: 'Template section created successfully',
      section
    });
  } catch (err) {
    return handleError(res, 'createTemplateSectionHandler', err);
  }
}

export async function updateTemplateSectionHandler(req, res) {
  try {
    const sectionId = parseInt(req.params.id);
    const section = await model.updateTemplateSection(sectionId, req.body);
    if (!section) {
      return res.status(404).json({ message: 'Section not found' });
    }

    res.json({
      message: 'Section updated successfully',
      section
    });
  } catch (err) {
    return handleError(res, 'updateTemplateSectionHandler', err);
  }
}

// Meeting Agenda Management
export async function createAgendaHandler(req, res) {
  try {
    const churchId = req.user?.church_id || 1;
    const member = await memberModel.getMemberByUserId(req.user.userId, churchId);
    const creatorId = member ? member.id : null;

    const agendaData = {
      ...req.body,
      church_id: churchId,
      created_by: creatorId
    };

    const agenda = await model.createMeetingAgenda(agendaData);
    res.status(201).json({
      message: 'Meeting agenda created successfully',
      agenda
    });
  } catch (err) {
    return handleError(res, 'createAgendaHandler', err);
  }
}

export async function generateAgendaFromTemplateHandler(req, res) {
  try {
    const templateId = parseInt(req.params.templateId);
    const churchId = req.user?.church_id || 1;
    const member = await memberModel.getMemberByUserId(req.user.userId, churchId);
    const creatorId = member ? member.id : null;

    const meetingData = {
      ...req.body,
      church_id: churchId,
      created_by: creatorId
    };

    const agenda = await model.generateAgendaFromTemplate(templateId, meetingData);
    res.status(201).json({
      message: 'Agenda generated from template successfully',
      agenda
    });
  } catch (err) {
    return handleError(res, 'generateAgendaFromTemplateHandler', err);
  }
}

export async function getAgendasHandler(req, res) {
  try {
    const churchId = req.user?.church_id || 1;
    const filters = {
      cell_group_id: req.query.cell_group_id ? parseInt(req.query.cell_group_id) : undefined,
      status: req.query.status,
      date_from: req.query.date_from,
      date_to: req.query.date_to
    };

    const agendas = await model.getMeetingAgendas(churchId, filters);
    res.json(agendas);
  } catch (err) {
    return handleError(res, 'getAgendasHandler', err);
  }
}

export async function getAgendaHandler(req, res) {
  try {
    const agendaId = parseInt(req.params.id);
    const churchId = req.user?.church_id || 1;

    const agenda = await model.getMeetingAgendaById(agendaId, churchId);
    if (!agenda) {
      return res.status(404).json({ message: 'Meeting agenda not found' });
    }

    // Get agenda sections and participants
    const sections = await model.getAgendaSections(agendaId);
    const participants = await model.getMeetingParticipants(agendaId);

    agenda.sections = sections;
    agenda.participants = participants;

    res.json(agenda);
  } catch (err) {
    return handleError(res, 'getAgendaHandler', err);
  }
}

export async function updateAgendaHandler(req, res) {
  try {
    const agendaId = parseInt(req.params.id);
    const churchId = req.user?.church_id || 1;
    const member = await memberModel.getMemberByUserId(req.user.userId, churchId);
    const updaterId = member ? member.id : null;

    const updateData = {
      ...req.body,
      updated_by: updaterId
    };

    const agenda = await model.updateMeetingAgenda(agendaId, churchId, updateData);
    if (!agenda) {
      return res.status(404).json({ message: 'Meeting agenda not found' });
    }

    res.json({
      message: 'Agenda updated successfully',
      agenda
    });
  } catch (err) {
    return handleError(res, 'updateAgendaHandler', err);
  }
}

// Agenda Sections
export async function updateAgendaSectionHandler(req, res) {
  try {
    const sectionId = parseInt(req.params.id);
    const section = await model.updateAgendaSection(sectionId, req.body);
    if (!section) {
      return res.status(404).json({ message: 'Section not found' });
    }

    res.json({
      message: 'Section updated successfully',
      section
    });
  } catch (err) {
    return handleError(res, 'updateAgendaSectionHandler', err);
  }
}

// Meeting Participants
export async function addParticipantHandler(req, res) {
  try {
    const participantData = req.body;
    const participant = await model.addMeetingParticipant(participantData);
    res.status(201).json({
      message: 'Participant added successfully',
      participant
    });
  } catch (err) {
    return handleError(res, 'addParticipantHandler', err);
  }
}

export async function getParticipantsHandler(req, res) {
  try {
    const agendaId = parseInt(req.params.agendaId);
    const participants = await model.getMeetingParticipants(agendaId);
    res.json(participants);
  } catch (err) {
    return handleError(res, 'getParticipantsHandler', err);
  }
}

// Auto-generation features
export async function autoGenerateWeeklyAgendasHandler(req, res) {
  try {
    const churchId = req.user?.church_id || 1;
    const { week_start_date } = req.body;

    if (!week_start_date) {
      return res.status(400).json({ message: 'week_start_date is required' });
    }

    const agendas = await model.autoGenerateWeeklyAgendas(churchId, week_start_date);
    res.json({
      message: `${agendas.length} agendas generated successfully`,
      agendas
    });
  } catch (err) {
    return handleError(res, 'autoGenerateWeeklyAgendasHandler', err);
  }
}

export async function getUpcomingMeetingsHandler(req, res) {
  try {
    const cellGroupId = parseInt(req.params.cellGroupId);
    const limit = req.query.limit ? parseInt(req.query.limit) : 5;

    const meetings = await model.getUpcomingMeetings(cellGroupId, limit);
    res.json(meetings);
  } catch (err) {
    return handleError(res, 'getUpcomingMeetingsHandler', err);
  }
}