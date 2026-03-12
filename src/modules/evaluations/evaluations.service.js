import EvaluationsRepository from "./evaluations.repository.js";
import pool from "../../db/pool.js";
import {
  NotFoundError,
  ValidationError,
  ForbiddenError,
} from "../../middleware/errorHandler.js";

const TL_ROLES = ["TL_DEVELOPMENT", "TL_SOFT_SKILLS", "TL_ENGLISH", "ADMIN"];

// Map TL role → evaluation area (ADMIN has no restriction → null)
const ROLE_AREA_MAP = {
  TL_DEVELOPMENT: "DEVELOPMENT",
  TL_SOFT_SKILLS: "SOFT_SKILLS",
  TL_ENGLISH: "ENGLISH",
};

// ── Get rubrics + grade options for an event ──────────────────────────────────

export const getRubricsForEvent = async (eventId) => {
  const rubrics = await EvaluationsRepository.getRubricsByEvent(eventId);
  if (!rubrics.length) return [];

  const rubricIds = rubrics.map((r) => r.id_rubric);
  const allGrades = await Promise.all(
    rubricIds.map((id) => EvaluationsRepository.getGradesByRubric(id)),
  );

  return rubrics.map((rubric, i) => ({
    ...rubric,
    grades: allGrades[i],
  }));
};

// ── Submit evaluations for all members of a project ──────────────────────────

export const submitEvaluations = async ({
  projectId,
  evaluatorUserId,
  evaluatorRole,
  evaluations, // [{ evaluatedUserId, gradeId, feedback }]
}) => {
  if (!TL_ROLES.includes(evaluatorRole)) {
    throw new ForbiddenError("Only Team Leads can submit evaluations.");
  }

  // ADMINs can evaluate any area; TLs are restricted to their own area
  const allowedArea = ROLE_AREA_MAP[evaluatorRole] ?? null;

  // Resolve eventId from project — if missing, fall back to the team's event
  const projectRes = await pool.query(
    `SELECT p.id_event, p.team_id, t.id_event AS team_event_id
     FROM projects p
     JOIN teams t ON t.id_team = p.team_id
     WHERE p.id_project = $1`,
    [projectId],
  );
  const project = projectRes.rows[0];
  if (!project) throw new NotFoundError("Project not found.");

  // Auto-heal: if project.id_event is null but the team has one, link them now
  let eventId = project.id_event;
  if (!eventId && project.team_event_id) {
    await pool.query(
      "UPDATE projects SET id_event = $1 WHERE id_project = $2",
      [project.team_event_id, projectId],
    );
    eventId = project.team_event_id;
  }

  if (!eventId)
    throw new ValidationError("This project is not linked to an event.");

  if (!Array.isArray(evaluations) || evaluations.length === 0) {
    throw new ValidationError("You must provide at least one evaluation.");
  }

  // Block re-submission: if this TL already has ANY evaluation for this project, reject
  const existingCheck = await pool.query(
    `SELECT id_evaluation FROM evaluations
     WHERE project_id = $1 AND evaluator_user_id = $2
     LIMIT 1`,
    [projectId, evaluatorUserId],
  );
  if (existingCheck.rows.length > 0) {
    throw new ForbiddenError(
      "You have already submitted evaluations for this project.",
    );
  }

  // Wrap all inserts in a transaction — if any row fails the whole submit rolls back,
  // leaving no partial/orphan rows that would permanently block the TL.
  const client = await pool.connect();
  const results = [];

  try {
    await client.query("BEGIN");

    for (const ev of evaluations) {
      const { evaluatedUserId, gradeId, feedback } = ev;

      if (!evaluatedUserId || !gradeId) {
        throw new ValidationError(
          "Each evaluation requires evaluatedUserId and gradeId.",
        );
      }

      // Get area from rubric linked to this grade
      const gradeRes = await client.query(
        `SELECT g.id_grade, g.id_rubric, r.area
         FROM grades g
         JOIN rubrics r ON g.id_rubric = r.id_rubric
         WHERE g.id_grade = $1`,
        [gradeId],
      );
      const gradeRow = gradeRes.rows[0];
      if (!gradeRow) throw new NotFoundError(`Grade ${gradeId} not found.`);

      const area = gradeRow.area;

      // Enforce area restriction: TLs can only evaluate their assigned area
      if (allowedArea && area !== allowedArea) {
        throw new ForbiddenError(
          `As ${evaluatorRole} you can only evaluate the ${allowedArea} area, not ${area}.`,
        );
      }

      const saved = await client.query(
        `INSERT INTO evaluations
           (project_id, event_id, evaluator_user_id, evaluated_user_id, area, feedback, id_grade)
         VALUES ($1, $2, $3, $4, $5::evaluation_area, $6, $7)
         ON CONFLICT (project_id, evaluator_user_id, evaluated_user_id, area)
         DO UPDATE SET
           feedback = EXCLUDED.feedback,
           id_grade = EXCLUDED.id_grade,
           event_id = EXCLUDED.event_id
         RETURNING id_evaluation, project_id, event_id, evaluator_user_id, evaluated_user_id, area, feedback, id_grade, created_at`,
        [
          projectId,
          eventId,
          evaluatorUserId,
          evaluatedUserId,
          area,
          feedback ?? null,
          gradeId,
        ],
      );

      results.push(saved.rows[0]);
    }

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }

  // ── Auto-calculate if all required areas now have at least one evaluator ──
  // Required areas = distinct areas with active rubrics for this event
  const requiredAreasRes = await pool.query(
    `SELECT DISTINCT area FROM rubrics WHERE id_event = $1 AND active = true`,
    [eventId],
  );
  const requiredAreas = requiredAreasRes.rows.map((r) => r.area);

  if (requiredAreas.length > 0) {
    // Covered areas = distinct areas that have at least 1 evaluation for this project
    const coveredAreasRes = await pool.query(
      `SELECT DISTINCT e.area
       FROM evaluations e
       JOIN rubrics r ON r.area = e.area AND r.id_event = $2 AND r.active = true
       WHERE e.project_id = $1`,
      [projectId, eventId],
    );
    const coveredAreas = coveredAreasRes.rows.map((r) => r.area);

    const allCovered = requiredAreas.every((a) => coveredAreas.includes(a));

    if (allCovered) {
      // Fire-and-forget — don't block the response if calculation fails
      calculateProjectGrades(projectId, evaluatorRole).catch((err) => {
        console.error(`[auto-calculate] project ${projectId}:`, err.message);
      });
    }
  }

  return results;
};

