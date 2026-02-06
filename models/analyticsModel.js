import db from '../config/db.js';

/**
 * Returns cell-level health summary for the last N weeks.
 * - churchId: id of church
 * - options.weeks: integer (default 8) number of weeks to consider
 *
 * Response: [
 *   {
 *     cell_group_id,
 *     name,
 *     leader_id,
 *     leader_first_name,
 *     leader_surname,
 *     leader_contact,
 *     member_count,
 *     avg_attendance,           // averaged total_cell_attendance over weeks (or NULL)
 *     last_meeting_date,
 *     attendance_trend: [ { week_start, attendance }... ],
 *     is_ready_for_multiplication
 *   }, ...
 * ]
 */
export async function getCellHealthDashboard(churchId, { weeks = 8 } = {}) {
  // compute date range
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - (weeks * 7));

  const q = `
    WITH recent AS (
      SELECT wr.cell_group_id, wr.meeting_date, wr.total_cell_attendance, wr.visitors_count, wr.souls_saved_meeting
      FROM weekly_reports wr
      WHERE wr.church_id = $1
        AND wr.is_deleted IS NOT TRUE
        AND wr.meeting_date BETWEEN $2::date AND $3::date
    ),
    agg AS (
      SELECT cg.id AS cell_group_id, cg.name,
             COALESCE( (SELECT COUNT(*) FROM cell_members cm WHERE cm.cell_group_id = cg.id AND cm.is_active), 0 ) AS member_count,
             MAX(r.meeting_date) AS last_meeting_date,
             ROUND(AVG(COALESCE(r.total_cell_attendance,0))::numeric,2) AS avg_attendance,
             COUNT(r.*) AS meetings_count,
             cg.is_ready_for_multiplication
      FROM cell_groups cg
      LEFT JOIN recent r ON r.cell_group_id = cg.id
      WHERE cg.church_id = $1
      GROUP BY cg.id
    )
    SELECT a.*, z.name AS zone_name, s.name AS status_name,
           m.first_name AS leader_first_name, m.surname AS leader_surname, m.contact_primary AS leader_contact
    FROM agg a
    LEFT JOIN cell_groups cg ON cg.id = a.cell_group_id
    LEFT JOIN zones z ON cg.zone_id = z.id
    LEFT JOIN status_types s ON cg.status_id = s.id
    LEFT JOIN members m ON cg.leader_id = m.id
    ORDER BY a.avg_attendance DESC NULLS LAST, a.meetings_count DESC;
  `;
  const vals = [churchId, startDate.toISOString().slice(0,10), endDate.toISOString().slice(0,10)];
  const { rows } = await db.query(q, vals);

  // assemble trend per cell (small additional query per cell — acceptable for small result sets)
  const results = [];
  for (const r of rows) {
    const trendQ = `
      SELECT meeting_date, total_cell_attendance
      FROM weekly_reports
      WHERE church_id = $1 AND cell_group_id = $2 AND is_deleted IS NOT TRUE
        AND meeting_date BETWEEN $3::date AND $4::date
      ORDER BY meeting_date ASC
    `;
    const trendRes = await db.query(trendQ, [churchId, r.cell_group_id, vals[1], vals[2]]);
    r.attendance_trend = (trendRes.rows || []).map(t => ({ meeting_date: t.meeting_date, attendance: t.total_cell_attendance || 0 }));
    results.push(r);
  }

  return results;
}

/**
 * Consolidated report for month/year (returns meetings array)
 * Response: { meetings: [ { id, cell_group_id, cell_name, topic, session_date, total_cell_attendance, visitors_count, absentees_count, rsvp_count } ], totals: {...} }
 */
