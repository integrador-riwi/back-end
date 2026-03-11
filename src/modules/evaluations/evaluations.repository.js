import pool from "../../db/pool.js";

// ── Rubrics ───────────────────────────────────────────────────────────────────

export const getRubricsByEvent = async (eventId) => {
  const query = `
    SELECT
      id_rubric,
      id_event,
      area,
      name,
      description,
      weight,
      active
    FROM rubrics
    WHERE id_event = $1 AND active = true
    ORDER BY area, name
  `;
  const result = await pool.query(query, [eventId]);
  return result.rows;
};

export const getGradesByRubric = async (rubricId) => {
  const query = `
    SELECT id_grade, id_rubric, score
    FROM grades
    WHERE id_rubric = $1
    ORDER BY score DESC
  `;
  const result = await pool.query(query, [rubricId]);
  return result.rows;
};

// ── Evaluations ───────────────────────────────────────────────────────────────

export const getExistingEvaluation = async ({
  projectId,
  evaluatorUserId,
  evaluatedUserId,
  area,
}) => {
  const query = `
    SELECT id_evaluation
    FROM evaluations
    WHERE project_id = $1
      AND evaluator_user_id = $2
      AND evaluated_user_id = $3
      AND area = $4::evaluation_area
  `;
  const result = await pool.query(query, [
    projectId,
    evaluatorUserId,
    evaluatedUserId,
    area,
  ]);
  return result.rows[0] || null;
};

export const upsertEvaluation = async ({
  projectId,
  eventId,
  evaluatorUserId,
  evaluatedUserId,
  area,
  feedback,
  gradeId,
}) => {
  // Single upsert — works regardless of whether a unique constraint exists
  // on (project_id, evaluator_user_id, evaluated_user_id, area) or not.
  // If the constraint exists it updates; if not it tries to find & update manually.
  const query = `
    INSERT INTO evaluations
      (project_id, event_id, evaluator_user_id, evaluated_user_id, area, feedback, id_grade)
    VALUES ($1, $2, $3, $4, $5::evaluation_area, $6, $7)
    ON CONFLICT (project_id, evaluator_user_id, evaluated_user_id, area)
    DO UPDATE SET
      feedback  = EXCLUDED.feedback,
      id_grade  = EXCLUDED.id_grade,
      event_id  = EXCLUDED.event_id
    RETURNING id_evaluation, project_id, event_id, evaluator_user_id, evaluated_user_id, area, feedback, id_grade, created_at
  `;
  const result = await pool.query(query, [
    projectId,
    eventId,
    evaluatorUserId,
    evaluatedUserId,
    area,
    feedback ?? null,
    gradeId,
  ]);
  return result.rows[0];
};

export const getEvaluationsByProject = async (projectId, evaluatorUserId) => {
  const query = `
    SELECT
      e.id_evaluation,
      e.project_id,
      e.event_id,
      e.evaluator_user_id,
      e.evaluated_user_id,
      e.area,
      e.feedback,
      e.created_at,
      g.score,
      g.id_rubric,
      u.name AS evaluated_name,
      r.name AS rubric_name,
      r.weight
    FROM evaluations e
    JOIN grades g ON e.id_grade = g.id_grade
    JOIN rubrics r ON g.id_rubric = r.id_rubric
    JOIN users u ON e.evaluated_user_id = u.id_user
    WHERE e.project_id = $1
      AND e.evaluator_user_id = $2
    ORDER BY e.evaluated_user_id, e.area
  `;
  const result = await pool.query(query, [projectId, evaluatorUserId]);
  return result.rows;
};

export const getRawEvaluationsForProject = async (projectId) => {
  const query = `
    SELECT
      e.evaluated_user_id,
      e.evaluator_user_id,
      e.area,
      g.id_rubric,
      r.weight,
      g.score,
      u.name AS evaluated_name
    FROM evaluations e
    JOIN grades g ON e.id_grade = g.id_grade
    JOIN rubrics r ON g.id_rubric = r.id_rubric
    JOIN users u ON e.evaluated_user_id = u.id_user
    WHERE e.project_id = $1
    ORDER BY e.evaluated_user_id, e.area, g.id_rubric
  `;
  const result = await pool.query(query, [projectId]);
  return result.rows;
};

