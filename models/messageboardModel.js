import db from '../config/db.js';
import { createNotification } from './notificationsModel.js';

export async function createBoard({ church_id, name, slug = null, description = null }) {
  const res = await db.query(
    `INSERT INTO messageboards (church_id, name, slug, description) VALUES ($1,$2,$3,$4) RETURNING *`,
    [church_id, name, slug, description]
  );
  return res.rows[0];
}

export async function listBoards({ church_id }) {
  const res = await db.query(`SELECT * FROM messageboards WHERE church_id = $1 ORDER BY created_at DESC`, [church_id]);
  return res.rows;
}

export async function createMessage({ church_id, board_id, author_user_id = null, author_member_id = null, content, metadata = {} }) {
  const res = await db.query(
    `INSERT INTO messages (church_id, board_id, author_user_id, author_member_id, content, metadata)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [church_id, board_id, author_user_id, author_member_id, content, metadata]
  );
  const message = res.rows[0];

  const title = `New message in board ${board_id}`;
  const snippet = content.length > 200 ? content.slice(0,200) + '...' : content;
  const notifMeta = { ...metadata, message_id: message.id, board_id };
  await createNotification({
    church_id,
    user_id: null,
    member_id: null,
    title,
    message: snippet,
    channel: 'in_app',
    metadata: notifMeta
  });

  return message;
}

export async function listMessages({ church_id, board_id, limit = 50, offset = 0 }) {
  const res = await db.query(
    `SELECT m.*, u.name as author_name FROM messages m
     LEFT JOIN users u ON u.id = m.author_user_id
     WHERE m.church_id = $1 AND m.board_id = $2
     ORDER BY m.created_at DESC
     LIMIT $3 OFFSET $4`,
    [church_id, board_id, limit, offset]
  );
  return res.rows;
}

export async function getMessage({ church_id, id }) {
  const res = await db.query(`SELECT * FROM messages WHERE church_id = $1 AND id = $2`, [church_id, id]);
  return res.rows[0];
}

export async function deleteMessage({ church_id, id }) {
  const res = await db.query(`DELETE FROM messages WHERE church_id = $1 AND id = $2 RETURNING *`, [church_id, id]);
  return res.rows[0];
}
