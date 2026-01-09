import * as model from '../models/outreachEventModel.js';
import * as memberModel from '../models/memberModel.js';
import { handleError } from '../utils/errorHandler.js';

// Outreach Events CRUD
export async function createEventHandler(req, res) {
  try {
    const churchId = req.user?.church_id || 1;
    const member = await memberModel.getMemberByUserId(req.user.userId, churchId);
    const creatorId = member ? member.id : null;

    const eventData = {
      ...req.body,
      church_id: churchId,
      created_by: creatorId
    };

    const event = await model.createOutreachEvent(eventData);
    res.status(201).json({
      message: 'Outreach event created successfully',
      event
    });
  } catch (err) {
    return handleError(res, 'createEventHandler', err);
  }
}

export async function getEventsHandler(req, res) {
  try {
    const churchId = req.user?.church_id || 1;
    const filters = {
      event_type: req.query.event_type,
      status: req.query.status,
      date_from: req.query.date_from,
      date_to: req.query.date_to,
      limit: req.query.limit ? parseInt(req.query.limit) : undefined
    };

    const events = await model.getOutreachEvents(churchId, filters);
    res.json(events);
  } catch (err) {
    return handleError(res, 'getEventsHandler', err);
  }
}

export async function getEventHandler(req, res) {
  try {
    const eventId = parseInt(req.params.id);
    const churchId = req.user?.church_id || 1;

    const event = await model.getOutreachEventById(eventId, churchId);
    if (!event) {
      return res.status(404).json({ message: 'Outreach event not found' });
    }

    // Get participants
    const participants = await model.getEventParticipants(eventId);
    event.participants = participants;

    res.json(event);
  } catch (err) {
    return handleError(res, 'getEventHandler', err);
  }
}

export async function updateEventHandler(req, res) {
  try {
    const eventId = parseInt(req.params.id);
    const churchId = req.user?.church_id || 1;
    const member = await memberModel.getMemberByUserId(req.user.userId, churchId);
    const updaterId = member ? member.id : null;

    const updateData = {
      ...req.body,
      updated_by: updaterId
    };

    const event = await model.updateOutreachEvent(eventId, churchId, updateData);
    if (!event) {
      return res.status(404).json({ message: 'Outreach event not found' });
    }

    res.json({
      message: 'Event updated successfully',
      event
    });
  } catch (err) {
    return handleError(res, 'updateEventHandler', err);
  }
}

// Event Participants
export async function addParticipantHandler(req, res) {
  try {
    const participantData = req.body;
    const participant = await model.addEventParticipant(participantData);
    res.status(201).json({
      message: 'Participant added successfully',
      participant
    });
  } catch (err) {
    return handleError(res, 'addParticipantHandler', err);
  }
}

export async function updateAttendanceHandler(req, res) {
  try {
    const { eventId, memberId } = req.params;
    const { attended, hours } = req.body;

    const participant = await model.updateEventAttendance(
      parseInt(eventId),
      parseInt(memberId),
      attended,
      hours
    );

    if (!participant) {
      return res.status(404).json({ message: 'Participant not found' });
    }

    res.json({
      message: 'Attendance updated successfully',
      participant
    });
  } catch (err) {
    return handleError(res, 'updateAttendanceHandler', err);
  }
}

export async function getParticipantsHandler(req, res) {
  try {
    const eventId = parseInt(req.params.eventId);
    const participants = await model.getEventParticipants(eventId);
    res.json(participants);
  } catch (err) {
    return handleError(res, 'getParticipantsHandler', err);
  }
}

// Analytics & Reporting
export async function getUpcomingEventsHandler(req, res) {
  try {
    const churchId = req.user?.church_id || 1;
    const limit = req.query.limit ? parseInt(req.query.limit) : 10;

    const events = await model.getUpcomingEvents(churchId, limit);
    res.json(events);
  } catch (err) {
    return handleError(res, 'getUpcomingEventsHandler', err);
  }
}

export async function getEventsSummaryHandler(req, res) {
  try {
    const churchId = req.user?.church_id || 1;
    const summary = await model.getEventsByTypeSummary(churchId);
    res.json(summary);
  } catch (err) {
    return handleError(res, 'getEventsSummaryHandler', err);
  }
}