import {
  getTitles, addTitle, updateTitle, deleteTitle,
  getGenders, addGender, updateGender, deleteGender,
  getMaritalStatuses, addMaritalStatus, updateMaritalStatus, deleteMaritalStatus,
  getMemberTypes, addMemberType, updateMemberType, deleteMemberType,
  getMemberStatuses, addMemberStatus, updateMemberStatus, deleteMemberStatus,
  getNationalities, addNationality, updateNationality, deleteNationality,
  getChurches, addChurch, updateChurch, updateChurchZone, deleteChurch,
  getZones, addZone, updateZone, deleteZone,
  getStatusTypes, addStatusType, updateStatusType, deleteStatusType
} from '../models/lookupModel.js';
import * as notificationModel from '../models/notificationModel.js';
import { getIO } from '../config/socket.js';
import db from '../config/db.js';

// small helper to extract and validate a `name` field from JSON bodies
function _getName(req) {
  return (typeof req.body === 'object' && req.body !== null) ? req.body.name : undefined;
}

function _requireNameOr400(req, res) {
  const name = _getName(req);
  if (!name || String(name).trim() === '') {
    res.status(400).json({ error: 'name required' });
    return null;
  }
  return String(name).trim();
}

// helper to emit best-effort in-app notifications for lookup changes
async function notifyLookup(req, { resource, action, resourceId = null, name = null }) {
  try {
    const church_id = req.user?.church_id ?? null;
    const user_id = req.user?.userId ?? req.user?.id ?? null;
    const title = `${resource} ${action}`;
    const message = `${resource} ${name || ''} ${action}`.trim();
    const metadata = { action: `lookup_${resource.toLowerCase()}_${action}`, id: resourceId };
    const link = `/lookups/${resource.toLowerCase()}`;

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

    const io = getIO();
    if (io) {
      if (church_id) io.to(`church:${church_id}`).emit('notification', notification);
      if (notification.user_id) io.to(`user:${notification.user_id}`).emit('notification', notification);
    }
  } catch (err) {
    console.warn('notifyLookup failed', err?.message || err);
  }
}

// Get all lookups
export const getAllLookups = async (req, res) => {
  const [titles, genders, marital_statuses, member_types, member_statuses, nationalities, churches] = await Promise.all([
    getTitles(),
    getGenders(),
    getMaritalStatuses(),
    getMemberTypes(),
    getMemberStatuses(),
    getNationalities(),
    getChurches() // <-- Add churches to the lookups
  ]);
  res.json({ titles, genders, marital_statuses, member_types, member_statuses, nationalities, churches });
};

// Titles
export const getAllTitles = async (req, res) => res.json(await getTitles());
export const createTitle = async (req, res) => {
  const name = _requireNameOr400(req, res);
  if (!name) return;
  const row = await addTitle(name);
  res.json(row);
  notifyLookup(req, { resource: 'Title', action: 'created', resourceId: row?.id, name: row?.name });
};
export const editTitle = async (req, res) => {
  const name = _requireNameOr400(req, res);
  if (!name) return;
  const row = await updateTitle(req.params.id, name);
  res.json(row);
  notifyLookup(req, { resource: 'Title', action: 'updated', resourceId: req.params.id, name });
};
export const removeTitle = async (req, res) => {
  const row = await deleteTitle(req.params.id);
  res.json(row);
  notifyLookup(req, { resource: 'Title', action: 'deleted', resourceId: req.params.id });
};

// Genders
export const getAllGenders = async (req, res) => res.json(await getGenders());
export const createGender = async (req, res) => {
  const name = _requireNameOr400(req, res);
  if (!name) return;
  const row = await addGender(name);
  res.json(row);
  notifyLookup(req, { resource: 'Gender', action: 'created', resourceId: row?.id, name: row?.name });
};
export const editGender = async (req, res) => {
  const name = _requireNameOr400(req, res);
  if (!name) return;
  const row = await updateGender(req.params.id, name);
  res.json(row);
  notifyLookup(req, { resource: 'Gender', action: 'updated', resourceId: req.params.id, name });
};
export const removeGender = async (req, res) => {
  const row = await deleteGender(req.params.id);
  res.json(row);
  notifyLookup(req, { resource: 'Gender', action: 'deleted', resourceId: req.params.id });
};

// Marital Statuses
export const getAllMaritalStatuses = async (req, res) => res.json(await getMaritalStatuses());
export const createMaritalStatus = async (req, res) => {
  const name = _requireNameOr400(req, res);
  if (!name) return;
  const row = await addMaritalStatus(name);
  res.json(row);
  notifyLookup(req, { resource: 'MaritalStatus', action: 'created', resourceId: row?.id, name: row?.name });
};
export const editMaritalStatus = async (req, res) => {
  const name = _requireNameOr400(req, res);
  if (!name) return;
  const row = await updateMaritalStatus(req.params.id, name);
  res.json(row);
  notifyLookup(req, { resource: 'MaritalStatus', action: 'updated', resourceId: req.params.id, name });
};
export const removeMaritalStatus = async (req, res) => {
  const row = await deleteMaritalStatus(req.params.id);
  res.json(row);
  notifyLookup(req, { resource: 'MaritalStatus', action: 'deleted', resourceId: req.params.id });
};

