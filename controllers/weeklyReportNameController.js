import * as model from '../models/weeklyReportNameModel.js';

/** Return cell groups without IDs */
export const listCellGroupsNameSafe = async (req, res) => {
  const church_id = req.user?.church_id;
  res.json(await model.getCellGroupsNameSafe(church_id));
};

/** Return members of a group by group name, names only */
export const listGroupMembersNameSafe = async (req, res) => {
  const church_id = req.user?.church_id;
  const groupName = decodeURIComponent(req.params.groupName);
  res.json(await model.getGroupMembersNameSafe(church_id, groupName));
};

export const getLastWeeklyReportNameSafe = async (req, res) => {
  const church_id = req.user?.church_id;
  const groupName = decodeURIComponent(req.params.groupName);
  const rpt = await model.getLastWeeklyReportNameSafe(church_id, groupName);
  if (!rpt) return res.status(204).end();
  res.json(rpt);
};

export const listWeeklyReportsNameSafe = async (req, res) => {
  const church_id = req.user?.church_id;
  const { groupName, start_date, end_date } = req.query;
  res.json(await model.getWeeklyReportsNameSafe(church_id, { groupName, start_date, end_date }));
};

export const createWeeklyReportByNames = async (req, res) => {
  const church_id = req.user?.church_id;
  const payload = { ...req.body, church_id };
  const report = await model.createWeeklyReportByNames(payload);
  res.status(201).json(report);
};