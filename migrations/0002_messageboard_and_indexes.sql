-- 0002_messageboard_and_indexes.sql
CREATE TABLE IF NOT EXISTS messageboards (
  id SERIAL PRIMARY KEY,
  church_id INTEGER NOT NULL,
  name VARCHAR(150) NOT NULL,
  slug VARCHAR(150),
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_messageboards_church_slug ON messageboards (church_id, slug);

CREATE TABLE IF NOT EXISTS messages (
  id SERIAL PRIMARY KEY,
  church_id INTEGER NOT NULL,
  board_id INTEGER REFERENCES messageboards(id) ON DELETE CASCADE,
  author_user_id INTEGER NULL,
  author_member_id INTEGER NULL,
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_messages_board_church_created ON messages (board_id, church_id, created_at DESC);
