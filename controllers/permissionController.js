import { getAllPermissions, createPermission, deletePermission, updatePermission } from '../models/permissionModel.js';

export const listPermissions = async (req, res) => {
  res.json(await getAllPermissions());
};

export const createPermissionCtrl = async (req, res) => {
  res.status(201).json(await createPermission(req.body.name));
};

export const updatePermissionCtrl = async (req, res) => {
  const updated = await updatePermission(req.params.id, req.body.name);
  res.json(updated);
};

export const deletePermissionCtrl = async (req, res) => {
  await deletePermission(req.params.id);
  res.status(204).send();
};