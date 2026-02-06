import { Router } from 'express';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { requirePermission } from '../middleware/rbacMiddleware.js';
import {
  // Template routes
  createTemplateHandler,
  getTemplatesHandler,
  getTemplateHandler,
  updateTemplateHandler,
  createTemplateSectionHandler,
  updateTemplateSectionHandler,

  // Agenda routes
  createAgendaHandler,
  generateAgendaFromTemplateHandler,
  getAgendasHandler,
  getAgendaHandler,
  updateAgendaHandler,
  updateAgendaSectionHandler,

  // Participant routes
  addParticipantHandler,
  getParticipantsHandler,

  // Auto-generation routes
  autoGenerateWeeklyAgendasHandler,
  getUpcomingMeetingsHandler
} from '../controllers/meetingAgendaController.js';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// Template Management
router.post('/templates', requirePermission('create_member'), createTemplateHandler);
router.get('/templates', requirePermission('view_members'), getTemplatesHandler);
router.get('/templates/:id', requirePermission('view_members'), getTemplateHandler);
router.put('/templates/:id', requirePermission('update_member'), updateTemplateHandler);

// Template Sections
router.post('/template-sections', requirePermission('update_member'), createTemplateSectionHandler);
router.put('/template-sections/:id', requirePermission('update_member'), updateTemplateSectionHandler);

// Meeting Agendas
router.post('/agendas', requirePermission('create_member'), createAgendaHandler);
router.post('/templates/:templateId/generate-agenda', requirePermission('create_member'), generateAgendaFromTemplateHandler);
router.get('/agendas', requirePermission('view_members'), getAgendasHandler);
router.get('/agendas/:id', requirePermission('view_members'), getAgendaHandler);
router.put('/agendas/:id', requirePermission('update_member'), updateAgendaHandler);

// Agenda Sections
router.put('/agenda-sections/:id', requirePermission('update_member'), updateAgendaSectionHandler);

// Meeting Participants
router.post('/participants', requirePermission('update_member'), addParticipantHandler);
router.get('/agendas/:agendaId/participants', requirePermission('view_members'), getParticipantsHandler);

// Auto-generation Features
router.post('/auto-generate-weekly', requirePermission('create_member'), autoGenerateWeeklyAgendasHandler);
router.get('/cell-groups/:cellGroupId/upcoming-meetings', requirePermission('view_members'), getUpcomingMeetingsHandler);

export default router;