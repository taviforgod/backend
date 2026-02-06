import * as model from '../models/weeklyReportModel.js';

/**
 * Service layer: does small business logic and enforces user context (church_id)
 */

export async function handleListReports(user) {
  if (!user?.church_id) throw new Error('Unauthorized: no church context');
  return model.listWeeklyReports(user.church_id);
}

export async function handleGetReport(id, user) {
  const r = await model.getWeeklyReportById(id);
  if (!r || r.church_id !== user.church_id) throw new Error('Not found');
  return r;
}

export async function handleCreateReport(data, user) {
  if (!user?.church_id) throw new Error('Unauthorized');
  data.church_id = user.church_id;
  return model.createWeeklyReport(data, user.user_id);
}

export async function handleUpdateReport(id, data, user) {
  const existing = await model.getWeeklyReportById(id);
  if (!existing || existing.church_id !== user.church_id) throw new Error('Not found or forbidden');
  return model.updateWeeklyReport(id, data, user.user_id);
}

export async function handleSoftDelete(id, user) {
  const existing = await model.getWeeklyReportById(id);
  if (!existing || existing.church_id !== user.church_id) throw new Error('Not found or forbidden');
  return model.softDeleteWeeklyReport(id, user.user_id);
}

export async function handlePreviewAbsentees(cellGroupId, startDate, endDate, user) {
  return model.previewAbsentees(cellGroupId, startDate, endDate);
}

export async function handleGetDetails(reportId, user) {
  const rep = await model.getWeeklyReportById(reportId);
  if (!rep || rep.church_id !== user.church_id) throw new Error('Not found or forbidden');
  const details = await model.getWeeklyReportDetails(reportId);
  return details;
}

export async function handleGetTrends(user, weeks = 12) {
  return model.getWeeklyTrends(user.church_id, weeks);
}

export async function handleGetSummary(user, meeting_date) {
  if (!meeting_date) throw new Error('meeting_date required');
  return model.getWeeklySummary(user.church_id, meeting_date);
}

export async function handleExport(user, opts = {}) {
  return model.exportWeeklyReports(user.church_id, opts);
}
