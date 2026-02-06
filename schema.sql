-- == RBAC/User Foundation for Cell Ministry Management Platform ==

-- DROP TABLES (safe for dev)
DROP TABLE IF EXISTS otps, password_resets, role_permissions, user_roles, users, roles, permissions CASCADE;

-- ROLES
CREATE TABLE roles (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) UNIQUE NOT NULL
);

-- PERMISSIONS
CREATE TABLE permissions (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) UNIQUE NOT NULL
);

-- USERS
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100),
  email VARCHAR(100) UNIQUE NOT NULL,
  phone VARCHAR(20) UNIQUE,
  password_hash TEXT NOT NULL,
  avatar_url TEXT,
  phone_verified BOOLEAN DEFAULT FALSE,
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- USER ROLES (Many-to-Many)
CREATE TABLE user_roles (
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  role_id INT REFERENCES roles(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, role_id)
);

-- ROLE PERMISSIONS (Many-to-Many)
CREATE TABLE role_permissions (
  role_id INT REFERENCES roles(id) ON DELETE CASCADE,
  permission_id INT REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

-- PASSWORD RESET TOKENS
CREATE TABLE password_resets (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(255) NOT NULL,
  expires_at TIMESTAMP NOT NULL
);

-- OTP TABLE (for phone verification, 2FA, etc.)
CREATE TABLE otps (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  code VARCHAR(10) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  used BOOLEAN DEFAULT FALSE
);

-- Notification Groups
CREATE TABLE notification_groups (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) UNIQUE
);

