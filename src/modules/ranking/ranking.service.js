import pool from "../../db/pool.js";
import * as RankingRepository from "./ranking.repository.js";
import { calculateProjectGrades } from "../evaluations/evaluations.service.js";
import {
  NotFoundError,
  ValidationError,
  ForbiddenError,
} from "../../middleware/errorHandler.js";

// ─────────────────────────────────────────────────────────────
// Ranking status — tells the admin whether conditions are met
// ─────────────────────────────────────────────────────────────

/**
 * Returns a detailed status object:
 * {
 *   eventId, eventStatus, deliveryDate,
 *   isDeadlinePassed,        — final_delivery_date < now
 *   requiredAreas,           — areas with active rubrics
 *   totalProjects,
 *   fullyEvaluatedProjects,  — projects covered in ALL required areas
 *   allProjectsEvaluated,    — boolean
 *   canPublish,              — isDeadlinePassed && allProjectsEvaluated
 *   projects: [{ id, name, team, fullyEvaluated, evaluatedAreas, requiredAreaCount }]
 * }
 */
export const getRankingStatus = async (eventId) => {
  const eventRes = await pool.query(
    `SELECT id_event, event_status, final_delivery_date FROM events WHERE id_event = $1`,
    [eventId],
  );
  if (!eventRes.rows[0]) throw new NotFoundError("Evento no encontrado");

  const event = eventRes.rows[0];
  const rows = await RankingRepository.getEventEvaluationStatus(eventId);

  if (!rows.length) {
    return {
      eventId: parseInt(eventId),
      eventStatus: event.event_status,
      deliveryDate: event.final_delivery_date,
      isDeadlinePassed: event.final_delivery_date
        ? new Date(event.final_delivery_date) < new Date()
        : false,
      requiredAreas: [],
      totalProjects: 0,
      fullyEvaluatedProjects: 0,
      allProjectsEvaluated: false,
      canPublish: false,
      projects: [],
    };
  }

  const requiredAreas = rows[0].required_areas ?? [];
  const isDeadlinePassed = event.final_delivery_date
    ? new Date(event.final_delivery_date) < new Date()
    : false;

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
    canPublish: isDeadlinePassed && allProjectsEvaluated,
    projects,
  };
};

// ─────────────────────────────────────────────────────────────
// Publish ranking — calculates all projects then returns ranking
// ─────────────────────────────────────────────────────────────

export const publishRanking = async (eventId, requestingRole) => {
  if (requestingRole !== "ADMIN") {
    throw new ForbiddenError("Solo el admin puede publicar el ranking.");
  }

  const status = await getRankingStatus(eventId);

  if (!status.isDeadlinePassed) {
    throw new ValidationError(
      `El evento aún no ha cerrado. Fecha de entrega: ${
        status.deliveryDate
          ? new Date(status.deliveryDate).toLocaleDateString("es-CO")
          : "no definida"
      }.`,
    );
  }

  if (!status.allProjectsEvaluated) {
    const pending = status.projects
      .filter((p) => !p.fullyEvaluated)
      .map((p) => p.team)
      .join(", ");
    throw new ValidationError(
      `Los siguientes equipos aún no tienen calificaciones en todas las áreas requeridas: ${pending}.`,
    );
  }

  // Calculate grades for every project in the event
  const projectIds = await RankingRepository.getProjectsForEvent(eventId);

  const errors = [];
  for (const projectId of projectIds) {
    try {
      await calculateProjectGrades(projectId, requestingRole);
    } catch (err) {
      // If already calculated or minor issue, log but don't abort
      if (err instanceof ValidationError) {
        errors.push({ projectId, message: err.message });
      } else {
        throw err;
      }
    }
  }

  // Return the ranking
  const ranking = await RankingRepository.getEventRanking(eventId);

  return {
    eventId: parseInt(eventId),
    calculatedAt: new Date().toISOString(),
    warnings: errors,
    ranking,
  };
};

// ─────────────────────────────────────────────────────────────
// Get published ranking (read-only, no recalculation)
// ─────────────────────────────────────────────────────────────

export const getPublishedRanking = async (eventId) => {
  const eventRes = await pool.query(
    `SELECT id_event, title, event_status, final_delivery_date FROM events WHERE id_event = $1`,
    [eventId],
  );
  if (!eventRes.rows[0]) throw new NotFoundError("Evento no encontrado");

  const ranking = await RankingRepository.getEventRanking(eventId);

  if (!ranking.length) {
    throw new NotFoundError(
      "No hay ranking publicado para este evento. El admin debe calcularlo primero.",
    );
  }

  return {
    eventId: parseInt(eventId),
    eventTitle: eventRes.rows[0].title,
    ranking,
  };
};

export default { getRankingStatus, publishRanking, getPublishedRanking };