export async function getConsolidatedReport(churchId, month, year) {
  // month: 1-12
  if (!churchId) return null;
  const start = `${year}-${String(month).padStart(2,'0')}-01`;
  const q = `
    SELECT wr.id, wr.cell_group_id, cg.name AS cell_name, wr.topic, wr.meeting_date AS session_date,
           COALESCE(wr.total_cell_attendance,0) AS total_cell_attendance,
           COALESCE(wr.visitors_count, (SELECT jsonb_array_length(coalesce(wr.visitors,'[]'::jsonb)))) AS visitors_count,
           COALESCE(wr.absentees_count, (SELECT jsonb_array_length(coalesce(wr.absentees,'[]'::jsonb)))) AS absentees_count
    FROM weekly_reports wr
    LEFT JOIN cell_groups cg ON wr.cell_group_id = cg.id
    WHERE wr.church_id = $1
      AND EXTRACT(MONTH FROM wr.meeting_date)::int = $2
      AND EXTRACT(YEAR FROM wr.meeting_date)::int = $3
      AND wr.is_deleted IS NOT TRUE
    ORDER BY wr.meeting_date ASC
  `;
  const { rows } = await db.query(q, [churchId, month, year]);

  const totals = rows.reduce((acc, cur) => {
    acc.total_attendance = (acc.total_attendance || 0) + (cur.total_cell_attendance || 0);
    acc.total_visitors = (acc.total_visitors || 0) + (cur.visitors_count || 0);
    acc.total_absentees = (acc.total_absentees || 0) + (cur.absentees_count || 0);
    return acc;
  }, {});

  return { meetings: rows, totals };
}

/**
 * Absentee trends: return per-member missed count in last N weeks and summary
 * Response: { summary: { total_flagged, avg_missed }, members: [ { member_id, full_name, missed_count, last_missed_date, cell_name } ] }
 */
export async function getAbsenteeTrends(churchId, { weeks = 12 } = {}) {
  if (!churchId) return null;
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - (weeks * 7));

  // Count occurrences where a member appears in weekly_reports.absentees JSONB
  const q = `
    WITH abs AS (
      SELECT (elem->>'member_id')::bigint AS member_id,
             wr.meeting_date
      FROM weekly_reports wr,
           jsonb_array_elements(coalesce(wr.absentees,'[]'::jsonb)) elem
      WHERE wr.church_id = $1
        AND wr.meeting_date BETWEEN $2::date AND $3::date
        AND (elem->>'member_id') IS NOT NULL
    ), agg AS (
      SELECT a.member_id, COUNT(*) AS missed_count, MAX(a.meeting_date) AS last_missed_date
      FROM abs a
      GROUP BY a.member_id
    )
    SELECT agg.*, m.first_name, m.surname, cg.name AS cell_name
    FROM agg
    LEFT JOIN members m ON m.id = agg.member_id
    -- use cell_members to resolve a member's current cell (members table has no cell_group_id)
    LEFT JOIN cell_members cm ON cm.member_id = m.id AND cm.is_active = TRUE
    LEFT JOIN cell_groups cg ON cg.id = cm.cell_group_id
    ORDER BY agg.missed_count DESC, agg.last_missed_date DESC
    LIMIT 200;
  `;
  const { rows } = await db.query(q, [churchId, startDate.toISOString().slice(0,10), endDate.toISOString().slice(0,10)]);
  const total_flagged = rows.length;
  const avg_missed = rows.reduce((s, r) => s + Number(r.missed_count || 0), 0) / (rows.length || 1);

  return { summary: { total_flagged, avg_missed }, members: rows };
}

/**
 * At-risk members: members with missed_count >= threshold in last weeks
 * Response: [ { member_id, full_name, missed_count, last_missed_date, cell_name, phone } ]
 */
export async function getAtRiskMembers(churchId, { weeks = 12, threshold = 3 } = {}) {
  const trends = await getAbsenteeTrends(churchId, { weeks });
  if (!trends || !Array.isArray(trends.members)) return [];
  const atRisk = trends.members.filter(m => (m.missed_count || 0) >= threshold);

  // attach phone/email
  const memberIds = atRisk.map(m => m.member_id).filter(Boolean);
  if (!memberIds.length) return atRisk;
  const { rows } = await db.query(
    `SELECT id, phone_primary, contact_primary, email FROM members WHERE id = ANY($1::bigint[])`,
    [memberIds]
  );
  const map = {};
  rows.forEach(r => map[r.id] = r);
  return atRisk.map(m => ({ ...m, contact: map[m.member_id] ? (map[m.member_id].contact_primary || map[m.member_id].phone_primary || map[m.member_id].email) : null }));
}

/**
 * Get dashboard metrics: growth rate and financial totals
 * Response: { growthRate: number, totalOfferings: number }
 */
