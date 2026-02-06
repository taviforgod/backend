import * as zoneModel from '../models/zoneModel.js';
import { handleError } from '../utils/errorHandler.js';
import db from '../config/db.js';

function isZonalPastor(role) {
  return role === 'Zonal Pastor' || role === 'Zonal_Pastor';
}

// Get zones (filtered by permission)
export async function getAllZones(req, res) {
  try {
    const userId = req.user?.userId;

    const roleRes = await db.query(
      `SELECT r.name FROM user_roles ur JOIN roles r ON ur.role_id = r.id WHERE ur.user_id = $1 LIMIT 1`,
      [userId]
    );
    const role = roleRes.rows[0]?.name;

    let zones;
    if (isZonalPastor(role)) {
      zones = await zoneModel.getZonesForPastor(userId);
    } else {
      zones = await zoneModel.getAllZones();
    }

    res.json(zones);
  } catch (err) {
    handleError(res, 'getAllZones', err);
  }
}

// Get zone by ID with churches (permission-checked)
export async function getZoneById(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;

    const roleRes = await db.query(
      `SELECT r.name FROM user_roles ur JOIN roles r ON ur.role_id = r.id WHERE ur.user_id = $1 LIMIT 1`,
      [userId]
    );
    const role = roleRes.rows[0]?.name;

    const zone = await zoneModel.getZoneWithChurches(id);
    if (!zone) return res.status(404).json({ error: 'Zone not found' });

    if (isZonalPastor(role)) {
      const zonesPastor = await zoneModel.getZonesForPastor(userId);
      if (!zonesPastor.find(z => z.id === parseInt(id))) {
        return res.status(403).json({ error: 'You do not have access to this zone' });
      }
    }

    res.json(zone);
  } catch (err) {
    handleError(res, 'getZoneById', err);
  }
}

// Zonal dashboard (aggregated across churches in zone)
export async function getZonalDashboard(req, res) {
  try {
    const { zoneId } = req.params;
    const userId = req.user?.userId;

    const roleRes = await db.query(
      `SELECT r.name FROM user_roles ur JOIN roles r ON ur.role_id = r.id WHERE ur.user_id = $1 LIMIT 1`,
      [userId]
    );
    const role = roleRes.rows[0]?.name;

    if (isZonalPastor(role)) {
      const zonesPastor = await zoneModel.getZonesForPastor(userId);
      if (!zonesPastor.find(z => z.id === parseInt(zoneId))) {
        return res.status(403).json({ error: 'You do not have access to this zone' });
      }
    }

    const zone = await zoneModel.getZoneWithChurches(zoneId);
    if (!zone) return res.status(404).json({ error: 'Zone not found' });

    const churchIds = zone.churches?.map(c => c.id) || [];

    let memberMetrics = { total: 0, active: 0, inactive: 0 };
    let leaderMetrics = { total: 0, cellLeaders: 0, pastors: 0 };
    let cellGroupMetrics = { total: 0 };
    let crisisCaseMetrics = { total: 0, critical: 0, active: 0 };
    let givingMetrics = { total: 0, ytd: 0 };

    if (churchIds.length > 0) {
      const placeholders = churchIds.map((_, i) => `$${i + 1}`).join(',');

      const memberRes = await db.query(
        `SELECT
          COUNT(*) as total,
          SUM(CASE WHEN ms.name = 'active' THEN 1 ELSE 0 END) as active,
          SUM(CASE WHEN ms.name = 'inactive' THEN 1 ELSE 0 END) as inactive
         FROM members m
         LEFT JOIN member_statuses ms ON m.member_status_id = ms.id
         WHERE m.church_id IN (${placeholders})`,
        churchIds
      );
      memberMetrics = {
        total: parseInt(memberRes.rows[0]?.total || 0),
        active: parseInt(memberRes.rows[0]?.active || 0),
        inactive: parseInt(memberRes.rows[0]?.inactive || 0)
      };

      const leaderRes = await db.query(
        `SELECT
          COUNT(*) as total,
          SUM(CASE WHEN LOWER(role) IN ('cell_leader', 'cell leader') THEN 1 ELSE 0 END) as cellLeaders,
          SUM(CASE WHEN LOWER(role) = 'pastor' THEN 1 ELSE 0 END) as pastors
         FROM leadership_roles WHERE church_id IN (${placeholders}) AND active = TRUE`,
        churchIds
      );
      leaderMetrics = {
        total: parseInt(leaderRes.rows[0]?.total || 0),
        cellLeaders: parseInt(leaderRes.rows[0]?.cellLeaders || 0),
        pastors: parseInt(leaderRes.rows[0]?.pastors || 0)
      };

      const cellRes = await db.query(
        `SELECT COUNT(*) as total FROM cell_groups WHERE church_id IN (${placeholders})`,
        churchIds
      );
      cellGroupMetrics = { total: parseInt(cellRes.rows[0]?.total || 0) };

      const crisisRes = await db.query(
        `SELECT
          COUNT(*) as total,
          SUM(CASE WHEN is_active THEN 1 ELSE 0 END) as active,
          SUM(CASE WHEN recovery_progress IS NOT NULL AND recovery_progress <= 2 THEN 1 ELSE 0 END) as critical
         FROM crisis_followups WHERE church_id IN (${placeholders})`,
        churchIds
      );
      crisisCaseMetrics = {
        total: parseInt(crisisRes.rows[0]?.total || 0),
        critical: parseInt(crisisRes.rows[0]?.critical || 0),
        active: parseInt(crisisRes.rows[0]?.active || 0)
      };

      const givingRes = await db.query(
        `SELECT
          COALESCE(SUM(amount), 0) as total,
          COALESCE(SUM(CASE WHEN EXTRACT(YEAR FROM giving_date) = EXTRACT(YEAR FROM NOW()) THEN amount ELSE 0 END), 0) as ytd
         FROM giving_log WHERE church_id IN (${placeholders})`,
        churchIds
      );
      givingMetrics = {
        total: parseFloat(givingRes.rows[0]?.total || 0),
        ytd: parseFloat(givingRes.rows[0]?.ytd || 0)
      };
    }

    const leaders = await zoneModel.getZoneLeaders(zoneId);

    res.json({
      zone,
      metrics: {
        members: memberMetrics,
        leaders: leaderMetrics,
        cellGroups: cellGroupMetrics,
        crisisCases: crisisCaseMetrics,
        giving: givingMetrics
      },
      leaders,
      recentActivities: []
    });
  } catch (err) {
    handleError(res, 'getZonalDashboard', err);
  }
}

