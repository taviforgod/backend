import db from '../config/db.js';

// return counts for born again, baptized, foundation completed (and optional 30d counts)
export const getSpiritualGrowthSummary = async (church_id, { period = '30d' } = {}) => {
  const res = await db.query(`
    SELECT
      COUNT(*) FILTER (WHERE date_born_again IS NOT NULL) AS born_again,
      COUNT(*) FILTER (WHERE date_baptized_immersion IS NOT NULL OR baptized_in_christ_embassy IS TRUE) AS baptized,
      COUNT(*) FILTER (WHERE foundation_school_grad_date IS NOT NULL) AS foundation_completed,
      COUNT(*) FILTER (WHERE date_born_again >= now() - interval '30 days') AS born_again_last_30,
      COUNT(*) FILTER (WHERE date_baptized_immersion >= now() - interval '30 days') AS baptized_last_30
    FROM members
    WHERE church_id = $1
  `, [church_id]);

  const r = res.rows[0] || {};
  return {
    counts: {
      born_again: Number(r.born_again ?? 0),
      baptized: Number(r.baptized ?? 0),
      foundation_completed: Number(r.foundation_completed ?? 0)
    },
    last_30: {
      born_again: Number(r.born_again_last_30 ?? 0),
      baptized: Number(r.baptized_last_30 ?? 0)
    }
  };
};