// ── Get evaluations already submitted by this TL for this project ─────────────

export const getMyEvaluationsForProject = async (
  projectId,
  evaluatorUserId,
) => {
  return EvaluationsRepository.getEvaluationsByProject(
    projectId,
    evaluatorUserId,
  );
};

export const calculateProjectGrades = async (projectId, requestingRole) => {
  if (!TL_ROLES.includes(requestingRole)) {
    throw new ForbiddenError("Only Team Leads or Admins can calculate grades.");
  }

  // Verify project exists and auto-heal missing id_event
  const projectRes = await pool.query(
    `SELECT p.id_project, p.id_event, t.id_event AS team_event_id
     FROM projects p
     JOIN teams t ON t.id_team = p.team_id
     WHERE p.id_project = $1`,
    [projectId],
  );
  if (!projectRes.rows[0]) throw new NotFoundError("Project not found.");

  const projectRow = projectRes.rows[0];
  if (!projectRow.id_event && projectRow.team_event_id) {
    await pool.query(
      "UPDATE projects SET id_event = $1 WHERE id_project = $2",
      [projectRow.team_event_id, projectId],
    );
  }

  // Pull every raw evaluation row for this project
  const rawRows =
    await EvaluationsRepository.getRawEvaluationsForProject(projectId);

  if (!rawRows.length) {
    throw new ValidationError(
      "No evaluations found for this project. Nothing to calculate.",
    );
  }

  // Pull all rubric definitions for the project's event (for weight reference)
  const rubrics = await EvaluationsRepository.getRubricsForProject(projectId);
  // rubricWeightMap: id_rubric → weight
  const rubricWeightMap = {};
  for (const r of rubrics) {
    rubricWeightMap[r.id_rubric] = parseFloat(r.weight);
  }

  const studentMap = {};

  for (const row of rawRows) {
    const uid = row.evaluated_user_id;
    const area = row.area;
    const rubricId = row.id_rubric;
    const score = parseFloat(row.score);

    if (!studentMap[uid]) {
      studentMap[uid] = { name: row.evaluated_name, areas: {} };
    }
    if (!studentMap[uid].areas[area]) {
      studentMap[uid].areas[area] = {};
    }
    if (!studentMap[uid].areas[area][rubricId]) {
      studentMap[uid].areas[area][rubricId] = [];
    }
    studentMap[uid].areas[area][rubricId].push(score);
  }

  // ── Compute scores and persist
  const savedResults = [];

  for (const [userIdStr, student] of Object.entries(studentMap)) {
    const userId = parseInt(userIdStr);
    const areaFinalScores = {}; // area → finalAreaScore

    for (const [area, rubricsInArea] of Object.entries(student.areas)) {
      // For each rubric: average scores across all TLs who graded it
      let weightedSum = 0;
      let totalWeight = 0;

      for (const [rubricIdStr, scores] of Object.entries(rubricsInArea)) {
        const rubricId = parseInt(rubricIdStr);
        const weight = rubricWeightMap[rubricId] ?? 1;
        const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;

        weightedSum += avgScore * weight;
        totalWeight += weight;
      }

      const areaScore = totalWeight > 0 ? weightedSum / totalWeight : 0;
      areaFinalScores[area] = parseFloat(areaScore.toFixed(2));

      // Persist area result
      await EvaluationsRepository.upsertAreaResult({
        projectId,
        userId,
        area,
        finalScore: areaFinalScores[area],
      });
    }

    // Student final = weighted average across areas
    // DEVELOPMENT 55%, ENGLISH 25%, SOFT_SKILLS 20%
    const AREA_WEIGHTS = {
      DEVELOPMENT: 0.55,
      ENGLISH: 0.25,
      SOFT_SKILLS: 0.2,
    };

    let weightedAreaSum = 0;
    let totalAreaWeight = 0;

    for (const [area, score] of Object.entries(areaFinalScores)) {
      const areaWeight = AREA_WEIGHTS[area] ?? 0;
      weightedAreaSum += score * areaWeight;
      totalAreaWeight += areaWeight;
    }

    const studentFinal =
      totalAreaWeight > 0
        ? parseFloat((weightedAreaSum / totalAreaWeight).toFixed(2))
        : 0;

    // Persist project result
    const saved = await EvaluationsRepository.upsertProjectResult({
      projectId,
      userId,
      finalScore: studentFinal,
    });

    savedResults.push({
      userId,
      userName: student.name,
      areaScores: areaFinalScores,
      finalScore: studentFinal,
      savedAt: saved.calculated_at,
    });
  }

  return savedResults;
};

