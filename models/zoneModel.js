import db from '../config/db.js';

// Get all zones (global)
export async function getAllZones() {
  const result = await db.query('SELECT * FROM zones ORDER BY name');
  return result.rows;
}

// Get zone by ID
export async function getZoneById(zoneId) {
  const result = await db.query('SELECT * FROM zones WHERE id = $1', [zoneId]);
  return result.rows[0];
}

// Get zone with churches
export async function getZoneWithChurches(zoneId) {
  const zone = await getZoneById(zoneId);
  if (!zone) return null;

  const churches = await db.query(
    `SELECT c.*,
            COUNT(DISTINCT m.id) AS member_count,
            COUNT(DISTINCT cg.id) AS cell_group_count
     FROM churches c
     LEFT JOIN members m ON c.id = m.church_id
     LEFT JOIN cell_groups cg ON c.id = cg.church_id
     WHERE c.zone_id = $1
     GROUP BY c.id
     ORDER BY c.name`,
    [zoneId]
  );

  return {
    ...zone,
    churches: churches.rows
  };
}

// Get zonal pastor's zones
export async function getZonesForPastor(userId) {
  const result = await db.query(
    `SELECT DISTINCT z.* FROM zones z
     JOIN zone_leaders zl ON z.id = zl.zone_id
     WHERE zl.user_id = $1
     ORDER BY z.name`,
    [userId]
  );
  return result.rows;
}

// Create zone
export async function createZone(data) {
  const { name, description = null, region = null } = data;
  const result = await db.query(
    `INSERT INTO zones (name, description, region)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [name, description, region]
  );
  return result.rows[0];
}

// Update zone
export async function updateZone(zoneId, data) {
  const { name, description = null, region = null } = data;
  const result = await db.query(
    `UPDATE zones
     SET name = $1, description = $2, region = $3, updated_at = NOW()
     WHERE id = $4
     RETURNING *`,
    [name, description, region, zoneId]
  );
  return result.rows[0];
}

// Delete zone
export async function deleteZone(zoneId) {
  const result = await db.query(
    'DELETE FROM zones WHERE id = $1 RETURNING *',
    [zoneId]
  );
  return result.rows[0];
}

// Assign leader to zone
export async function assignZoneLeader(zoneId, memberId, userId) {
  const result = await db.query(
    `INSERT INTO zone_leaders (zone_id, member_id, user_id)
     VALUES ($1, $2, $3)
     ON CONFLICT (zone_id, member_id) DO UPDATE SET user_id = $3
     RETURNING *`,
    [zoneId, memberId, userId]
  );
  return result.rows[0];
}

// Remove zone leader
export async function removeZoneLeader(zoneId, memberId) {
  const result = await db.query(
    'DELETE FROM zone_leaders WHERE zone_id = $1 AND member_id = $2 RETURNING *',
    [zoneId, memberId]
  );
  return result.rows[0];
}

// Get zone leaders
export async function getZoneLeaders(zoneId) {
  const result = await db.query(
    `SELECT zl.*, m.first_name, m.surname, u.email
     FROM zone_leaders zl
     JOIN members m ON zl.member_id = m.id
     LEFT JOIN users u ON zl.user_id = u.id
     WHERE zl.zone_id = $1
     ORDER BY m.first_name, m.surname`,
    [zoneId]
  );
  return result.rows;
}

// Assign church to zone
export async function assignChurchToZone(churchId, zoneId) {
  const result = await db.query(
    `UPDATE churches SET zone_id = $1 WHERE id = $2 RETURNING *`,
    [zoneId, churchId]
  );
  return result.rows[0];
}

// Unassign church from zone
export async function unassignChurchFromZone(churchId) {
  const result = await db.query(
    `UPDATE churches SET zone_id = NULL WHERE id = $1 RETURNING *`,
    [churchId]
  );
  return result.rows[0];
}