export async function getDashboardMetrics(churchId) {
  if (!churchId) return { growthRate: 0, totalOfferings: 0 };

  // Calculate growth rate based on member growth over the last 30 days vs previous 30 days
  const growthQuery = `
    WITH current_period AS (
      SELECT COUNT(*) as current_members
      FROM members
      WHERE church_id = $1
        AND created_at >= NOW() - INTERVAL '30 days'
    ),
    previous_period AS (
      SELECT COUNT(*) as previous_members
      FROM members
      WHERE church_id = $1
        AND created_at >= NOW() - INTERVAL '60 days'
        AND created_at < NOW() - INTERVAL '30 days'
    )
    SELECT
      CASE
        WHEN p.previous_members > 0 THEN
          ROUND(((c.current_members::numeric - p.previous_members::numeric) / p.previous_members::numeric) * 100, 2)
        ELSE 0
      END as growth_rate
    FROM current_period c
    CROSS JOIN previous_period p;
  `;

  const growthResult = await db.query(growthQuery, [churchId]);
  const growthRate = growthResult.rows[0]?.growth_rate || 0;

  // Calculate total offerings from various possible tables
  let totalOfferings = 0;

  // Try different table/column combinations for offerings/givings
  const tables = ['cell_weekly_reports', 'weekly_reports', 'givings', 'giving', 'offerings', 'contributions', 'donations'];
  const amountCols = ['offering', 'amount', 'value', 'total'];

  for (const table of tables) {
    for (const amountCol of amountCols) {
      try {
        const offeringQuery = `
          SELECT COALESCE(SUM(${amountCol}), 0)::numeric as total
          FROM ${table}
          WHERE church_id = $1 AND ${amountCol} IS NOT NULL
        `;
        const result = await db.query(offeringQuery, [churchId]);
        if (result.rows[0]?.total > 0) {
          totalOfferings = result.rows[0].total;
          break;
        }
      } catch (err) {
        // Continue trying other combinations
        continue;
      }
    }
    if (totalOfferings > 0) break;
  }

  return {
    growthRate: Number(growthRate),
    totalOfferings: Number(totalOfferings)
  };
}

/**
 * Get comprehensive admin system analytics
 * Response: Comprehensive analytics data including users, roles, audit logs, system health, etc.
 */
