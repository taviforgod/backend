-- member_statuses seed (idempotent)
CREATE TABLE IF NOT EXISTS member_statuses (
  id SERIAL PRIMARY KEY,
  name VARCHAR(64) UNIQUE NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO member_statuses (name, description)
SELECT * FROM (VALUES
  ('active', 'Member actively participating'),
  ('inactive', 'Inactive — not attending for a while'),
  ('exited', 'Member exited the church'),
  ('transferred', 'Transferred to another church'),
  ('moved', 'Relocated'),
  ('resigned', 'Resigned from ministry/membership'),
  ('deceased', 'Deceased')
) AS v(name, description)
WHERE NOT EXISTS (
  SELECT 1 FROM member_statuses ms WHERE ms.name = v.name
);
