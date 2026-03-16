import pool from "../../db/pool.js";
import * as RankingRepository from "./ranking.repository.js";
import { calculateProjectGrades } from "../evaluations/evaluations.service.js";
import {
  NotFoundError,
  ValidationError,
  ForbiddenError,
} from "../../middleware/errorHandler.js";

export const getRankingStatus = async (eventId) => {
  const eventRes = await pool.query(
      `SELECT id_event, event_status, final_delivery_date FROM events WHERE id_event = $1`,
      [eventId],
  );
  if (!eventRes.rows[0]) throw new NotFoundError("Evento no encontrado");

  const event = eventRes.rows[0];
  const rows = await RankingRepository.getEventEvaluationStatus(eventId);

  const isDeadlinePassed = event.final_delivery_date
      ? new Date(event.final_delivery_date) < new Date()
      : false;

  if (!rows.length) {
    return {
      eventId: parseInt(eventId),
      eventStatus: event.event_status,
      deliveryDate: event.final_delivery_date,
      isDeadlinePassed,
      requiredAreas: [],
      totalProjects: 0,
      fullyEvaluatedProjects: 0,
      allProjectsEvaluated: false,
      hasIncompleteEvaluations: false,
      canPublish: isDeadlinePassed,
      projects: [],
    };
  }

  const requiredAreas = rows[0].required_areas ?? [];

  const projects = rows.map((r) => ({
    id: r.id_project,
    name: r.project_name,
    team: r.team_name,
    fullyEvaluated: r.fully_evaluated ?? false,
    evaluatedAreaCount: parseInt(r.evaluated_area_count ?? 0),
    requiredAreaCount: parseInt(r.required_area_count ?? 0),
  }));

  const fullyEvaluatedProjects = projects.filter(
      (p) => p.fullyEvaluated,
  ).length;
  const allProjectsEvaluated =
      projects.length > 0 && fullyEvaluatedProjects === projects.length;

  return {
    eventId: parseInt(eventId),
    eventStatus: event.event_status,
    deliveryDate: event.final_delivery_date,
    isDeadlinePassed,
    requiredAreas,
    totalProjects: projects.length,
    fullyEvaluatedProjects,
    allProjectsEvaluated,
    hasIncompleteEvaluations: !allProjectsEvaluated,
    canPublish: true, // Admin can always publish — UI shows warnings if deadline hasn't passed
    projects,
  };
};

export const publishRanking = async (eventId, requestingRole) => {
  if (requestingRole !== "ADMIN") {
    throw new ForbiddenError("Solo el admin puede publicar el ranking.");
  }

  const status = await getRankingStatus(eventId);

  const incompleteProjects = status.projects.filter((p) => !p.fullyEvaluated);
  const evaluationWarnings = incompleteProjects.map((p) => ({
    projectId: p.id,
    team: p.team,
    evaluatedAreas: p.evaluatedAreaCount,
    requiredAreas: p.requiredAreaCount,
    message: `El equipo "${p.team}" solo tiene ${p.evaluatedAreaCount} de ${p.requiredAreaCount} áreas evaluadas.`,
  }));

  // Warn if deadline hasn't passed, but don't block
  const deadlineWarning =
      !status.isDeadlinePassed && status.deliveryDate
          ? [
            {
              message: `El evento aún no ha cerrado (fecha de entrega: ${new Date(status.deliveryDate).toLocaleDateString("es-CO")}). Ranking publicado de forma anticipada.`,
            },
          ]
          : [];

  const projectIds = await RankingRepository.getProjectsForEvent(eventId);

  const errors = [];
  for (const projectId of projectIds) {
    try {
      await calculateProjectGrades(projectId, requestingRole);
    } catch (err) {
      if (err instanceof ValidationError) {
        errors.push({ projectId, message: err.message });
      } else {
        throw err;
      }
    }
  }

  const ranking = await RankingRepository.getEventRanking(eventId);
  const calculatedAt = new Date().toISOString();

  return {
    eventId: parseInt(eventId),
    calculatedAt,
    warnings: [...deadlineWarning, ...evaluationWarnings, ...errors],
    partialEvaluation: evaluationWarnings.length > 0,
    ranking,
  };
};

export const getPublishedRanking = async (eventId) => {
  const eventRes = await pool.query(
      `SELECT id_event, title, event_status, final_delivery_date FROM events WHERE id_event = $1`,
      [eventId],
  );
  if (!eventRes.rows[0]) throw new NotFoundError("Evento no encontrado");

  const ranking = await RankingRepository.getEventRanking(eventId);

  if (!ranking.length) {
    return { ranking: [], calculatedAt: null, event: eventRes.rows[0] };
  }

  const calcRes = await pool.query(
      `SELECT MAX(calculated_at) AS calculated_at
       FROM individual_project_results ipr
              JOIN projects p ON p.id_project = ipr.project_id
       WHERE p.id_event = $1`,
      [eventId],
  );

  return {
    eventId: parseInt(eventId),
    eventTitle: eventRes.rows[0].title,
    calculatedAt: calcRes.rows[0]?.calculated_at ?? null,
    ranking,
  };
};

export default { getRankingStatus, publishRanking, getPublishedRanking };
