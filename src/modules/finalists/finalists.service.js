import pool from '../../db/pool.js';
import * as FinalistsRepository from './finalists.repository.js';
import {
  NotFoundError,
  ValidationError,
  ConflictError,
  ForbiddenError,
} from '../../middleware/errorHandler.js';

const TOP_N = 3;

// ── Fórmula del ganador ───────────────────────────────────────────────────────
// final_grade = nota_puntaje + staff_puntaje + publico_puntaje   (MENOR = MEJOR)
//
// team_score viene en escala 0-100, se divide entre 10 para convertir a 0-10
// nota_puntaje    = (10 - team_score/10) * 20
// staff_puntaje   = posición_staff   * 3
// publico_puntaje = posición_publico * 2
//
// Las posiciones de staff y público se calculan por separado.
// El más votado en cada categoría recibe posición 1.
// Empate: misma posición, el siguiente salta (ej: [1,1,3,4])

const buildVotesMap = (voteCounts) =>
    voteCounts.reduce((map, row) => {
      map[row.project_id] = parseInt(row.votes_count, 10);
      return map;
    }, {});

/**
 * Asigna posiciones por votos con manejo de empates.
 * El más votado = posición 1. Empate → misma posición, el siguiente salta.
 * Ej: votos [10, 10, 7, 5] → posiciones [1, 1, 3, 4]
 */
/**
 * Asigna posiciones de ranking con manejo correcto de empates y sin votos.
 *
 * Reglas:
 * - Más puntos = posición 1 (mejor).
 * - Empate → misma posición. El siguiente salta (ej: [1,1,3,4]).
 * - Sin votos (0 pts) → se les asigna la posición que les toca por orden,
 *   también con empate (todos los de 0 pts comparten la misma posición).
 *
 * Ejemplo con 5 proyectos: votos [10,10,7,0,0]
 *   → posiciones [1, 1, 3, 4, 4]
 */
const assignVotePositions = (projects, votesMap) => {
  const sorted = [...projects].sort((a, b) => {
    return (votesMap[b.id_project] ?? 0) - (votesMap[a.id_project] ?? 0);
  });

  const positionMap = {};

  for (let i = 0; i < sorted.length; i++) {
    const currentVotes  = votesMap[sorted[i].id_project] ?? 0;
    const previousVotes = i === 0 ? null : (votesMap[sorted[i - 1].id_project] ?? 0);

    if (i === 0 || currentVotes === previousVotes) {
      // Empate o primer elemento: misma posición que el anterior (o 1 si es el primero)
      positionMap[sorted[i].id_project] = i === 0 ? 1 : positionMap[sorted[i - 1].id_project];
    } else {
      // Posición real = índice + 1 (salta los empates anteriores)
      positionMap[sorted[i].id_project] = i + 1;
    }
  }

  return positionMap;
};

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

  // Votos del público
  const publicVoteCounts = await FinalistsRepository.getVoteCountsByEvent(eventId);
  const publicVotesMap   = buildVotesMap(publicVoteCounts);

  // Votos del staff (usando puntos del podio: pos1=3pts, pos2=2pts, pos3=1pt)
  const staffVoteResult = await pool.query(
      `SELECT vr.project_id, COALESCE(SUM(vr.points), 0)::integer AS votes_count
       FROM vote_rankings vr
              JOIN public_votes pv ON pv.id_vote = vr.id_vote
              JOIN qr_votes qr ON qr.id = pv.qr_vote_id
       WHERE qr.id_event = $1
         AND pv.voter_role = 'STAFF'
         AND pv.vote_hash IS NOT NULL
       GROUP BY vr.project_id`,
      [eventId],
  );
  const staffVotesMap = buildVotesMap(staffVoteResult.rows);

  // Ranking de posiciones por separado (staff y público independientes)
  const staffPositionMap   = assignVotePositions(projects, staffVotesMap);
  const publicPositionMap  = assignVotePositions(projects, publicVotesMap);

  // Fórmula: final_grade = nota_puntaje + staff_puntaje + publico_puntaje  (MENOR = MEJOR)
  //   nota_puntaje    = (10 - team_score/10) * 20   ← team_score 0-100 → 0-10
  //   staff_puntaje   = posición_staff   * 3
  //   publico_puntaje = posición_publico * 2
  const scored = projects.map((p) => {
    const teamScore      = parseFloat(p.team_score) / 10;  // convert 0-100 → 0-10
    const votesPublico   = publicVotesMap[p.id_project] ?? 0;
    const votesStaff     = staffVotesMap[p.id_project]  ?? 0;
    const posStaff       = staffPositionMap[p.id_project]  ?? projects.length;
    const posPublico     = publicPositionMap[p.id_project] ?? projects.length;

    const nota_puntaje    = parseFloat(((10 - teamScore) * 20).toFixed(7));
    const staff_puntaje   = parseFloat((posStaff   * 3).toFixed(7));
    const publico_puntaje = parseFloat((posPublico * 2).toFixed(7));
    const final_grade     = parseFloat((nota_puntaje + staff_puntaje + publico_puntaje).toFixed(7));

    return {
      id_project:   p.id_project,
      project_name: p.project_name,
      team_name:    p.team_name,
      team_score:   teamScore,
      votes_count:  votesPublico + votesStaff,
      votes_staff:  votesStaff,
      second_grade: nota_puntaje,                    // 50% nota
      votes_result: staff_puntaje + publico_puntaje, // 30% staff + 20% público
      final_grade,
    };
  });

  // Menor final_grade = mejor posición
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
