import pool from "../../db/pool.js";
import {
  NotFoundError,
  ConflictError,
  DatabaseError,
} from "../../middleware/errorHandler.js";

export const findAll = async ({ search = null, page = 1, limit = 10 }) => {
  let whereClauses = [];
  let params = [];
  let paramIndex = 1;

  if (search) {
    whereClauses.push(
      `p.name ILIKE $${paramIndex++} OR t.name ILIKE $${paramIndex++}`,
    );
    params.push(`%${search}%`, `%${search}%`);
  }

  const whereClause =
    whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";

  const offset = (page - 1) * limit;

  const countQuery = `
    SELECT COUNT(*) as total 
    FROM projects p
    JOIN teams t ON p.team_id = t.id_team
    ${whereClause}
  `;
  const countResult = await pool.query(countQuery, params);
  const total = parseInt(countResult.rows[0].total, 10);

  const query = `
    SELECT 
      p.id_project,
      p.name,
      p.description,
      p.team_id,
      p.id_event,
      p.project_final_grade,
      p.grade_calculated_at,
      p.repo_url,
      p.video_url,
      p.presentation_url,
      p.preview_photo_url,
      p.created_at,
      t.name as team_name,
      u.name as leader_name,
      u.email as leader_email,
      (
        SELECT COUNT(*) FROM team_coders tc2 
        WHERE tc2.id_team = t.id_team
      ) as member_count
    FROM projects p
    JOIN teams t ON p.team_id = t.id_team
    LEFT JOIN team_coders tc ON t.id_team = tc.id_team AND tc.team_role = 'LEADER'
    LEFT JOIN users u ON tc.id_user = u.id_user
    ${whereClause}
    ORDER BY p.created_at DESC
    LIMIT $${paramIndex++} OFFSET $${paramIndex++}
  `;

  params.push(limit, offset);
  const result = await pool.query(query, params);

  return {
    projects: result.rows,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

export const findById = async (id) => {
  const query = `
    SELECT 
      p.id_project,
      p.name,
      p.description,
      p.team_id,
      p.id_event,
      p.project_final_grade,
      p.grade_calculated_at,
      p.repo_url,
      p.video_url,
      p.presentation_url,
      p.preview_photo_url,
      p.submitted_at,
      p.created_at,
      t.name as team_name,
      u.id_user as leader_id,
      u.name as leader_name,
      u.email as leader_email
    FROM projects p
    JOIN teams t ON p.team_id = t.id_team
    LEFT JOIN team_coders tc ON t.id_team = tc.id_team AND tc.team_role = 'LEADER'
    LEFT JOIN users u ON tc.id_user = u.id_user
    WHERE p.id_project = $1
  `;

  const result = await pool.query(query, [id]);
  return result.rows[0] || null;
};

export const findByTeamId = async (teamId) => {
  const query = `
    SELECT 
      p.id_project,
      p.name,
      p.description,
      p.team_id,
      p.id_event,
      p.project_final_grade,
      p.grade_calculated_at,
      p.repo_url,
      p.video_url,
      p.presentation_url,
      p.preview_photo_url,
      p.submitted_at,
      p.created_at,
      t.name as team_name
    FROM projects p
    JOIN teams t ON p.team_id = t.id_team
    WHERE p.team_id = $1
  `;

  const result = await pool.query(query, [teamId]);
  return result.rows[0] || null;
};

export const update = async (id, { name, description, repoUrl }) => {
  const query = `
    UPDATE projects
    SET 
      name = COALESCE($1, name),
      description = COALESCE($2, description),
      repo_url = COALESCE($3, repo_url)
    WHERE id_project = $4
    RETURNING id_project, name, description, team_id, repo_url, video_url, presentation_url, preview_photo_url, project_final_grade
  `;

  const result = await pool.query(query, [name, description, repoUrl, id]);
  return result.rows[0] || null;
};

export const updateDeliverables = async (
  id,
  { videoUrl, presentationUrl, previewPhotoUrl },
) => {
  const query = `
    UPDATE projects
    SET 
      video_url = COALESCE($1, video_url),
      presentation_url = COALESCE($2, presentation_url),
      preview_photo_url = COALESCE($3, preview_photo_url)
    WHERE id_project = $4
    RETURNING id_project, name, description, team_id, repo_url, video_url, presentation_url, preview_photo_url, project_final_grade
  `;

  const result = await pool.query(query, [
    videoUrl,
    presentationUrl,
    previewPhotoUrl,
    id,
  ]);
  return result.rows[0] || null;
};

export const create = async (teamId, { name, description }) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const checkExistingQuery = `
      SELECT id_project FROM projects WHERE team_id = $1
    `;
    const existingResult = await client.query(checkExistingQuery, [teamId]);

    if (existingResult.rows.length > 0) {
      await client.query("ROLLBACK");
      throw new ConflictError("El equipo ya tiene un proyecto");
    }

    const query = `
      INSERT INTO projects (name, description, team_id)
      VALUES ($1, $2, $3)
      RETURNING id_project, name, description, team_id, repo_url, video_url, presentation_url, preview_photo_url, project_final_grade
    `;

    const result = await client.query(query, [name, description, teamId]);

    await client.query("COMMIT");

    return result.rows[0];
  } catch (error) {
    await client.query("ROLLBACK");
    if (error instanceof ConflictError) {
      throw error;
    }
    throw new DatabaseError(`Error al crear proyecto: ${error.message}`);
  } finally {
    client.release();
  }
};