// Member Types
export const getAllMemberTypes = async (req, res) => res.json(await getMemberTypes());
export const createMemberType = async (req, res) => {
  const name = _requireNameOr400(req, res);
  if (!name) return;
  const row = await addMemberType(name);
  res.json(row);
  notifyLookup(req, { resource: 'MemberType', action: 'created', resourceId: row?.id, name: row?.name });
};
export const editMemberType = async (req, res) => {
  const name = _requireNameOr400(req, res);
  if (!name) return;
  const row = await updateMemberType(req.params.id, name);
  res.json(row);
  notifyLookup(req, { resource: 'MemberType', action: 'updated', resourceId: req.params.id, name });
};
export const removeMemberType = async (req, res) => {
  const row = await deleteMemberType(req.params.id);
  res.json(row);
  notifyLookup(req, { resource: 'MemberType', action: 'deleted', resourceId: req.params.id });
};

// Member Statuses
export const getAllMemberStatuses = async (req, res) => res.json(await getMemberStatuses());
export const createMemberStatus = async (req, res) => {
  const name = _requireNameOr400(req, res);
  if (!name) return;
  const row = await addMemberStatus(name);
  res.json(row);
  notifyLookup(req, { resource: 'MemberStatus', action: 'created', resourceId: row?.id, name: row?.name });
};
export const editMemberStatus = async (req, res) => {
  const name = _requireNameOr400(req, res);
  if (!name) return;
  const row = await updateMemberStatus(req.params.id, name);
  res.json(row);
  notifyLookup(req, { resource: 'MemberStatus', action: 'updated', resourceId: req.params.id, name });
};
export const removeMemberStatus = async (req, res) => {
  const row = await deleteMemberStatus(req.params.id);
  res.json(row);
  notifyLookup(req, { resource: 'MemberStatus', action: 'deleted', resourceId: req.params.id });
};

// Nationalities
export const getAllNationalities = async (req, res) => res.json(await getNationalities());
export const createNationality = async (req, res) => {
  const name = _requireNameOr400(req, res);
  if (!name) return;
  const row = await addNationality(name);
  res.json(row);
  notifyLookup(req, { resource: 'Nationality', action: 'created', resourceId: row?.id, name: row?.name });
};
export const editNationality = async (req, res) => {
  const name = _requireNameOr400(req, res);
  if (!name) return;
  const row = await updateNationality(req.params.id, name);
  res.json(row);
  notifyLookup(req, { resource: 'Nationality', action: 'updated', resourceId: req.params.id, name });
};
export const removeNationality = async (req, res) => {
  const row = await deleteNationality(req.params.id);
  res.json(row);
  notifyLookup(req, { resource: 'Nationality', action: 'deleted', resourceId: req.params.id });
};

// Churches
export const getAllChurches = async (req, res) => res.json(await getChurches());
export const createChurch = async (req, res) => {
  const name = _requireNameOr400(req, res);
  if (!name) return;
  const row = await addChurch(name);
  res.json(row);
  notifyLookup(req, { resource: 'Church', action: 'created', resourceId: row?.id, name: row?.name });
};
export const editChurch = async (req, res) => {
  const name = _requireNameOr400(req, res);
  if (!name) return;
  const row = await updateChurch(req.params.id, name);
  res.json(row);
  notifyLookup(req, { resource: 'Church', action: 'updated', resourceId: req.params.id, name });
};
export const editChurchZone = async (req, res) => {
  const zone_id = req.body?.zone_id ?? null;

  if (zone_id !== null && zone_id !== undefined) {
    const z = await db.query('SELECT id FROM zones WHERE id = $1', [zone_id]);
    if (!z.rows.length) return res.status(400).json({ error: 'Invalid zone_id' });
  }

  const row = await updateChurchZone(req.params.id, zone_id);
  res.json(row);
  notifyLookup(req, { resource: 'Church', action: 'zone_updated', resourceId: req.params.id, name: row?.name });
};
export const removeChurch = async (req, res) => {
  const row = await deleteChurch(req.params.id);
  res.json(row);
  notifyLookup(req, { resource: 'Church', action: 'deleted', resourceId: req.params.id });
};

// Zones
export const getAllZones = async (req, res) => {
  res.json(await getZones());
};
export const createZone = async (req, res) => {
  const row = await addZone({ ...req.body });
  res.json(row);
  notifyLookup(req, { resource: 'Zone', action: 'created', resourceId: row?.id, name: row?.name });
};
export const editZone = async (req, res) => {
  const row = await updateZone(req.params.id, req.body);
  res.json(row);
  notifyLookup(req, { resource: 'Zone', action: 'updated', resourceId: req.params.id, name: req.body.name || row?.name });
};
export const removeZone = async (req, res) => {
  const row = await deleteZone(req.params.id);
  res.json(row);
  notifyLookup(req, { resource: 'Zone', action: 'deleted', resourceId: req.params.id });
};

// Status Types
export const getAllStatusTypes = async (req, res) => {
  const church_id = req.user?.church_id || req.query.church_id;
  if (!church_id) return res.status(400).json({ error: 'church_id required' });
  res.json(await getStatusTypes(church_id));
};
export const createStatusType = async (req, res) => {
  const church_id = req.user?.church_id || req.body.church_id;
  if (!church_id) return res.status(400).json({ error: 'church_id required' });
  const row = await addStatusType({ ...req.body, church_id });
  res.json(row);
  notifyLookup(req, { resource: 'StatusType', action: 'created', resourceId: row?.id, name: row?.name });
};
export const editStatusType = async (req, res) => {
  const row = await updateStatusType(req.params.id, req.body);
  res.json(row);
  notifyLookup(req, { resource: 'StatusType', action: 'updated', resourceId: req.params.id, name: req.body.name || row?.name });
};
export const removeStatusType = async (req, res) => {
  const row = await deleteStatusType(req.params.id);
  res.json(row);
  notifyLookup(req, { resource: 'StatusType', action: 'deleted', resourceId: req.params.id });
};
