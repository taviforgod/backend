import db from './config/db.js';
import * as crisisModel from './models/crisisFollowupModel.js';

async function testCrisisQuery() {
  try {
    console.log('🧪 Testing crisis care query...');

    const churchId = 1;
    const startDate = '2024-01-01';
    const endDate = '2024-12-31';

    // Test the crisis summary query
    const crisisSummaryQuery = `
      SELECT
        DATE_TRUNC('month', cf.date_reported) as month,
        COUNT(*) as total_cases,
        COUNT(CASE WHEN cf.severity_level = 'critical' THEN 1 END) as critical_cases,
        COUNT(CASE WHEN cf.case_status = 'resolved' THEN 1 END) as resolved_cases,
        COUNT(CASE WHEN cf.case_status = 'closed' THEN 1 END) as closed_cases,
        AVG(cf.resolution_date::date - cf.date_reported::date) FILTER (WHERE cf.resolution_date IS NOT NULL AND cf.date_reported IS NOT NULL) as avg_resolution_days
      FROM crisis_followups cf
      WHERE cf.church_id = $1 AND cf.date_reported BETWEEN $2 AND $3
      GROUP BY DATE_TRUNC('month', cf.date_reported)
      ORDER BY month DESC
    `;

    console.log('Running crisis summary query...');
    const result = await db.query(crisisSummaryQuery, [churchId, startDate, endDate]);
    console.log('✅ Crisis summary query successful:', result.rows.length, 'rows');

    // --- Leader-scoped query smoke test ---
    const leaderMemberId = 2; // choose an example leader member id in your dev DB
    console.log('Running leader-scoped crisis case query for leader id', leaderMemberId);
    const cellRows = await db.query('SELECT id FROM cell_groups WHERE church_id = $1 AND leader_id = $2', [churchId, leaderMemberId]);
    const cellIds = (cellRows.rows || []).map(r => r.id);
    if (cellIds.length) {
      const cases = await crisisModel.getAllCrisisFollowups({ church_id: churchId, cell_group_ids: cellIds, limit: 25 });
      console.log('Leader-scoped query returned', cases.length, 'cases for leader', leaderMemberId, 'cells', cellIds);
    } else {
      console.log('No cell groups found for leader id', leaderMemberId);
    }

    // --- Permission mapping check for cell_leader ---
    try {
      const permRes = await db.query(`
        SELECT p.name
        FROM role_permissions rp
        JOIN roles r ON rp.role_id = r.id
        JOIN permissions p ON rp.permission_id = p.id
        WHERE r.name = 'cell_leader' AND p.name IN ('crisis_view','crisis_assign')
      `);
      const perms = (permRes.rows || []).map(r => r.name);
      console.log('cell_leader permissions (expected at least crisis_view, crisis_assign):', perms);
    } catch (e) {
      console.error('Permission check failed:', e.message);
    }

  } catch (error) {
    console.error('❌ Crisis query failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

testCrisisQuery();