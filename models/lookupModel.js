import db from '../config/db.js';

// Titles CRUD
export async function getTitles() {
  const { rows } = await db.query('SELECT id, name FROM titles ORDER BY id');
  return rows;
}

export async function addTitle(name) {
  const { rows } = await db.query('INSERT INTO titles (name) VALUES ($1) RETURNING *', [name]);
  return rows[0];
}

export async function updateTitle(id, name) {
  const { rows } = await db.query('UPDATE titles SET name = $1 WHERE id = $2 RETURNING *', [name, id]);
  return rows[0];
}

export async function deleteTitle(id) {
  await db.query('DELETE FROM titles WHERE id = $1', [id]);
  return { success: true };
}

// Genders CRUD
export async function getGenders() {
  const { rows } = await db.query('SELECT id, name FROM genders ORDER BY id');
  return rows;
}

export async function addGender(name) {
  const { rows } = await db.query('INSERT INTO genders (name) VALUES ($1) RETURNING *', [name]);
  return rows[0];
}

export async function updateGender(id, name) {
  const { rows } = await db.query('UPDATE genders SET name = $1 WHERE id = $2 RETURNING *', [name, id]);
  return rows[0];
}

export async function deleteGender(id) {
  await db.query('DELETE FROM genders WHERE id = $1', [id]);
  return { success: true };
}

// Marital Statuses CRUD
export async function getMaritalStatuses() {
  const { rows } = await db.query('SELECT id, name FROM marital_statuses ORDER BY id');
  return rows;
}

export async function addMaritalStatus(name) {
  const { rows } = await db.query('INSERT INTO marital_statuses (name) VALUES ($1) RETURNING *', [name]);
  return rows[0];
}

export async function updateMaritalStatus(id, name) {
  const { rows } = await db.query('UPDATE marital_statuses SET name = $1 WHERE id = $2 RETURNING *', [name, id]);
  return rows[0];
}

export async function deleteMaritalStatus(id) {
  await db.query('DELETE FROM marital_statuses WHERE id = $1', [id]);
  return { success: true };
}

// Member Types CRUD
export async function getMemberTypes() {
  const { rows } = await db.query('SELECT id, name FROM member_types ORDER BY id');
  return rows;
}

export async function addMemberType(name) {
  const { rows } = await db.query('INSERT INTO member_types (name) VALUES ($1) RETURNING *', [name]);
  return rows[0];
}

export async function updateMemberType(id, name) {
  const { rows } = await db.query('UPDATE member_types SET name = $1 WHERE id = $2 RETURNING *', [name, id]);
  return rows[0];
}

export async function deleteMemberType(id) {
  await db.query('DELETE FROM member_types WHERE id = $1', [id]);
  return { success: true };
}

// Member Statuses CRUD
export async function getMemberStatuses() {
  const { rows } = await db.query('SELECT id, name FROM member_statuses ORDER BY id');
  return rows;
}

export async function addMemberStatus(name) {
  const { rows } = await db.query('INSERT INTO member_statuses (name) VALUES ($1) RETURNING *', [name]);
  return rows[0];
}

export async function updateMemberStatus(id, name) {
  const { rows } = await db.query('UPDATE member_statuses SET name = $1 WHERE id = $2 RETURNING *', [name, id]);
  return rows[0];
}

export async function deleteMemberStatus(id) {
  await db.query('DELETE FROM member_statuses WHERE id = $1', [id]);
  return { success: true };
}

// Nationalities CRUD
export async function getNationalities() {
  const { rows } = await db.query('SELECT id, name FROM nationalities ORDER BY id');
  return rows;
}

export async function addNationality(name) {
  const { rows } = await db.query('INSERT INTO nationalities (name) VALUES ($1) RETURNING *', [name]);
  return rows[0];
}

export async function updateNationality(id, name) {
  const { rows } = await db.query('UPDATE nationalities SET name = $1 WHERE id = $2 RETURNING *', [name, id]);
  return rows[0];
}

export async function deleteNationality(id) {
  await db.query('DELETE FROM nationalities WHERE id = $1', [id]);
  return { success: true };
}

// Churches CRUD
export async function getChurches() {
  const { rows } = await db.query('SELECT id, name FROM churches ORDER BY id');
  return rows;
}

export async function addChurch(name) {
  const { rows } = await db.query('INSERT INTO churches (name) VALUES ($1) RETURNING *', [name]);
  return rows[0];
}

export async function updateChurch(id, name) {
  const { rows } = await db.query('UPDATE churches SET name = $1 WHERE id = $2 RETURNING *', [name, id]);
  return rows[0];
}

export async function deleteChurch(id) {
  await db.query('DELETE FROM churches WHERE id = $1', [id]);
  return { success: true };
}