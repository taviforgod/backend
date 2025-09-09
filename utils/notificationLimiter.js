import db from '../config/db.js';

const DEFAULT_WINDOW = 60; // seconds window
const DEFAULT_LIMIT_PER_USER = 30;
const DEFAULT_LIMIT_PER_CHURCH = 300;

export async function enforceRateLimit({ church_id, user_id = null, windowSeconds = DEFAULT_WINDOW }) {
  if (!church_id) {
    const e = new Error('church_id required for rate limiting');
    e.code = 'MISSING_CHURCH';
    throw e;
  }

  const churchRes = await db.query(
    `SELECT count(*) AS cnt FROM in_app_notifications
     WHERE church_id = $1 AND created_at >= (now() - ($2::int || ' seconds')::interval)`,
    [church_id, windowSeconds]
  );
  const churchCount = Number(churchRes.rows[0]?.cnt || 0);
  if (churchCount >= DEFAULT_LIMIT_PER_CHURCH) {
    const e = new Error('Church rate limit exceeded');
    e.code = 'RATE_LIMIT_CHURCH';
    e.limit = DEFAULT_LIMIT_PER_CHURCH;
    e.count = churchCount;
    throw e;
  }

  if (user_id) {
    const userRes = await db.query(
      `SELECT count(*) AS cnt FROM in_app_notifications
       WHERE (user_id = $1 OR member_id = $1) AND created_at >= (now() - ($2::int || ' seconds')::interval)`,
      [user_id, windowSeconds]
    );
    const userCount = Number(userRes.rows[0]?.cnt || 0);
    if (userCount >= DEFAULT_LIMIT_PER_USER) {
      const e = new Error('User rate limit exceeded');
      e.code = 'RATE_LIMIT_USER';
      e.limit = DEFAULT_LIMIT_PER_USER;
      e.count = userCount;
      throw e;
    }
  }

  return true;
}
