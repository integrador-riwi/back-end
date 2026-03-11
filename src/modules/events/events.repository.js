import pool from "../../db/pool.js";

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

const EVENT_SELECT = `
  id_event AS id,
  title,
  event_name,
  description,
  event_start_date AS date,
  final_delivery_date AS end_date,
  event_status AS status,
  event_type,
  cohort,
  route,
  github_org,
  max_team_size
`;

// ─────────────────────────────────────────────────────────────
// Events CRUD
// ─────────────────────────────────────────────────────────────

export const findAll = async ({ status, search, page = 1, limit = 10 }) => {
  const whereClauses = [];
  const params = [];
  let paramIndex = 1;

  if (status) {
    whereClauses.push(`event_status = $${paramIndex++}`);
    params.push(status);
  }

  if (search) {
    whereClauses.push(
      `(title ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`,
    );
    params.push(`%${search}%`);
    paramIndex++;
  }

  const whereClause =
    whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";
  const offset = (page - 1) * limit;

  const countResult = await pool.query(
    `SELECT COUNT(*) AS total FROM events ${whereClause}`,
    params,
  );
  const total = parseInt(countResult.rows[0].total, 10);

  const result = await pool.query(
    `SELECT ${EVENT_SELECT}
     FROM events
     ${whereClause}
     ORDER BY event_start_date ASC
     LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
    [...params, limit, offset],
  );

  return {
    events: result.rows,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

export const findById = async (id) => {
  const result = await pool.query(
    `SELECT ${EVENT_SELECT} FROM events WHERE id_event = $1`,
    [id],
  );
  return result.rows[0] || null;
};

export const findActive = async () => {
  const result = await pool.query(
    `SELECT ${EVENT_SELECT} FROM events WHERE event_status = 'ACTIVE' ORDER BY event_start_date ASC`,
  );
  return result.rows;
};

export const findUpcoming = async (limit = 10) => {
  const result = await pool.query(
    `SELECT ${EVENT_SELECT}
     FROM events
     WHERE event_status = 'UPCOMING' OR event_start_date >= NOW()
     ORDER BY event_start_date ASC
     LIMIT $1`,
    [limit],
  );
  return result.rows;
};

export const findPast = async (limit = 10) => {
  const result = await pool.query(
    `SELECT ${EVENT_SELECT}
     FROM events
     WHERE event_status = 'COMPLETED' OR event_start_date < NOW()
     ORDER BY event_start_date DESC
     LIMIT $1`,
    [limit],
  );
  return result.rows;
};

export const create = async ({
  title,
  description,
  eventDate,
  endDate,
  status = "UPCOMING",
  eventType = "CAPSTONE",
  cohort,
  route,
  githubOrg = null,
  maxTeamSize = 5,
}) => {
  const result = await pool.query(
    `INSERT INTO events
       (title, event_name, description, event_start_date, final_delivery_date,
        event_status, status, event_type, cohort, route, github_org, max_team_size)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
     RETURNING ${EVENT_SELECT}`,
    [
      title,
      title,
      description,
      eventDate,
      endDate,
      status,
      status,
      eventType,
      cohort,
      route,
      githubOrg,
      maxTeamSize,
    ],
  );
  return result.rows[0];
};

export const update = async (
  id,
  {
    title,
    description,
    eventDate,
    endDate,
    status,
    eventType,
    cohort,
    route,
    githubOrg = null,
    maxTeamSize = null,
  },
) => {
  const result = await pool.query(
    `UPDATE events
     SET
       title              = COALESCE($1,  title),
       event_name         = COALESCE($1,  event_name),
       description        = COALESCE($2,  description),
       event_start_date   = COALESCE($3,  event_start_date),
       final_delivery_date= COALESCE($4,  final_delivery_date),
       event_status       = COALESCE($5,  event_status),
       status             = COALESCE($5,  status),
       event_type         = COALESCE($6,  event_type),
       cohort             = COALESCE($7,  cohort),
       route              = COALESCE($8,  route),
       github_org         = COALESCE($9,  github_org),
       max_team_size      = COALESCE($10, max_team_size),
       updated_at         = NOW()
     WHERE id_event = $11
     RETURNING ${EVENT_SELECT}`,
    [
      title,
      description,
      eventDate,
      endDate,
      status,
      eventType,
      cohort,
      route,
      githubOrg,
      maxTeamSize,
      id,
    ],
  );
  return result.rows[0] || null;
};

export const remove = async (id) => {
  const result = await pool.query(
    `DELETE FROM events WHERE id_event = $1 RETURNING id_event AS id`,
    [id],
  );
  return result.rows[0] || null;
};

export const count = async ({ status }) => {
  const whereClause = status ? "WHERE event_status = $1" : "";
  const params = status ? [status] : [];
  const result = await pool.query(
    `SELECT COUNT(*) AS total FROM events ${whereClause}`,
    params,
  );
  return parseInt(result.rows[0].total, 10);
};

export const createRubric = async (
  client,
  { eventId, area, name, description, weight },
) => {
  const result = await client.query(
    `INSERT INTO rubrics (id_event, area, name, description, weight, active)
     VALUES ($1, $2::evaluation_area, $3, $4, $5, true)
     RETURNING id_rubric, id_event, area, name, description, weight, active`,
    [eventId, area, name, description ?? null, weight],
  );
  return result.rows[0];
};


export const createRubricsWithGrades = async (eventId, rubrics) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const saved = [];

    for (const rubric of rubrics) {
      const { area, name, description, weight, grades = [] } = rubric;

      // Insert rubric
      const rubricRow = await createRubric(client, {
        eventId,
        area,
        name,
        description,
        weight,
      });

      // Insert grade options for this rubric
      const savedGrades = [];
      for (const g of grades) {
        const gRes = await client.query(
          `INSERT INTO grades (id_rubric, score) VALUES ($1, $2)
           RETURNING id_grade, id_rubric, score`,
          [rubricRow.id_rubric, g.score],
        );
        savedGrades.push(gRes.rows[0]);
      }

      saved.push({ ...rubricRow, grades: savedGrades });
    }

    await client.query("COMMIT");
    return saved;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
};


export const getRubricsForEvent = async (eventId) => {
  const rubricRes = await pool.query(
    `SELECT id_rubric, id_event, area, name, description, weight, active
     FROM rubrics
     WHERE id_event = $1
     ORDER BY area, name`,
    [eventId],
  );
  const rubrics = rubricRes.rows;
  if (!rubrics.length) return [];

  const gradeRes = await pool.query(
    `SELECT id_grade, id_rubric, score
     FROM grades
     WHERE id_rubric = ANY($1)
     ORDER BY id_rubric, score DESC`,
    [rubrics.map((r) => r.id_rubric)],
  );

  const gradesByRubric = {};
  for (const g of gradeRes.rows) {
    if (!gradesByRubric[g.id_rubric]) gradesByRubric[g.id_rubric] = [];
    gradesByRubric[g.id_rubric].push(g);
  }

  return rubrics.map((r) => ({
    ...r,
    grades: gradesByRubric[r.id_rubric] ?? [],
  }));
};

export const updateRubric = async (
  rubricId,
  { name, description, weight, active },
) => {
  const result = await pool.query(
    `UPDATE rubrics
     SET
       name        = COALESCE($1, name),
       description = COALESCE($2, description),
       weight      = COALESCE($3, weight),
       active      = COALESCE($4, active)
     WHERE id_rubric = $5
     RETURNING id_rubric, id_event, area, name, description, weight, active`,
    [
      name ?? null,
      description ?? null,
      weight ?? null,
      active ?? null,
      rubricId,
    ],
  );
  return result.rows[0] || null;
};

/**
 * Soft-delete a rubric (sets active = false).
 */
export const deactivateRubric = async (rubricId) => {
  const result = await pool.query(
    `UPDATE rubrics SET active = false WHERE id_rubric = $1
     RETURNING id_rubric`,
    [rubricId],
  );
  return result.rows[0] || null;
};

export default {
  findAll,
  findById,
  findActive,
  findUpcoming,
  findPast,
  create,
  update,
  remove,
  count,
  createRubricsWithGrades,
  getRubricsForEvent,
  updateRubric,
  deactivateRubric,
};