// Create zone
export async function createZone(req, res) {
  try {
    const zone = await zoneModel.createZone(req.body);
    res.status(201).json(zone);
  } catch (err) {
    handleError(res, 'createZone', err);
  }
}

// Update zone
export async function updateZone(req, res) {
  try {
    const zone = await zoneModel.updateZone(req.params.id, req.body);
    if (!zone) return res.status(404).json({ error: 'Zone not found' });
    res.json(zone);
  } catch (err) {
    handleError(res, 'updateZone', err);
  }
}

// Delete zone
export async function deleteZone(req, res) {
  try {
    const zone = await zoneModel.deleteZone(req.params.id);
    if (!zone) return res.status(404).json({ error: 'Zone not found' });
    res.json({ message: 'Zone deleted', zone });
  } catch (err) {
    handleError(res, 'deleteZone', err);
  }
}

// Assign leader to zone
export async function assignZoneLeader(req, res) {
  try {
    const { memberId, userId } = req.body;
    const assignment = await zoneModel.assignZoneLeader(req.params.id, memberId, userId);
    res.json({ message: 'Leader assigned to zone', assignment });
  } catch (err) {
    handleError(res, 'assignZoneLeader', err);
  }
}

// Remove zone leader
export async function removeZoneLeader(req, res) {
  try {
    const { memberId } = req.params;
    const removed = await zoneModel.removeZoneLeader(req.params.id, memberId);
    if (!removed) return res.status(404).json({ error: 'Assignment not found' });
    res.json({ message: 'Leader removed from zone', removed });
  } catch (err) {
    handleError(res, 'removeZoneLeader', err);
  }
}

// Get zone leaders
export async function getZoneLeaders(req, res) {
  try {
    const leaders = await zoneModel.getZoneLeaders(req.params.id);
    res.json(leaders);
  } catch (err) {
    handleError(res, 'getZoneLeaders', err);
  }
}

// Assign church to zone
export async function assignChurchToZone(req, res) {
  try {
    const { churchId } = req.params;
    const { zoneId } = req.params;
    const church = await zoneModel.assignChurchToZone(churchId, zoneId);
    res.json({ message: 'Church assigned to zone', church });
  } catch (err) {
    handleError(res, 'assignChurchToZone', err);
  }
}

// Unassign church from zone
export async function unassignChurchFromZone(req, res) {
  try {
    const { churchId } = req.params;
    const church = await zoneModel.unassignChurchFromZone(churchId);
    res.json({ message: 'Church unassigned from zone', church });
  } catch (err) {
    handleError(res, 'unassignChurchFromZone', err);
  }
}

// Get zones for current pastor
export async function getMyZones(req, res) {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Not authenticated' });

    const zones = await zoneModel.getZonesForPastor(userId);
    res.json(zones);
  } catch (err) {
    handleError(res, 'getMyZones', err);
  }
}