CREATE TABLE notification_group_members (
  group_id INTEGER REFERENCES notification_groups(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (group_id, user_id)
);

-- Notification Preferences
CREATE TABLE notification_preferences (
  user_id INTEGER PRIMARY KEY REFERENCES users(id),
  email_enabled BOOLEAN DEFAULT TRUE,
  sms_enabled BOOLEAN DEFAULT FALSE,
  push_enabled BOOLEAN DEFAULT TRUE,
  in_app_enabled BOOLEAN DEFAULT TRUE,
  browser_enabled BOOLEAN DEFAULT TRUE
);

-- Notifications
CREATE TABLE notifications (
  id SERIAL PRIMARY KEY,
  sender_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  recipient_type VARCHAR(20) NOT NULL, -- 'user', 'group', 'all'
  recipient_id INTEGER,                -- user_id/group_id; NULL for 'all'
  title VARCHAR(255),
  body TEXT,
  channel VARCHAR(20) NOT NULL,        -- 'in-app', 'websocket', 'sms', 'email'
  status VARCHAR(20) DEFAULT 'pending',-- 'pending', 'sent', 'delivered', 'failed'
  scheduled_at TIMESTAMP,
  sent_at TIMESTAMP,
  meta JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Messaging (Conversations & Messages)
CREATE TABLE conversations (
  id SERIAL PRIMARY KEY,
  subject VARCHAR(255),
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE conversation_participants (
  conversation_id INTEGER REFERENCES conversations(id),
  user_id INTEGER REFERENCES users(id),
  PRIMARY KEY (conversation_id, user_id)
);

CREATE TABLE messages (
  id SERIAL PRIMARY KEY,
  conversation_id INTEGER REFERENCES conversations(id),
  sender_id INTEGER REFERENCES users(id),
  body TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  parent_id INTEGER REFERENCES messages(id)
);


-- TITLES
CREATE TABLE titles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(10) UNIQUE NOT NULL
);

INSERT INTO titles (name) VALUES 
('Mr'), ('Mrs'), ('Ms'), ('Dr'), ('Prof'), ('Rev');

-- GENDERS
CREATE TABLE genders (
    id SERIAL PRIMARY KEY,
    name VARCHAR(20) UNIQUE NOT NULL
);

INSERT INTO genders (name) VALUES 
('Male'), ('Female'), ('Other'), ('Prefer not to say');

-- MARITAL STATUSES
CREATE TABLE marital_statuses (
    id SERIAL PRIMARY KEY,
    name VARCHAR(20) UNIQUE NOT NULL
);

INSERT INTO marital_statuses (name) VALUES 
('Single'), ('Married'), ('Divorced'), ('Widowed'), ('Separated');

-- MEMBER TYPES
CREATE TABLE member_types (
    id SERIAL PRIMARY KEY,
    name VARCHAR(30) UNIQUE NOT NULL
);

INSERT INTO member_types (name) VALUES 
('member'), ('leader'), ('pastor'), ('deacon'), ('elder'), ('visitor');

-- MEMBER STATUSES
CREATE TABLE member_statuses (
    id SERIAL PRIMARY KEY,
    name VARCHAR(30) UNIQUE NOT NULL
);

INSERT INTO member_statuses (name) VALUES 
('active'), ('inactive'), ('suspended'), ('transferred'), ('deceased');

-- NATIONALITIES
CREATE TABLE nationalities (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL
);

INSERT INTO nationalities (name) VALUES 
('Nigerian'), ('Ghanaian'), ('South African'), ('Kenyan'), ('Ugandan'), ('Zimbabwean');


CREATE TABLE members (
    id SERIAL PRIMARY KEY,
    profile_photo VARCHAR(255),
    title_id INTEGER REFERENCES titles(id),
    first_name VARCHAR(100) NOT NULL,
    surname VARCHAR(100) NOT NULL,
    date_of_birth DATE,
    contact_primary VARCHAR(20),
    contact_secondary VARCHAR(20),
    email VARCHAR(255) UNIQUE NOT NULL,
    nationality_id INTEGER REFERENCES nationalities(id),
    gender_id INTEGER REFERENCES genders(id),
    marital_status_id INTEGER REFERENCES marital_statuses(id),
    num_children INTEGER,
    physical_address TEXT,
    profession VARCHAR(100),
    occupation VARCHAR(100),
    work_address TEXT,
    date_joined_church DATE,
    date_born_again DATE,
    date_baptized_immersion DATE,
    baptized_in_christ_embassy BOOLEAN DEFAULT FALSE,
    date_received_holy_ghost DATE,
    foundation_school_grad_date DATE,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    member_status_id INTEGER REFERENCES member_statuses(id),
    member_type_id INTEGER REFERENCES member_types(id),
    rfid_tag VARCHAR(50)
);
ALTER TABLE members
ADD COLUMN user_id INTEGER REFERENCES users(id);




-- == SEED DATA ==

-- ROLES
INSERT INTO roles (name) VALUES 
  ('admin'),
  ('pastor'),
  ('zonal_leader'),
  ('cell_leader'),
  ('member');

-- PERMISSIONS
INSERT INTO permissions (name) VALUES
  ('view_roles'),
  ('create_role'),
  ('update_role'),
  ('delete_role'),
  ('view_permissions'),
  ('create_permission'),
  ('update_permission'),
  ('delete_permission'),
  ('view_users'),
  ('assign_role'),
  ('remove_role'),
  ('view_profile'),
  ('view_user_roles');

-- USERS (password_hash is a bcrypt hash of "password" for dev)
-- You may want to change these emails/phones for your dev environment.
INSERT INTO users (name, email, phone, password_hash, phone_verified, status)
VALUES
  ('Super Admin', 'admin@church.com', '0771000001', '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36v3z3pTg9xI4eG2S7JpJ5u', TRUE, 'active'),
  ('Pastor John', 'pastor@church.com', '0771000002', '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36v3z3pTg9xI4eG2S7JpJ5u', TRUE, 'active'),
  ('Zonal Leader Kate', 'zone@church.com', '0771000003', '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36v3z3pTg9xI4eG2S7JpJ5u', FALSE, 'active'),
  ('Cell Leader Sam', 'cell@church.com', '0771000004', '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36v3z3pTg9xI4eG2S7JpJ5u', FALSE, 'active'),
  ('Member Joy', 'member@church.com', '0771000005', '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36v3z3pTg9xI4eG2S7JpJ5u', FALSE, 'active');

-- USER_ROLES
INSERT INTO user_roles (user_id, role_id) VALUES
  (1, 1), -- Super Admin is admin
  (2, 2), -- Pastor John is pastor
  (3, 3), -- Zonal Leader Kate is zonal_leader
  (4, 4), -- Cell Leader Sam is cell_leader
  (5, 5); -- Member Joy is member

-- ROLE_PERMISSIONS (expand as needed for RBAC granularity)
-- ROLE_PERMISSIONS (expand as needed for RBAC granularity)
INSERT INTO role_permissions (role_id, permission_id) VALUES
  -- Admin full access
  (1, 1),  -- view_roles
  (1, 2),  -- create_role
  (1, 3),  -- update_role
  (1, 4),  -- delete_role
  (1, 5),  -- view_permissions
  (1, 6),  -- create_permission
  (1, 7),  -- update_permission
  (1, 8),  -- delete_permission
  (1, 9),  -- view_users
  (1, 10), -- assign_role
  (1, 11), -- remove_role
  (1, 12), -- view_profile
  (1, 13), -- view_user_roles

  -- Pastor (example: can view roles, users, and assign roles)
  (2, 1),  -- view_roles
  (2, 5),  -- view_permissions
  (2, 9),  -- view_users
  (2, 10), -- assign_role
  (2, 12), -- view_profile
  (2, 13), -- view_user_roles

  -- Zonal Leader (example: can view roles and users)
  (3, 1),  -- view_roles
  (3, 5),  -- view_permissions
  (3, 9),  -- view_users
  (3, 12), -- view_profile
  (3, 13), -- view_user_roles

  -- Cell Leader (example: can view users and profile)
  (4, 9),  -- view_users
  (4, 12), -- view_profile
  (4, 13), -- view_user_roles

  -- Member (example: can only view their profile)
  (5, 12); -- view_profile

  CREATE TABLE churches (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  address VARCHAR(255),
  city VARCHAR(100),
  state VARCHAR(100),
  country VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE members
  ADD COLUMN church_id INTEGER REFERENCES churches(id);

  INSERT INTO permissions (name) VALUES
  -- Lookups
  ('view_lookups'),

  -- Titles
  ('view_titles'),
  ('create_title'),
  ('update_title'),
  ('delete_title'),

  -- Genders
  ('view_genders'),
  ('create_gender'),
  ('update_gender'),
  ('delete_gender'),

  -- Marital Statuses
  ('view_marital_statuses'),
  ('create_marital_status'),
  ('update_marital_status'),
  ('delete_marital_status'),

  -- Member Types
  ('view_member_types'),
  ('create_member_type'),
  ('update_member_type'),
  ('delete_member_type'),

  -- Member Statuses
  ('view_member_statuses'),
  ('create_member_status'),
  ('update_member_status'),
  ('delete_member_status'),

  -- Nationalities
  ('view_nationalities'),
  ('create_nationality'),
  ('update_nationality'),
  ('delete_nationality'),

  -- Churches
  ('view_churches'),
  ('create_church'),
  ('update_church'),
  ('delete_church');


  CREATE TABLE milestone_templates (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  required_for_promotion BOOLEAN DEFAULT FALSE,
  description TEXT
);

CREATE TABLE milestone_records (
  id SERIAL PRIMARY KEY,
  member_id INT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  template_id INT REFERENCES milestone_templates(id) ON DELETE SET NULL,
  milestone_name VARCHAR(100),
  completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

cREATE TABLE IF NOT EXISTS inactive_member_exits (
  id SERIAL PRIMARY KEY,
  church_id INT NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  member_id INT NOT NULL REFERENCES members(id) ON DELETE CASCADE,

  exit_type VARCHAR(100),
  exit_reason TEXT,
  exit_date DATE DEFAULT CURRENT_DATE,
  processed_by INT REFERENCES users(id),
  is_suggestion BOOLEAN DEFAULT FALSE,
  suggestion_trigger VARCHAR(255),
  notes TEXT,
  reinstated_at TIMESTAMPTZ,
  soft_deleted BOOLEAN DEFAULT FALSE,

  created_by INT REFERENCES users(id),
  updated_by INT REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inactive_exits_church ON inactive_member_exits(church_id);
CREATE INDEX IF NOT EXISTS idx_inactive_exits_member ON inactive_member_exits(member_id);
CREATE INDEX IF NOT EXISTS idx_inactive_exits_exit_date ON inactive_member_exits(exit_date DESC);
