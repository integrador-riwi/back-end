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

  // Resolve eventId from project in one query
  const projectRes = await pool.query(
    "SELECT id_event FROM projects WHERE id_project = $1",
    [projectId],
  );
  const project = projectRes.rows[0];
  if (!project) throw new NotFoundError("Project not found.");
  if (!project.id_event)
    throw new ValidationError("This project is not linked to an event.");

  const eventId = project.id_event;

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

    // Upsert: update if exists, insert if not
    const existing = await EvaluationsRepository.getExistingEvaluation({
      projectId,
      evaluatorUserId,
      evaluatedUserId,
      area,
    });

    let saved;
    if (existing) {
      saved = await EvaluationsRepository.updateEvaluation(
        existing.id_evaluation,
        { feedback, gradeId },
      );
    } else {
      saved = await EvaluationsRepository.createEvaluation({
        projectId,
        eventId,
        evaluatorUserId,
        evaluatedUserId,
        area,
        feedback,
        gradeId,
      });
    }

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

export default {
  getRubricsForEvent,
  submitEvaluations,
  getMyEvaluationsForProject,
};
