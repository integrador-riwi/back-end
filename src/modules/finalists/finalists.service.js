import pool from '../../db/pool.js';
import * as FinalistsRepository from './finalists.repository.js';
import {
  NotFoundError,
  ValidationError,
  ConflictError,
  ForbiddenError,
} from '../../middleware/errorHandler.js';

const TOP_N = 3;

// ── Pesos de la fórmula (según Excel Calculos_finalistas_PI) ──────────────────
// Total = (10 - nota) * PESO_NOTA + votos_publico * PESO_PUBLICO + votos_staff * PESO_STAFF
// Menor total = mejor posición (ranking ascendente)
const PESO_NOTA    = 20;  // multiplicador de la penalización por nota
const PESO_PUBLICO = 2;   // puntos por voto del público
const PESO_STAFF   = 3;   // puntos por voto del staff

const buildVotesMap = (voteCounts) =>
    voteCounts.reduce((map, row) => {
      map[row.project_id] = parseInt(row.votes_count, 10);
      return map;
    }, {});

export const calculateAndSaveFinalists = async (eventId, requestingRole) => {
  if (requestingRole !== 'ADMIN') {
    throw new ForbiddenError('Only admins can calculate and save finalists');
  }

  const event = await FinalistsRepository.getEventById(eventId);
  if (!event) throw new NotFoundError('Event not found');

  const existingCount = await FinalistsRepository.getFinalistsCountByEvent(eventId);
  if (existingCount > 0) {
    throw new ConflictError('Finalists are already registered for this event');
  }

  const rankingCheck = await pool.query(
      `SELECT 1
     FROM individual_project_results ipr
     JOIN projects p ON p.id_project = ipr.project_id
     WHERE p.id_event = $1
     LIMIT 1`,
      [eventId],
  );
  if (!rankingCheck.rows.length) {
    throw new ValidationError(
        'No ranking found for this event. The admin must publish the ranking first.',
    );
  }

  const projects = await FinalistsRepository.getTopProjectsByScore(eventId, 9999);
  if (projects.length < TOP_N) {
    throw new ValidationError(
        `At least ${TOP_N} projects with a calculated score are required. Currently there are ${projects.length}.`,
    );
  }

  // Votos del público (tabla public_votes via qr_votes)
  const publicVoteCounts = await FinalistsRepository.getVoteCountsByEvent(eventId);
  const publicVotesMap   = buildVotesMap(publicVoteCounts);

  // Votos del staff (usuarios con role = 'STAFF' que votaron)
  const staffVoteResult = await pool.query(
    `SELECT pv.project_id, COUNT(pv.id_vote)::integer AS votes_count
     FROM public_votes pv
     JOIN qr_votes qr ON qr.id = pv.qr_vote_id
     JOIN users u ON u.id_user::text = pv.voter_token
     WHERE qr.id_event = $1 AND u.role = 'STAFF'
     GROUP BY pv.project_id`,
    [eventId],
  );
  const staffVotesMap = buildVotesMap(staffVoteResult.rows);

  // Fórmula: Total = (10 - nota) * PESO_NOTA + votos_publico * PESO_PUBLICO + votos_staff * PESO_STAFF
  // Menor total = mejor posición
  const scored = projects.map((p) => {
    const teamScore    = parseFloat(p.team_score);
    const votesPublico = publicVotesMap[p.id_project] ?? 0;
    const votesStaff   = staffVotesMap[p.id_project]  ?? 0;

    const penalizacion_nota = parseFloat(((10 - teamScore) * PESO_NOTA).toFixed(4));
    const puntos_publico    = parseFloat((votesPublico * PESO_PUBLICO).toFixed(4));
    const puntos_staff      = parseFloat((votesStaff  * PESO_STAFF).toFixed(4));
    const final_grade       = parseFloat((penalizacion_nota + puntos_publico + puntos_staff).toFixed(4));

    return {
      id_project:        p.id_project,
      project_name:      p.project_name,
      team_name:         p.team_name,
      team_score:        teamScore,
      votes_count:       votesPublico,
      votes_staff:       votesStaff,
      second_grade:      penalizacion_nota,  // penalización por nota (campo reutilizado)
      votes_result:      puntos_publico + puntos_staff,
      final_grade,
    };
  });

  // Menor total = mejor posición (ascendente)
  scored.sort((a, b) => a.final_grade - b.final_grade);
  const top3 = scored.slice(0, TOP_N);

  const saved = await FinalistsRepository.saveFinalists(eventId, top3);

  const result = saved.map((row, i) => ({
    ...row,
    project_name: top3[i].project_name,
    team_name:    top3[i].team_name,
    team_score:   top3[i].team_score,
  }));

  return {
    eventId:    parseInt(eventId),
    eventTitle: event.title ?? event.event_name,
    finalists:  result,
  };
};

export const getFinalists = async (eventId) => {
  const event = await FinalistsRepository.getEventById(eventId);
  if (!event) throw new NotFoundError('Event not found');

  const finalists = await FinalistsRepository.getFinalistsByEvent(eventId);
  return {
    eventId:    parseInt(eventId),
    eventTitle: event.title ?? event.event_name,
    finalists,
  };
};

export const selectTopProjectsAsFinalists = async (eventId, count = 3, requestingRole) => {
  if (requestingRole !== 'ADMIN') {
    throw new ForbiddenError('Only admins can select finalists');
  }

  const event = await FinalistsRepository.getEventById(eventId);
  if (!event) throw new NotFoundError('Event not found');

  const rankingCheck = await pool.query(
      `SELECT 1
       FROM individual_project_results ipr
              JOIN projects p ON p.id_project = ipr.project_id
       WHERE p.id_event = $1
       LIMIT 1`,
      [eventId],
  );
  if (!rankingCheck.rows.length) {
    throw new ValidationError(
        'No ranking found for this event. The admin must calculate the ranking first.',
    );
  }

  const topProjects = await FinalistsRepository.getTopProjectsFromRanking(eventId, count);
  if (topProjects.length === 0) throw new ValidationError('No projects found in the ranking');

  const projectIds = topProjects.map((p) => p.id_project);
  await FinalistsRepository.setFinalists(eventId, projectIds);

  const finalists = await FinalistsRepository.getFinalistsByEvent(eventId);
  return { eventId: parseInt(eventId), selectedCount: projectIds.length, finalists };
};

export const setFinalistsManually = async (eventId, projectIds, requestingRole) => {
  if (requestingRole !== 'ADMIN') {
    throw new ForbiddenError('Only admins can set finalists');
  }

  const event = await FinalistsRepository.getEventById(eventId);
  if (!event) throw new NotFoundError('Event not found');

  if (!projectIds || projectIds.length === 0) {
    throw new ValidationError('At least one project must be provided');
  }

  for (const projectId of projectIds) {
    const check = await pool.query(
        `SELECT id_project FROM projects WHERE id_project = $1 AND id_event = $2`,
        [projectId, eventId],
    );
    if (!check.rows[0]) {
      throw new NotFoundError(`Project ${projectId} not found in this event`);
    }
  }

  await FinalistsRepository.setFinalists(eventId, projectIds);
  const finalists = await FinalistsRepository.getFinalistsByEvent(eventId);
  return { eventId: parseInt(eventId), selectedCount: projectIds.length, finalists };
};

export default {
  calculateAndSaveFinalists,
  getFinalists,
  selectTopProjectsAsFinalists,
  setFinalistsManually,
};