export const findByTeamIdWithMembers = async (teamId) => {
  const query = `
    SELECT 
      p.id_project,
      p.name,
      p.description,
      p.team_id,
      p.id_event,
      p.project_final_grade,
      p.grade_calculated_at,
      p.repo_url,
      p.video_url,
      p.presentation_url,
      p.preview_photo_url,
      p.submitted_at,
      p.created_at,
      t.name as team_name,
      tc.team_role as leader_role,
      u.id_user as leader_id,
      u.name as leader_name,
      u.email as leader_email
    FROM projects p
    JOIN teams t ON p.team_id = t.id_team
    LEFT JOIN team_coders tc ON t.id_team = tc.id_team AND tc.team_role = 'LEADER'
    LEFT JOIN users u ON tc.id_user = u.id_user
    WHERE p.team_id = $1
  `;

  const result = await pool.query(query, [teamId]);
  return result.rows[0] || null;
};

export const submitProject = async (id) => {
  const query = `
    UPDATE projects
    SET submitted_at = NOW()
    WHERE id_project = $1
    RETURNING id_project, name, submitted_at
  `;
  const result = await pool.query(query, [id]);
  return result.rows[0] || null;
};

export const isSubmitted = async (id) => {
  const query = `SELECT submitted_at FROM projects WHERE id_project = $1`;
  const result = await pool.query(query, [id]);
  return !!result.rows[0]?.submitted_at;
};

export const isMemberOfTeam = async (projectId, userId) => {
  const query = `
    SELECT tc.id_team, tc.team_role
    FROM projects p
    JOIN team_coders tc ON p.team_id = tc.id_team
    WHERE p.id_project = $1 AND tc.id_user = $2
  `;

  const result = await pool.query(query, [projectId, userId]);
  return result.rows[0] || null;
};

export const isLeaderOfTeamByProjectId = async (projectId, userId) => {
  const query = `
    SELECT tc.id_team
    FROM projects p
    JOIN team_coders tc ON p.team_id = tc.id_team
    WHERE p.id_project = $1 AND tc.id_user = $2 AND tc.team_role = 'LEADER'
  `;

  const result = await pool.query(query, [projectId, userId]);
  return result.rows.length > 0;
};

export default {
  findAll,
  findById,
  findByTeamId,
  findByTeamIdWithMembers,
  create,
  update,
  updateDeliverables,
  submitProject,
  isSubmitted,
  isMemberOfTeam,
  isLeaderOfTeamByProjectId,
};
