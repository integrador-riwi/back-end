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

export const createEvaluation = async ({
  projectId,
  eventId,
  evaluatorUserId,
  evaluatedUserId,
  area,
  feedback,
  gradeId,
}) => {
  const query = `
    INSERT INTO evaluations
      (project_id, event_id, evaluator_user_id, evaluated_user_id, area, feedback, id_grade)
    VALUES ($1, $2, $3, $4, $5::evaluation_area, $6, $7)
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

export const updateEvaluation = async (id, { feedback, gradeId }) => {
  const query = `
    UPDATE evaluations
    SET feedback = $1, id_grade = $2
    WHERE id_evaluation = $3
    RETURNING id_evaluation, project_id, event_id, evaluator_user_id, evaluated_user_id, area, feedback, id_grade, created_at
  `;
  const result = await pool.query(query, [feedback ?? null, gradeId, id]);
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

export default {
  getRubricsByEvent,
  getGradesByRubric,
  getExistingEvaluation,
  createEvaluation,
  updateEvaluation,
  getEvaluationsByProject,
};
