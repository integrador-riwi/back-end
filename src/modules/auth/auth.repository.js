import pool from '../../db/pool.js';
import { ConflictError, NotFoundError, DatabaseError } from '../../middleware/errorHandler.js';

export const findByEmail = async (email) => {
  const query = 'SELECT id_user, name, email, role, encrypted_password, document_number, document_type, clan, is_active FROM users WHERE email = $1';
  const result = await pool.query(query, [email.toLowerCase()]);
  return result.rows[0] || null;
};

export const findById = async (id_user) => {
  const query = 'SELECT id_user, name, email, role, encrypted_password, document_number, document_type, clan, is_active FROM users WHERE id_user = $1';
  const result = await pool.query(query, [id_user]);
  return result.rows[0] || null;
};

export const findByDocument = async (documentNumber) => {
  const query = 'SELECT id_user, name, email, role, document_number, document_type, clan FROM users WHERE document_number = $1';
  const result = await pool.query(query, [documentNumber]);
  return result.rows[0] || null;
};

export const create = async ({ name, email, passwordHash, role = 'CODER', documentNumber = null, documentType = null, clan = null }) => {
  const query = `
    INSERT INTO users (name, email, role, encrypted_password, document_number, document_type, clan, is_active)
    VALUES ($1, $2, $3, $4, $5, $6, $7, true)
    RETURNING id_user, name, email, role, document_number, document_type, clan
  `;
  
  try {
    const result = await pool.query(query, [name, email.toLowerCase(), role, passwordHash, documentNumber, documentType, clan]);
    return result.rows[0];
  } catch (error) {
    if (error.code === '23505') {
      if (error.constraint?.includes('email')) {
        throw new ConflictError('El email ya está registrado');
      }
      if (error.constraint?.includes('document_number')) {
        throw new ConflictError('El número de documento ya está registrado');
      }
    }
    throw new DatabaseError(`Error al crear usuario: ${error.message}`);
  }
};

export const updatePassword = async (id_user, passwordHash) => {
  const query = `
    UPDATE users 
    SET encrypted_password = $1, updated_at = NOW()
    WHERE id_user = $2
    RETURNING id_user, email
  `;
  
  const result = await pool.query(query, [passwordHash, id_user]);
  
  if (result.rows.length === 0) {
    throw new NotFoundError('Usuario no encontrado');
  }
  
  return result.rows[0];
};

export const createProfile = async (user_id, { github_url = null, description = null, clan = null }) => {
  const query = `
    INSERT INTO profiles (user_id, github_url, description, clan)
    VALUES ($1, $2, $3, $4)
    RETURNING id_profile, user_id, github_url, description, clan
  `;
  
  try {
    const result = await pool.query(query, [user_id, github_url, description, clan]);
    return result.rows[0];
  } catch (error) {
    if (error.code === '23505') {
      return null;
    }
    throw new DatabaseError(`Error al crear perfil: ${error.message}`);
  }
};

export const getProfile = async (user_id) => {
  const query = `
    SELECT p.*, u.name, u.email, u.role
    FROM profiles p
    JOIN users u ON p.user_id = u.id_user
    WHERE p.user_id = $1
  `;
  
  const result = await pool.query(query, [user_id]);
  return result.rows[0] || null;
};

export const updateProfile = async (user_id, { github_url, description, clan }) => {
  const query = `
    UPDATE profiles
    SET github_url = COALESCE($1, github_url),
        description = COALESCE($2, description),
        clan = COALESCE($3, clan)
    WHERE user_id = $4
    RETURNING *
  `;
  
  const result = await pool.query(query, [github_url, description, clan, user_id]);
  return result.rows[0] || null;
};

export const deactivate = async (id_user) => {
  const query = 'UPDATE users SET is_active = false WHERE id_user = $1 RETURNING id_user';
  const result = await pool.query(query, [id_user]);
  return result.rows.length > 0;
};

export default {
  findByEmail,
  findById,
  findByDocument,
  create,
  updatePassword,
  createProfile,
  getProfile,
  updateProfile,
  deactivate
};
