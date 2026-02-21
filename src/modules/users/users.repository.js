import pool from '../../db/pool.js';
import { ConflictError, NotFoundError, DatabaseError } from '../../middleware/errorHandler.js';

export const findAll = async ({ role, clan, isActive, search, page = 1, limit = 10 }) => {
  let whereClauses = [];
  let params = [];
  let paramIndex = 1;

  if (role) {
    whereClauses.push(`u.role = $${paramIndex++}`);
    params.push(role);
  }

  if (clan) {
    whereClauses.push(`u.clan ILIKE $${paramIndex++}`);
    params.push(`%${clan}%`);
  }

  if (isActive !== undefined) {
    whereClauses.push(`u.is_active = $${paramIndex++}`);
    params.push(isActive);
  }

  if (search) {
    whereClauses.push(`(u.name ILIKE $${paramIndex} OR u.email ILIKE $${paramIndex})`);
    params.push(`%${search}%`);
    paramIndex++;
  }

  const whereClause = whereClauses.length > 0 
    ? `WHERE ${whereClauses.join(' AND ')}` 
    : '';

  const offset = (page - 1) * limit;

  const countQuery = `SELECT COUNT(*) as total FROM users u ${whereClause}`;
  const countResult = await pool.query(countQuery, params);
  const total = parseInt(countResult.rows[0].total, 10);

  const query = `
    SELECT 
      u.id_user,
      u.name,
      u.email,
      u.role,
      u.document_number,
      u.document_type,
      u.clan,
      u.is_active,
      p.github_url,
      p.description as profile_description
    FROM users u
    LEFT JOIN profiles p ON u.id_user = p.user_id
    ${whereClause}
    ORDER BY u.id_user DESC
    LIMIT $${paramIndex++} OFFSET $${paramIndex++}
  `;

  params.push(limit, offset);
  const result = await pool.query(query, params);

  return {
    users: result.rows,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  };
};

export const findById = async (id) => {
  const query = `
    SELECT 
      u.id_user,
      u.name,
      u.email,
      u.role,
      u.document_number,
      u.document_type,
      u.clan,
      u.is_active,
      p.github_url,
      p.description as profile_description
    FROM users u
    LEFT JOIN profiles p ON u.id_user = p.user_id
    WHERE u.id_user = $1
  `;

  const result = await pool.query(query, [id]);
  return result.rows[0] || null;
};

export const findByEmail = async (email, excludeId = null) => {
  let query = 'SELECT id_user FROM users WHERE email = $1';
  const params = [email.toLowerCase()];

  if (excludeId) {
    query += ' AND id_user != $2';
    params.push(excludeId);
  }

  const result = await pool.query(query, params);
  return result.rows[0] || null;
};

export const findByDocument = async (documentNumber, excludeId = null) => {
  let query = 'SELECT id_user FROM users WHERE document_number = $1';
  const params = [documentNumber];

  if (excludeId) {
    query += ' AND id_user != $2';
    params.push(excludeId);
  }

  const result = await pool.query(query, params);
  return result.rows[0] || null;
};

export const create = async ({ 
  name, 
  email, 
  passwordHash, 
  role = 'CODER', 
  documentNumber, 
  documentType = 'CC', 
  clan 
}) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const userQuery = `
      INSERT INTO users (name, email, role, encrypted_password, document_number, document_type, clan, is_active)
      VALUES ($1, $2, $3, $4, $5, $6, $7, true)
      RETURNING id_user, name, email, role, document_number, document_type, clan, is_active
    `;

    const userResult = await client.query(userQuery, [
      name,
      email.toLowerCase(),
      role,
      passwordHash,
      documentNumber,
      documentType,
      clan
    ]);

    const user = userResult.rows[0];

    const profileQuery = `
      INSERT INTO profiles (user_id, clan)
      VALUES ($1, $2)
      RETURNING id_profile, github_url, description
    `;

    const profileResult = await client.query(profileQuery, [user.id_user, clan]);

    await client.query('COMMIT');

    return {
      ...user,
      github_url: profileResult.rows[0]?.github_url || null,
      profile_description: profileResult.rows[0]?.description || null
    };
  } catch (error) {
    await client.query('ROLLBACK');
    
    if (error.code === '23505') {
      if (error.constraint?.includes('email')) {
        throw new ConflictError('El email ya está registrado');
      }
      if (error.constraint?.includes('document_number')) {
        throw new ConflictError('El número de documento ya está registrado');
      }
    }
    throw new DatabaseError(`Error al crear usuario: ${error.message}`);
  } finally {
    client.release();
  }
};

