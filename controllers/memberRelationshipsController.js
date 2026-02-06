import {
  getMemberRelationships,
  createRelationship,
  deleteRelationship,
  getMemberDepartments,
  assignMemberToDepartment,
  removeMemberDepartment,
  getDepartmentsForChurch,
  createDepartment
} from '../models/memberRelationshipsModel.js';

export const getRelationshipsCtrl = async (req, res) => {
  try {
    const church_id = req.user?.church_id;
    const memberId = req.params.id;
    if (!church_id) return res.status(400).json({ error: 'Church not specified' });
    const rows = await getMemberRelationships(memberId, church_id);
    res.json(rows);
  } catch (err) {
    console.error('getRelationshipsCtrl error', err);
    res.status(500).json({ error: err.message || 'Failed to fetch relationships' });
  }
};

export const postRelationshipCtrl = async (req, res) => {
  try {
    const church_id = req.user?.church_id;
    const memberId = req.params.id;
    if (!church_id) return res.status(400).json({ error: 'Church not specified' });

    const payload = {
      church_id,
      member_id: memberId,
      related_member_id: req.body.related_member_id,
      relationship_type: req.body.relationship_type,
      is_primary: req.body.is_primary || false,
      metadata: req.body.metadata || {},
      created_by: req.user?.member_id || null
    };

    if (!payload.related_member_id || !payload.relationship_type) {
      return res.status(400).json({ error: 'related_member_id and relationship_type are required' });
    }

    const created = await createRelationship(payload);
    res.status(201).json(created);
  } catch (err) {
    console.error('postRelationshipCtrl error', err);
    res.status(500).json({ error: err.message || 'Failed to create relationship' });
  }
};

export const deleteRelationshipCtrl = async (req, res) => {
  try {
    const church_id = req.user?.church_id;
    const id = req.params.relId;
    if (!church_id) return res.status(400).json({ error: 'Church not specified' });
    await deleteRelationship(id, church_id);
    res.status(204).end();
  } catch (err) {
    console.error('deleteRelationshipCtrl error', err);
    res.status(500).json({ error: err.message || 'Failed to delete relationship' });
  }
};

// Departments
export const getMemberDepartmentsCtrl = async (req, res) => {
  try {
    const church_id = req.user?.church_id;
    const memberId = req.params.id;
    if (!church_id) return res.status(400).json({ error: 'Church not specified' });
    const rows = await getMemberDepartments(memberId, church_id);
    res.json(rows);
  } catch (err) {
    console.error('getMemberDepartmentsCtrl error', err);
    res.status(500).json({ error: err.message || 'Failed to fetch member departments' });
  }
};

export const assignDepartmentCtrl = async (req, res) => {
  try {
    const church_id = req.user?.church_id;
    const memberId = req.params.id;
    if (!church_id) return res.status(400).json({ error: 'Church not specified' });

    const payload = {
      church_id,
      member_id: memberId,
      department_id: req.body.department_id,
      role: req.body.role || null,
      assigned_at: req.body.assigned_at || null,
      created_by: req.user?.member_id || null
    };

    if (!payload.department_id) return res.status(400).json({ error: 'department_id required' });

    const assigned = await assignMemberToDepartment(payload);
    res.status(201).json(assigned);
  } catch (err) {
    console.error('assignDepartmentCtrl error', err);
    res.status(500).json({ error: err.message || 'Failed to assign department' });
  }
};

export const removeDepartmentAssignmentCtrl = async (req, res) => {
  try {
    const church_id = req.user?.church_id;
    const id = req.params.assignmentId;
    if (!church_id) return res.status(400).json({ error: 'Church not specified' });
    await removeMemberDepartment(id, church_id);
    res.status(204).end();
  } catch (err) {
    console.error('removeDepartmentAssignmentCtrl error', err);
    res.status(500).json({ error: err.message || 'Failed to remove department assignment' });
  }
};

export const listDepartmentsCtrl = async (req, res) => {
  try {
    const church_id = req.user?.church_id;
    if (!church_id) return res.status(400).json({ error: 'Church not specified' });
    const rows = await getDepartmentsForChurch(church_id);
    res.json(rows);
  } catch (err) {
    console.error('listDepartmentsCtrl error', err);
    res.status(500).json({ error: err.message || 'Failed to fetch departments' });
  }
};

export const createDepartmentCtrl = async (req, res) => {
  try {
    const church_id = req.user?.church_id;
    if (!church_id) return res.status(400).json({ error: 'Church not specified' });

    const payload = {
      church_id,
      name: req.body.name,
      description: req.body.description || null,
      head_member_id: req.body.head_member_id || null,
      created_by: req.user?.member_id || null
    };

    if (!payload.name) return res.status(400).json({ error: 'name required' });

    const d = await createDepartment(payload);
    res.status(201).json(d);
  } catch (err) {
    console.error('createDepartmentCtrl error', err);
    res.status(500).json({ error: err.message || 'Failed to create department' });
  }
};
