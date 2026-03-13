import pool from "../../db/pool.js";
import * as FinalistsRepository from "./finalists.repository.js";
import { NotFoundError, ValidationError } from "../../middleware/errorHandler.js";

export const getFinalists = async (eventId) => {
  const eventRes = await pool.query(
    `SELECT id_event, title FROM events WHERE id_event = $1`,
    [eventId]
  );
  if (!eventRes.rows[0]) {
    throw new NotFoundError("Evento no encontrado");
  }

  const finalists = await FinalistsRepository.getFinalistsByEvent(eventId);

  return {
    eventId: parseInt(eventId),
    eventTitle: eventRes.rows[0].title,
    finalists,
  };
};

export const selectTopProjectsAsFinalists = async (eventId, count = 3, requestingRole) => {
  if (requestingRole !== "ADMIN") {
    throw new ValidationError("Solo el admin puede seleccionar finalists");
  }

  const rankingRes = await pool.query(
    `SELECT id_event FROM events WHERE id_event = $1`,
    [eventId]
  );
  if (!rankingRes.rows[0]) {
    throw new NotFoundError("Evento no encontrado");
  }

  const rankingCheck = await pool.query(
    `SELECT 1 FROM individual_project_results ipr
     JOIN projects p ON p.id_project = ipr.project_id
     WHERE p.id_event = $1
     LIMIT 1`,
    [eventId]
  );
  
  if (!rankingCheck.rows.length) {
    throw new ValidationError(
      "No hay ranking publicado para este evento. El admin debe calcular el ranking primero."
    );
  }

  const topProjects = await FinalistsRepository.getTopProjectsFromRanking(eventId, count);
  
  if (topProjects.length === 0) {
    throw new ValidationError("No hay proyectos en el ranking");
  }

  const projectIds = topProjects.map(p => p.id_project);
  await FinalistsRepository.setFinalists(eventId, projectIds);

  const finalists = await FinalistsRepository.getFinalistsByEvent(eventId);

  return {
    eventId: parseInt(eventId),
    selectedCount: projectIds.length,
    finalists,
  };
};

export const setFinalistsManually = async (eventId, projectIds, requestingRole) => {
  if (requestingRole !== "ADMIN") {
    throw new ValidationError("Solo el admin puede establecer finalists");
  }

  const eventRes = await pool.query(
    `SELECT id_event FROM events WHERE id_event = $1`,
    [eventId]
  );
  if (!eventRes.rows[0]) {
    throw new NotFoundError("Evento no encontrado");
  }

  if (!projectIds || projectIds.length === 0) {
    throw new ValidationError("Debe proporcionar al menos un proyecto");
  }

  for (const projectId of projectIds) {
    const projectRes = await pool.query(
      `SELECT id_project FROM projects WHERE id_project = $1 AND id_event = $2`,
      [projectId, eventId]
    );
    if (!projectRes.rows[0]) {
      throw new NotFoundError(`Proyecto ${projectId} no encontrado en este evento`);
    }
  }

  await FinalistsRepository.setFinalists(eventId, projectIds);

  const finalists = await FinalistsRepository.getFinalistsByEvent(eventId);

  return {
    eventId: parseInt(eventId),
    selectedCount: projectIds.length,
    finalists,
  };
};

export const getFinalistsForPublicVoting = async (eventId) => {
  const finalists = await FinalistsRepository.getFinalistsByEvent(eventId);

  if (finalists.length === 0) {
    throw new NotFoundError(
      "No hay finalists definidos para este evento"
    );
  }

  return finalists.map(f => ({
    id_project: f.id_project,
    project_name: f.project_name,
    team_name: f.team_name,
    preview_photo_url: f.preview_photo_url,
    video_url: f.video_url,
    presentation_url: f.presentation_url,
  }));
};

export default {
  getFinalists,
  selectTopProjectsAsFinalists,
  setFinalistsManually,
  getFinalistsForPublicVoting,
};