/**
 * Returns all active rubrics for the event linked to this project.
 */
export const getRubricsForProject = async (projectId) => {
  const query = `
    SELECT r.id_rubric, r.area, r.weight, r.name
    FROM rubrics r
    JOIN projects p ON p.id_event = r.id_event
    WHERE p.id_project = $1 AND r.active = true
    ORDER BY r.area, r.id_rubric
  `;
  const result = await pool.query(query, [projectId]);
  return result.rows;
};

// ── individual_area_results upsert ───────────────────────────────────────────

export const upsertAreaResult = async ({
  projectId,
  userId,
  area,
  finalScore,
}) => {
  const query = `
    INSERT INTO individual_area_results (project_id, user_id, area, final_score, calculated_at)
    VALUES ($1, $2, $3::evaluation_area, $4, now())
    ON CONFLICT (project_id, user_id, area)
    DO UPDATE SET final_score = EXCLUDED.final_score, calculated_at = now()
    RETURNING *
  `;
  const result = await pool.query(query, [projectId, userId, area, finalScore]);
  return result.rows[0];
};

// ── individual_project_results upsert ────────────────────────────────────────

export const upsertProjectResult = async ({
  projectId,
  userId,
  finalScore,
}) => {
  const query = `
    INSERT INTO individual_project_results (project_id, user_id, final_score, calculated_at)
    VALUES ($1, $2, $3, now())
    ON CONFLICT (project_id, user_id)
    DO UPDATE SET final_score = EXCLUDED.final_score, calculated_at = now()
    RETURNING *
  `;
  const result = await pool.query(query, [projectId, userId, finalScore]);
  return result.rows[0];
};

// ── Read results ─────────────────────────────────────────────────────────────

export const getProjectResults = async (projectId) => {
  const query = `
    SELECT
      ipr.user_id,
      u.name             AS user_name,
      u.email,
      u.github_avatar_url,
      ipr.final_score,
      ipr.calculated_at,
      json_agg(
        json_build_object(
          'area',        iar.area,
          'final_score', iar.final_score
        ) ORDER BY iar.area
      ) AS area_scores
    FROM individual_project_results ipr
    JOIN users u ON u.id_user = ipr.user_id
    LEFT JOIN individual_area_results iar
      ON iar.project_id = ipr.project_id AND iar.user_id = ipr.user_id
    WHERE ipr.project_id = $1
    GROUP BY
      ipr.user_id, u.name, u.email, u.github_avatar_url,
      ipr.final_score, ipr.calculated_at
    ORDER BY ipr.final_score DESC
  `;
  const result = await pool.query(query, [projectId]);
  return result.rows;
};

export const getEventResults = async (eventId) => {
  const query = `
    SELECT
      ipr.project_id,
      p.name             AS project_name,
      t.name             AS team_name,
      ipr.user_id,
      u.name             AS user_name,
      u.email,
      u.github_avatar_url,
      ipr.final_score,
      ipr.calculated_at,
      json_agg(
        json_build_object(
          'area',        iar.area,
          'final_score', iar.final_score
        ) ORDER BY iar.area
      ) AS area_scores
    FROM individual_project_results ipr
    JOIN users u ON u.id_user = ipr.user_id
    JOIN projects p ON p.id_project = ipr.project_id
    JOIN teams t ON t.id_team = p.team_id
    LEFT JOIN individual_area_results iar
      ON iar.project_id = ipr.project_id AND iar.user_id = ipr.user_id
    WHERE p.id_event = $1
    GROUP BY
      ipr.project_id, p.name, t.name,
      ipr.user_id, u.name, u.email, u.github_avatar_url,
      ipr.final_score, ipr.calculated_at
    ORDER BY ipr.final_score DESC
  `;
  const result = await pool.query(query, [eventId]);
  return result.rows;
};

export default {
  getRubricsByEvent,
  getGradesByRubric,
  getExistingEvaluation,
  upsertEvaluation,
  getEvaluationsByProject,
  getRawEvaluationsForProject,
  getRubricsForProject,
  upsertAreaResult,
  upsertProjectResult,
  getProjectResults,
  getEventResults,
};
