/**
 * overviewModel: simple aggregator for pastor dashboard.
 * Adjust sql/field/table names and db client to your project.
 */

import db from '../config/db.js'; 

async function scalar(query, params = []) {
  const r = await db.query(query, params);
  return r?.rows?.[0] ? Object.values(r.rows[0])[0] : null;
}

// safe wrapper that returns fallback on SQL error and logs the problem
async function safeScalar(query, params = [], fallback = 0) {
  try {
    const v = await scalar(query, params);
    return v ?? fallback;
  } catch (err) {
    console.warn('overviewModel safeScalar failed for query:', query, 'params:', params, 'err:', err?.message || err);
    return fallback;
  }
}

export async function getMembersTotal(churchId) {
  const q = 'SELECT COUNT(*)::int AS count FROM members WHERE church_id = $1';
  return safeScalar(q, [churchId], 0);
}

export async function getNewMembers(churchId, days = 30) {
  const q = `SELECT COUNT(*)::int AS count FROM members WHERE church_id = $1 AND created_at >= NOW() - ($2::int || ' days')::interval`;
  return safeScalar(q, [churchId, days], 0);
}

export async function getBaptisms(churchId, days = 30) {
  const q = `SELECT COUNT(*)::int AS count FROM members WHERE church_id = $1 AND baptized = true AND baptized_at >= NOW() - ($2::int || ' days')::interval`;
  return safeScalar(q, [churchId, days], 0);
}

export async function getActiveCells(churchId) {
  // Try a few common column names/filters; return 0 if none exist
  const attempts = [
    { q: `SELECT COUNT(*)::int AS count FROM cell_groups WHERE church_id = $1 AND is_active = true`, params: [churchId] },
    { q: `SELECT COUNT(*)::int AS count FROM cell_groups WHERE church_id = $1 AND active = true`, params: [churchId] },
    { q: `SELECT COUNT(*)::int AS count FROM cell_groups WHERE church_id = $1 AND status = 'active'`, params: [churchId] },
    { q: `SELECT COUNT(*)::int AS count FROM cell_groups WHERE church_id = $1`, params: [churchId] } // fallback to total groups
  ];

  for (const a of attempts) {
    try {
      const v = await scalar(a.q, a.params);
      if (v !== null && v !== undefined) return v;
    } catch (err) {
      // try next
    }
  }
  console.warn('getActiveCells: no matching cell_groups columns/tables found, returning 0');
  return 0;
}

export async function getAttendancePct(churchId, days = 30) {
  const q = `
    SELECT ROUND(AVG( CASE WHEN total_expected = 0 THEN 0 ELSE (attended::numeric / NULLIF(total_expected,0) * 100) END )::numeric, 2) AS pct
    FROM (
      SELECT m.session_date,
             SUM(ar.present_count) AS attended,
             SUM(m.expected_count) AS total_expected
      FROM meetings m
      LEFT JOIN attendance_records ar ON ar.meeting_id = m.id
      WHERE m.church_id = $1 AND m.session_date >= NOW() - ($2::int || ' days')::interval
      GROUP BY m.session_date
    ) t;
  `;
  return safeScalar(q, [churchId, days], 0);
}

export async function getGivingSummary(churchId, period = 'month') {
  // Try several common table/column name combos to avoid hard failure on missing table
  const tables = ['givings', 'giving', 'offerings', 'contributions', 'donations'];
  const dateCols = ['date', 'created_at', 'received_at'];
  const amountCols = ['amount', 'value', 'total'];

  for (const table of tables) {
    for (const dateCol of dateCols) {
      for (const amountCol of amountCols) {
        const q = `SELECT COALESCE(SUM(${amountCol}),0)::numeric AS total FROM ${table} WHERE church_id = $1 AND date_trunc('month', ${dateCol}) = date_trunc('month', NOW())`;
        try {
          const v = await scalar(q, [churchId]);
          if (v !== null && v !== undefined) return { period, amount: v };
        } catch (err) {
          // ignore and try next combination
        }
      }
    }
  }

  console.warn('getGivingSummary: no matching giving table/columns found, returning zero summary');
  return { period, amount: 0 };
}

export async function getOverview(churchId, opts = {}) {
  const days = opts.period && opts.period.endsWith('d') ? parseInt(opts.period.replace('d','')) : 30;
  const [
    members_total,
    new_members,
    baptisms,
    active_cells,
    attendance_pct,
    giving_summary
  ] = await Promise.all([
    getMembersTotal(churchId),
    getNewMembers(churchId, days),
    getBaptisms(churchId, days),
    getActiveCells(churchId),
    getAttendancePct(churchId, days),
    getGivingSummary(churchId, opts.period || 'month')
  ]);

  return {
    members_total,
    new_members,
    baptisms,
    active_cells,
    attendance_pct,
    giving_summary
  };
}