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
  github_org_token,
  max_team_size,
  target_clans,
  created_by
`;

// ─────────────────────────────────────────────────────────────
// Events CRUD
// ─────────────────────────────────────────────────────────────

export const findAll = async ({
  status,
  search,
  clan,
  page = 1,
  limit = 10,
}) => {
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

  // Filter by clan: show events that target this clan OR target all (NULL)
  if (clan) {
    whereClauses.push(
      `(target_clans IS NULL OR $${paramIndex++} = ANY(target_clans))`,
    );
    params.push(clan);
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
    `SELECT ${EVENT_SELECT} FROM events WHERE event_status = 'IN_PROGRESS' ORDER BY event_start_date ASC`,
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
  githubOrgToken = null,
  maxTeamSize = 5,
  targetClans = null,
  createdBy = null,
}) => {
  const result = await pool.query(
    `INSERT INTO events
       (title, event_name, description, event_start_date, final_delivery_date,
        event_status, status, event_type, cohort, route, github_org, github_org_token, max_team_size,
        target_clans, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
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
      githubOrgToken,
      maxTeamSize,
      targetClans,
      createdBy,
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
    targetClans, // undefined = don't touch, null = all clans, array = specific clans
  },
) => {
  // target_clans needs special handling: COALESCE won't let us set it back to NULL
  const hasTargetClans = targetClans !== undefined;
  const targetClansExpr = hasTargetClans ? `$12` : `target_clans`;

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
       target_clans       = ${targetClansExpr},
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
      ...(hasTargetClans ? [targetClans] : []),
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
          `INSERT INTO grades (id_rubric, score, name, description) VALUES ($1, $2, $3, $4)
           RETURNING id_grade, id_rubric, score, name, description`,
          [rubricRow.id_rubric, g.score, g.name || null, g.description || null],
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
    `SELECT id_grade, id_rubric, score, name, description
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
  { name, description, weight, active, grades },
) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    
    const result = await client.query(
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

    if (grades && Array.isArray(grades)) {
      for (const g of grades) {
        if (g.id_grade) {
          await client.query(
            `UPDATE grades SET score = $1, name = $2, description = $3 WHERE id_grade = $4 AND id_rubric = $5`,
            [g.score, g.name || null, g.description || null, g.id_grade, rubricId]
          );
        } else {
          const existing = await client.query(
            `SELECT id_grade FROM grades WHERE id_rubric = $1 AND score = $2`,
            [rubricId, g.score]
          );
          if (existing.rows.length > 0) {
            await client.query(
              `UPDATE grades SET name = $1, description = $2 WHERE id_grade = $3`,
              [g.name || null, g.description || null, existing.rows[0].id_grade]
            );
          } else {
            await client.query(
              `INSERT INTO grades (id_rubric, score, name, description) VALUES ($1, $2, $3, $4)`,
              [rubricId, g.score, g.name || null, g.description || null]
            );
          }
        }
      }
    }

    await client.query("COMMIT");
    return result.rows[0] || null;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
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

export const getEventMetrics = async (eventId) => {
  const result = await pool.query(
    `SELECT
      (SELECT COUNT(*)            FROM teams      WHERE id_event = $1)  AS total_teams,
      (SELECT COUNT(*)            FROM projects   WHERE id_event = $1)  AS total_projects,
      (SELECT COUNT(DISTINCT tc.id_user)
       FROM team_coders tc
       JOIN teams t ON t.id_team = tc.id_team
       WHERE t.id_event = $1)                                           AS total_coders,
      (SELECT COUNT(*)
       FROM public_votes pv
       JOIN qr_votes qr ON qr.id = pv.qr_vote_id
       WHERE qr.id_event = $1)                                          AS total_votes,
      (SELECT COUNT(DISTINCT e.project_id)
       FROM evaluations e
       JOIN projects p ON p.id_project = e.project_id
       WHERE p.id_event = $1)                                           AS evaluated_projects,
      (SELECT COUNT(DISTINCT r.area)
       FROM rubrics r
       WHERE r.id_event = $1 AND r.active = true)                      AS active_areas`,
    [eventId],
  );
  return result.rows[0];
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
  getEventMetrics,
};
