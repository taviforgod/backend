import { 
  getAllRoles, 
  createRole, 
  updateRole,
  deleteRole, 
  assignPermission, 
  removePermission, 
  getRolePermissions,
  getPermissionsMatrixData
} from '../models/roleModel.js';

export const listRoles = async (req, res) => {
  res.json(await getAllRoles());
};

export const createRoleCtrl = async (req, res) => {
  res.status(201).json(await createRole(req.body.name));
};

export const updateRoleCtrl = async (req, res) => {
  res.json(await updateRole(req.params.id, req.body.name));
};

export const deleteRoleCtrl = async (req, res) => {
  await deleteRole(req.params.id);
  res.status(204).send();
};

export const assignPermissionCtrl = async (req, res) => {
  await assignPermission(req.params.id, req.body.permissionId);
  res.json({ message: 'Permission assigned' });
};

export const removePermissionCtrl = async (req, res) => {
  await removePermission(req.params.id, req.body.permissionId);
  res.json({ message: 'Permission removed' });
};

export const getRolePermissionsCtrl = async (req, res) => {
  res.json(await getRolePermissions(req.params.id));
};

export const getPermissionsMatrix = async (req, res) => {
  const matrix = await getPermissionsMatrixData();
  res.json(matrix);
};