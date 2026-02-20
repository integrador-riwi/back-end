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
        throw new ConflictError('The email address is already registered.');
      }
      if (error.constraint?.includes('document_number')) {
        throw new ConflictError('The document number is already registered.');
      }
    }
    throw new DatabaseError(`Error creating user: ${error.message}`);
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
    throw new NotFoundError('User not found');
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
    throw new DatabaseError(`Error creating profile: ${error.message}`);
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

export const saveRefreshToken = async ({ userId, tokenHash, expiresAt, userAgent = null, ipAddress = null }) => {
  const query = `
    INSERT INTO refresh_tokens (user_id, token_hash, expires_at, user_agent, ip_address)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING id_token, user_id, expires_at, created_at
  `;
  const result = await pool.query(query, [userId, tokenHash, expiresAt, userAgent, ipAddress]);
  return result.rows[0];
};

export const findRefreshToken = async (tokenHash) => {
  const query = `
    SELECT rt.*, u.name, u.email, u.role, u.is_active
    FROM refresh_tokens rt
    JOIN users u ON rt.user_id = u.id_user
    WHERE rt.token_hash = $1 AND rt.revoked_at IS NULL AND rt.expires_at > NOW()
  `;
  const result = await pool.query(query, [tokenHash]);
  return result.rows[0] || null;
};

export const revokeRefreshToken = async (tokenHash, revokedBy = null) => {
  const query = `
    UPDATE refresh_tokens
    SET revoked_at = NOW(), revoked_by = $2
    WHERE token_hash = $1 AND revoked_at IS NULL
    RETURNING id_token
  `;
  const result = await pool.query(query, [tokenHash, revokedBy]);
  return result.rows.length > 0;
};

export const revokeAllUserTokens = async (userId, revokedBy = null) => {
  const query = `
    UPDATE refresh_tokens
    SET revoked_at = NOW(), revoked_by = $2
    WHERE user_id = $1 AND revoked_at IS NULL
  `;
  const result = await pool.query(query, [userId, revokedBy]);
  return result.rowCount;
};

export const cleanExpiredTokens = async () => {
  const query = 'DELETE FROM refresh_tokens WHERE expires_at < NOW() OR revoked_at IS NOT NULL';
  const result = await pool.query(query);
  return result.rowCount;
};

export const findByGithubId = async (githubId) => {
  const query = `
    SELECT id_user, name, email, role, github_id, github_username, github_token, is_active
    FROM users
    WHERE github_id = $1
  `;
  const result = await pool.query(query, [githubId]);
  return result.rows[0] || null;
};

export const getGithubConnection = async (userId) => {
  const query = `
    SELECT github_id, github_username, github_token_expires_at
    FROM users
    WHERE id_user = $1
  `;
  const result = await pool.query(query, [userId]);
  return result.rows[0] || null;
};

export const saveGithubTokens = async (userId, { githubId, githubUsername, accessToken, refreshToken, expiresAt }) => {
  const query = `
    UPDATE users
    SET github_id = $1,
        github_username = $2,
        github_token = $3,
        github_refresh_token = $4,
        github_token_expires_at = $5
    WHERE id_user = $6
    RETURNING id_user, github_id, github_username
  `;

  const result = await pool.query(query, [
    githubId,
    githubUsername,
    accessToken,
    refreshToken,
    expiresAt,
    userId
  ]);

  return result.rows[0] || null;
};

export const disconnectGithub = async (userId) => {
  const query = `
    UPDATE users
    SET github_id = NULL,
        github_username = NULL,
        github_token = NULL,
        github_refresh_token = NULL,
        github_token_expires_at = NULL
    WHERE id_user = $1
    RETURNING id_user
  `;

  const result = await pool.query(query, [userId]);
  return result.rows.length > 0;
};

export const getGithubTokens = async (userId) => {
  const query = `
    SELECT github_id, github_username, github_token, github_refresh_token, github_token_expires_at
    FROM users
    WHERE id_user = $1
  `;
  const result = await pool.query(query, [userId]);
  return result.rows[0] || null;
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
  deactivate,
  saveRefreshToken,
  findRefreshToken,
  revokeRefreshToken,
  revokeAllUserTokens,
  cleanExpiredTokens,
  findByGithubId,
  getGithubConnection,
  saveGithubTokens,
  disconnectGithub,
  getGithubTokens
};