export const update = async (id, { name, email, documentNumber, documentType, clan }) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const userQuery = `
      UPDATE users
      SET 
        name = COALESCE($1, name),
        email = COALESCE($2, email),
        document_number = COALESCE($3, document_number),
        document_type = COALESCE($4, document_type),
        clan = COALESCE($5, clan)
      WHERE id_user = $6
      RETURNING id_user, name, email, role, document_number, document_type, clan, is_active
    `;

    const userResult = await client.query(userQuery, [
      name,
      email ? email.toLowerCase() : null,
      documentNumber,
      documentType,
      clan,
      id
    ]);

    if (userResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return null;
    }

    const user = userResult.rows[0];

    const profileQuery = `
      UPDATE profiles
      SET clan = COALESCE($1, clan)
      WHERE user_id = $2
      RETURNING github_url, description as profile_description
    `;

    const profileResult = await client.query(profileQuery, [clan, id]);

    await client.query('COMMIT');

    return {
      ...user,
      github_url: profileResult.rows[0]?.github_url || null,
      profile_description: profileResult.rows[0]?.profile_description || null
    };
  } catch (error) {
    await client.query('ROLLBACK');
    
    if (error.code === '23505') {
      if (error.constraint?.includes('email')) {
        throw new ConflictError('El email ya está registrado por otro usuario');
      }
      if (error.constraint?.includes('document_number')) {
        throw new ConflictError('El número de documento ya está registrado por otro usuario');
      }
    }
    throw new DatabaseError(`Error al actualizar usuario: ${error.message}`);
  } finally {
    client.release();
  }
};

export const updatePassword = async (id, passwordHash) => {
  const query = `
    UPDATE users
    SET encrypted_password = $1
    WHERE id_user = $2
    RETURNING id_user, email
  `;

  const result = await pool.query(query, [passwordHash, id]);
  return result.rows[0] || null;
};

export const toggleStatus = async (id, isActive) => {
  const query = `
    UPDATE users
    SET is_active = $1
    WHERE id_user = $2
    RETURNING id_user, name, email, role, is_active
  `;

  const result = await pool.query(query, [isActive, id]);
  return result.rows[0] || null;
};

export const findAvailableCoders = async ({ search = null, page = 1, limit = 20 }) => {
  let whereClauses = ['u.role = $1', 'u.is_active = true'];
  let params = ['CODER'];
  let paramIndex = 2;

  const notInTeamSubquery = `
    NOT EXISTS (
      SELECT 1 FROM team_coders tc 
      WHERE tc.id_user = u.id_user
    )
  `;
  whereClauses.push(notInTeamSubquery);

  if (search) {
    whereClauses.push(`(u.name ILIKE $${paramIndex} OR u.email ILIKE $${paramIndex})`);
    params.push(`%${search}%`);
    paramIndex++;
  }

  const offset = (page - 1) * limit;

  const countQuery = `
    SELECT COUNT(*) as total 
    FROM users u 
    WHERE ${whereClauses.join(' AND ')}
  `;
  const countResult = await pool.query(countQuery, params);
  const total = parseInt(countResult.rows[0].total, 10);

  const query = `
    SELECT 
      u.id_user,
      u.name,
      u.email,
      u.clan,
      p.github_url,
      p.description as profile_description
    FROM users u
    LEFT JOIN profiles p ON u.id_user = p.user_id
    WHERE ${whereClauses.join(' AND ')}
    ORDER BY u.name ASC
    LIMIT $${paramIndex++} OFFSET $${paramIndex++}
  `;

  params.push(limit, offset);
  const result = await pool.query(query, params);

  return {
    coders: result.rows,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  };
};

export const count = async ({ role, clan, isActive }) => {
  let whereClauses = [];
  let params = [];
  let paramIndex = 1;

  if (role) {
    whereClauses.push(`role = $${paramIndex++}`);
    params.push(role);
  }

  if (clan) {
    whereClauses.push(`clan ILIKE $${paramIndex++}`);
    params.push(`%${clan}%`);
  }

  if (isActive !== undefined) {
    whereClauses.push(`is_active = $${paramIndex++}`);
    params.push(isActive);
  }

  const whereClause = whereClauses.length > 0 
    ? `WHERE ${whereClauses.join(' AND ')}` 
    : '';

  const query = `SELECT COUNT(*) as total FROM users ${whereClause}`;
  const result = await pool.query(query, params);

  return parseInt(result.rows[0].total, 10);
};

export const getStats = async () => {
  const query = `
    SELECT 
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE is_active = true) as active,
      COUNT(*) FILTER (WHERE is_active = false) as inactive,
      COUNT(*) FILTER (WHERE role = 'ADMIN') as admins,
      COUNT(*) FILTER (WHERE role = 'CODER') as coders,
      COUNT(*) FILTER (WHERE role = 'TL_DEVELOPMENT') as tl_dev,
      COUNT(*) FILTER (WHERE role = 'TL_SOFT_SKILLS') as tl_soft,
      COUNT(*) FILTER (WHERE role = 'TL_ENGLISH') as tl_english,
      COUNT(*) FILTER (WHERE role = 'STAFF') as staff
    FROM users
  `;

  const result = await pool.query(query);
  return result.rows[0];
};

export default {
  findAll,
  findById,
  findByEmail,
  findByDocument,
  create,
  update,
  updatePassword,
  toggleStatus,
  findAvailableCoders,
  count,
  getStats
};