// ── Read persisted results for a project ─────────────────────────────────────

export const getProjectResults = async (projectId) => {
  // Verify project exists
  const projectRes = await pool.query(
    "SELECT id_project FROM projects WHERE id_project = $1",
    [projectId],
  );
  if (!projectRes.rows[0]) throw new NotFoundError("Project not found.");

  const rows = await EvaluationsRepository.getProjectResults(projectId);

  if (!rows.length) {
    throw new NotFoundError(
      "No calculated results found for this project. Run /calculate first.",
    );
  }

  return rows;
};

// ── Read persisted results for an entire event ───────────────────────────────

export const getEventResults = async (eventId) => {
  // Verify event exists
  const eventRes = await pool.query(
    "SELECT id_event FROM events WHERE id_event = $1",
    [eventId],
  );
  if (!eventRes.rows[0]) throw new NotFoundError("Event not found.");

  const rows = await EvaluationsRepository.getEventResults(eventId);

  if (!rows.length) {
    throw new NotFoundError(
      "No calculated results found for this event. Run /calculate on each project first.",
    );
  }

  return rows;
};

export default {
  getRubricsForEvent,
  submitEvaluations,
  getMyEvaluationsForProject,
  calculateProjectGrades,
  getProjectResults,
  getEventResults,
};
