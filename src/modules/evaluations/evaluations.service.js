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

  const results = [];

  for (const ev of evaluations) {
    const { evaluatedUserId, gradeId, feedback } = ev;

    if (!evaluatedUserId || !gradeId) {
      throw new ValidationError(
        "Each evaluation requires evaluatedUserId and gradeId.",
      );
    }

    // Get area from rubric linked to this grade
    const gradeRes = await pool.query(
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

    // Upsert: one query handles both insert and update
    const saved = await EvaluationsRepository.upsertEvaluation({
      projectId,
      eventId,
      evaluatorUserId,
      evaluatedUserId,
      area,
      feedback,
      gradeId,
    });

    results.push(saved);
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

    // Student final = average of all area scores (only evaluated areas count)
    const areaScoreValues = Object.values(areaFinalScores);
    const studentFinal =
      areaScoreValues.length > 0
        ? parseFloat(
            (
              areaScoreValues.reduce((a, b) => a + b, 0) /
              areaScoreValues.length
            ).toFixed(2),
          )
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
