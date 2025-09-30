import * as model from '../models/messageboardModel.js';

export const createBoard = async (req, res) => {
  try {
    const church_id = req.user?.church_id;
    const { name, slug, description } = req.body;
    if (!church_id || !name) return res.status(400).json({ message: 'church_id and name required' });
    const board = await model.createBoard({ church_id, name, slug, description });
    res.status(201).json(board);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

export const listBoards = async (req, res) => {
  const church_id = req.user?.church_id;
  if (!church_id) return res.status(400).json({ message: 'church_id required' });
  const boards = await model.listBoards({ church_id });
  res.json(boards);
};

export const postMessage = async (req, res) => {
  try {
    const church_id = req.user?.church_id;
    if (!church_id) return res.status(400).json({ message: 'church_id required' });
    const { board_id, content, metadata } = req.body;
    if (!board_id || !content) return res.status(400).json({ message: 'board_id and content required' });

    const author_user_id = req.user?.user_id || req.user?.id || null;
    const author_member_id = req.user?.member_id || null;

    const message = await model.createMessage({ church_id, board_id, author_user_id, author_member_id, content, metadata: metadata || {} });
    res.status(201).json({ ok: true, message });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

export const listMessages = async (req, res) => {
  try {
    const church_id = req.user?.church_id;
    const board_id = Number(req.params.board_id);
    const page = Math.max(0, Number(req.query.page || 0));
    const limit = Math.min(200, Number(req.query.limit || 50));
    if (!church_id || !board_id) return res.status(400).json({ message: 'church_id and board_id required' });
    const rows = await model.listMessages({ church_id, board_id, limit, offset: page * limit });
    res.json({ total: rows.length, page, limit, messages: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

export const getMessage = async (req, res) => {
  const church_id = req.user?.church_id;
  const id = Number(req.params.id);
  if (!church_id || !id) return res.status(400).json({ message: 'church_id and id required' });
  const m = await model.getMessage({ church_id, id });
  if (!m) return res.status(404).json({ message: 'not found' });
  res.json(m);
};

export const deleteMessage = async (req, res) => {
  const church_id = req.user?.church_id;
  const id = Number(req.params.id);
  const deleted = await model.deleteMessage({ church_id, id });
  if (!deleted) return res.status(404).json({ message: 'not found' });
  res.json({ ok: true, deleted });
};
