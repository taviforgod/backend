import db from '../config/db.js';

/**
 * Get zones assigned to a user based on their church and role
 * If user is a Zonal Pastor, get zones where they are assigned as zone leaders
 * or the zone their church belongs to.
 */
export async function getUserZones(userId, churchId) {
  try {
    const roleRes = await db.query(
      `SELECT r.name FROM user_roles ur
       JOIN roles r ON ur.role_id = r.id
       WHERE ur.user_id = $1 AND r.name = 'Zonal Pastor'`,
      [userId]
    );

    if (roleRes.rows.length === 0) {
      return []; // Not a zonal pastor
    }

    const zonesRes = await db.query(
      `SELECT DISTINCT z.id, z.name, z.description, z.region, z.created_at
       FROM zones z
       LEFT JOIN zone_leaders zl ON z.id = zl.zone_id AND zl.user_id = $1
       LEFT JOIN churches c ON c.zone_id = z.id
       WHERE z.id IS NOT NULL
         AND (zl.id IS NOT NULL OR c.id = $2)
       ORDER BY z.name`,
      [userId, churchId]
    );

    return zonesRes.rows;
  } catch (err) {
    console.error('Error fetching user zones:', err);
    return [];
  }
}

/**
 * Auto-assign a new Zonal Pastor user to their church's zone
 */
export async function assignZonalPastorToChurchZone(userId, churchId) {
  try {
    const churchRes = await db.query('SELECT zone_id FROM churches WHERE id = $1', [churchId]);
    if (churchRes.rows.length === 0 || !churchRes.rows[0].zone_id) return null;

    const zoneId = churchRes.rows[0].zone_id;

    const memberRes = await db.query(
      `SELECT m.id FROM members m
       JOIN users u ON u.id = $1
       WHERE m.church_id = u.church_id
       LIMIT 1`,
      [userId]
    );

    const memberId = memberRes.rows[0]?.id || null;

    await db.query(
      `INSERT INTO zone_leaders (zone_id, member_id, user_id)
       VALUES ($1, $2, $3)
       ON CONFLICT (zone_id, member_id) DO NOTHING`,
      [zoneId, memberId, userId]
    );

    return zoneId;
  } catch (err) {
    console.error('Error assigning zonal pastor to zone:', err);
    return null;
  }
}

/**
 * Get churches in a zone with aggregated stats
 */
export async function getZoneChurchesWithStats(zoneId) {
  try {
    const res = await db.query(
      `SELECT
        c.id,
        c.name,
        c.address,
        (SELECT COUNT(*) FROM members WHERE church_id = c.id) as members_count,
        (SELECT COUNT(*) FROM cell_groups WHERE church_id = c.id) as cell_groups_count,
        (SELECT COUNT(*) FROM crisis_followups WHERE church_id = c.id AND is_active = true) as crisis_cases_count
       FROM churches c
       WHERE c.zone_id = $1
       ORDER BY c.name`,
      [zoneId]
    );

    return res.rows;
  } catch (err) {
    console.error('Error fetching zone churches:', err);
    return [];
  }
}