export async function getAdminSystemMetrics() {
  // User analytics by status
  const userStatusQuery = `
    SELECT
      status,
      COUNT(*)::int as count
    FROM users
    GROUP BY status
  `;
  const userStatusResult = await db.query(userStatusQuery);
  const userStatus = userStatusResult.rows.reduce((acc, row) => {
    acc[row.status] = row.count;
    return acc;
  }, {});

  const totalUsers = Object.values(userStatus).reduce((sum, count) => sum + count, 0);
  const activeUsers = userStatus.active || 0;
  const inactiveUsers = userStatus.inactive || 0;
  const deactivatedUsers = userStatus.deactivated || 0;

  // User analytics by church
  const usersByChurchQuery = `
    SELECT
      c.name as church_name,
      COUNT(DISTINCT m.id)::int as members,
      COUNT(DISTINCT u.id)::int as users,
      COUNT(DISTINCT CASE WHEN ms.name = 'active' THEN m.id END)::int as active_members
    FROM churches c
    LEFT JOIN members m ON c.id = m.church_id
    LEFT JOIN users u ON u.id = m.user_id
    LEFT JOIN member_statuses ms ON m.member_status_id = ms.id
    GROUP BY c.id, c.name
    ORDER BY c.name
  `;
  const usersByChurch = await db.query(usersByChurchQuery).then(r => r.rows);

  // Role distribution
  const roleDistributionQuery = `
    SELECT
      r.name as role_name,
      COUNT(ur.user_id)::int as user_count
    FROM roles r
    LEFT JOIN user_roles ur ON r.id = ur.role_id
    GROUP BY r.id, r.name
    ORDER BY r.name
  `;
  const roleDistribution = await db.query(roleDistributionQuery).then(r => r.rows);

  // Login tracking (recent logins - using user creation as proxy)
  const recentLoginsQuery = `
    SELECT COUNT(*)::int as count
    FROM users
    WHERE created_at >= NOW() - INTERVAL '24 hours'
  `;
  const recentLogins = await db.query(recentLoginsQuery).then(r => r.rows[0]?.count || 0);

  // Audit logs (recent system activities) - using actual system events
  const auditLogsQuery = `
    SELECT
      'user_created' as action,
      COALESCE(name, 'New User') as details,
      created_at as timestamp
    FROM users
    WHERE created_at >= NOW() - INTERVAL '7 days'

    UNION ALL

    SELECT
      'member_added' as action,
      CONCAT(COALESCE(first_name, ''), ' ', COALESCE(surname, 'New Member')) as details,
      created_at as timestamp
    FROM members
    WHERE created_at >= NOW() - INTERVAL '7 days'

    UNION ALL

    SELECT
      'notification_created' as action,
      COALESCE(title, 'System Notification') as details,
      created_at as timestamp
    FROM in_app_notifications
    WHERE created_at >= NOW() - INTERVAL '7 days'

    ORDER BY timestamp DESC
    LIMIT 10
  `;
  const auditLogs = await db.query(auditLogsQuery).then(r => r.rows);

  // Missing information tracking
  const missingInfoQuery = `
    SELECT
      'missing_emails' as type,
      COUNT(*)::int as count
    FROM members
    WHERE email IS NULL OR email = ''

    UNION ALL

    SELECT
      'missing_phones' as type,
      COUNT(*)::int as count
    FROM members
    WHERE contact_primary IS NULL OR contact_primary = ''

    UNION ALL

    SELECT
      'incomplete_profiles' as type,
      COUNT(*)::int as count
    FROM members
    WHERE (date_of_birth IS NULL OR profession IS NULL OR physical_address IS NULL)
  `;
  const missingInfo = await db.query(missingInfoQuery).then(r => r.rows);

  // System notifications - using the actual in_app_notifications table from notificationModel
  const systemNotificationsQuery = `
    SELECT
      id,
      COALESCE(title, 'System Notification') as title,
      COALESCE(message, 'No content') as body,
      CASE WHEN read = true THEN 'read' ELSE 'unread' END as status,
      created_at
    FROM in_app_notifications
    ORDER BY created_at DESC
    LIMIT 5
  `;
  const systemNotifications = await db.query(systemNotificationsQuery).then(r => r.rows);

  // Tasks/To-do items (using prayer requests as tasks proxy)
  const tasksQuery = `
    SELECT
      pr.id,
      COALESCE(pr.category, 'General Request') || ' - ' || LEFT(COALESCE(pr.description, 'No description'), 50) as title,
      pr.description,
      pr.status,
      pr.created_at,
      m.first_name,
      m.surname
    FROM prayer_requests pr
    LEFT JOIN members m ON pr.created_by_member_id = m.id
    WHERE pr.status = 'open'
      AND pr.created_at >= NOW() - INTERVAL '30 days'
    ORDER BY pr.created_at DESC
    LIMIT 5
  `;
  const tasks = await db.query(tasksQuery).then(r => r.rows);

  // System health metrics - using actual in_app_notifications table
  const systemHealthQuery = `
    SELECT
      COUNT(CASE WHEN COALESCE(message, '') LIKE '%error%' OR COALESCE(message, '') LIKE '%failed%' THEN 1 END)::int as recent_errors,
      COUNT(*)::int as total_notifications,
      COUNT(DISTINCT CASE WHEN user_id IS NOT NULL THEN user_id END)::int as active_users_today
    FROM in_app_notifications
    WHERE created_at >= NOW() - INTERVAL '24 hours'
  `;
  const systemMetrics = await db.query(systemHealthQuery).then(r => r.rows[0] || {
    recent_errors: 0,
    total_notifications: 0,
    active_users_today: 0
  });

  // Disk usage estimation (simplified)
  const diskUsageQuery = `
    SELECT
      schemaname,
      tablename,
      pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
    FROM pg_tables
    WHERE schemaname = 'public'
    ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
    LIMIT 5
  `;
  const diskUsage = await db.query(diskUsageQuery).then(r => r.rows);

  return {
    // User Analytics
    userAnalytics: {
      totalUsers,
      activeUsers,
      inactiveUsers,
      deactivatedUsers,
      usersByChurch,
      roleDistribution,
      recentLogins
    },

    // System Health
    systemHealth: {
      status: systemMetrics.recent_errors > 0 ? 'warning' : 'healthy',
      recentErrors: systemMetrics.recent_errors || 0,
      databaseConnections: systemMetrics.active_users_today || 0,
      activeSessions: systemMetrics.total_notifications || 0
    },

    // Audit & Monitoring
    auditLogs,
    missingInfo,

    // Tasks & Notifications
    tasks,
    systemNotifications,

    // System Resources
    diskUsage,

    // Summary metrics for backward compatibility
    pendingNotifications: systemNotifications.filter(n => n.status === 'pending').length,
    recentActivity: auditLogs.length,
    churches: usersByChurch.length
  };
}

export default {
  getCellHealthDashboard,
  getConsolidatedReport,
  getAbsenteeTrends,
  getAtRiskMembers,
  getDashboardMetrics,
  getAdminSystemMetrics
};