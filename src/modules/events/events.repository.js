import pool from '../../db/pool.js';

export const findAll = async ({ status, search, page = 1, limit = 10 }) => {
  let whereClauses = [];
  let params = [];
  let paramIndex = 1;

  if (status) {
    whereClauses.push(`event_status = $${paramIndex++}`);
    params.push(status);
  }

  if (search) {
    whereClauses.push(`(title ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`);
    params.push(`%${search}%`);
    paramIndex++;
  }

  const whereClause = whereClauses.length > 0 
    ? `WHERE ${whereClauses.join(' AND ')}` 
    : '';

  const offset = (page - 1) * limit;

  const countQuery = `SELECT COUNT(*) as total FROM events ${whereClause}`;
  const countResult = await pool.query(countQuery, params);
  const total = parseInt(countResult.rows[0].total, 10);

  const query = `
    SELECT 
      id_event as id,
      title,
      event_name,
      description,
      event_start_date as date,
      final_delivery_date as end_date,
      event_status as status,
      event_type,
      cohort,
      route
    FROM events
    ${whereClause}
    ORDER BY event_start_date ASC
    LIMIT $${paramIndex++} OFFSET $${paramIndex++}
  `;

  params.push(limit, offset);
  const result = await pool.query(query, params);

  return {
    events: result.rows,
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
      id_event as id,
      title,
      event_name,
      description,
      event_start_date as date,
      final_delivery_date as end_date,
      event_status as status,
      event_type,
      cohort,
      route
    FROM events
    WHERE id_event = $1
  `;

  const result = await pool.query(query, [id]);
  return result.rows[0] || null;
};

export const findUpcoming = async (limit = 10) => {
  const query = `
    SELECT 
      id_event as id,
      title,
      event_name,
      description,
      event_start_date as date,
      final_delivery_date as end_date,
      event_status as status,
      event_type,
      cohort,
      route
    FROM events
    WHERE event_status = 'UPCOMING' OR event_start_date >= NOW()
    ORDER BY event_start_date ASC
    LIMIT $1
  `;

  const result = await pool.query(query, [limit]);
  return result.rows;
};

export const findPast = async (limit = 10) => {
  const query = `
    SELECT 
      id_event as id,
      title,
      event_name,
      description,
      event_start_date as date,
      final_delivery_date as end_date,
      event_status as status,
      event_type,
      cohort,
      route
    FROM events
    WHERE event_status = 'COMPLETED' OR event_start_date < NOW()
    ORDER BY event_start_date DESC
    LIMIT $1
  `;

  const result = await pool.query(query, [limit]);
  return result.rows;
};

export const create = async ({ 
  title, 
  description, 
  eventDate, 
  endDate,
  status = 'UPCOMING',
  eventType = 'CAPSTONE',
  cohort,
  route
}) => {
  const query = `
    INSERT INTO events (title, event_name, description, event_start_date, final_delivery_date, event_status, status, event_type, cohort, route)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    RETURNING id_event as id, title, event_name, description, event_start_date as date, event_status as status, event_type, cohort, route
  `;

  const result = await pool.query(query, [
    title,
    title,
    description,
    eventDate,
    endDate,
    status,
    status,
    eventType,
    cohort,
    route
  ]);

  return result.rows[0];
};

export const update = async (id, { 
  title, 
  description, 
  eventDate, 
  endDate,
  status,
  eventType,
  cohort,
  route
}) => {
  const query = `
    UPDATE events
    SET 
      title = COALESCE($1, title),
      event_name = COALESCE($1, event_name),
      description = COALESCE($2, description),
      event_start_date = COALESCE($3, event_start_date),
      final_delivery_date = COALESCE($4, final_delivery_date),
      event_status = COALESCE($5, event_status),
      status = COALESCE($5, status),
      event_type = COALESCE($6, event_type),
      cohort = COALESCE($7, cohort),
      route = COALESCE($8, route),
      updated_at = NOW()
    WHERE id_event = $9
    RETURNING id_event as id, title, event_name, description, event_start_date as date, event_status as status, event_type, cohort, route
  `;

  const result = await pool.query(query, [
    title,
    description,
    eventDate,
    endDate,
    status,
    eventType,
    cohort,
    route,
    id
  ]);

  return result.rows[0] || null;
};

export const remove = async (id) => {
  const query = `
    DELETE FROM events
    WHERE id_event = $1
    RETURNING id_event as id
  `;

  const result = await pool.query(query, [id]);
  return result.rows[0] || null;
};

export const count = async ({ status }) => {
  let whereClause = '';
  let params = [];

  if (status) {
    whereClause = 'WHERE event_status = $1';
    params.push(status);
  }

  const query = `SELECT COUNT(*) as total FROM events ${whereClause}`;
  const result = await pool.query(query, params);

  return parseInt(result.rows[0].total, 10);
};

export default {
  findAll,
  findById,
  findUpcoming,
  findPast,
  create,
  update,
  remove,
  count
};
