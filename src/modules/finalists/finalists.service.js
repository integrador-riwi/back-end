import pool from '../../db/pool.js';
import * as FinalistsRepository from './finalists.repository.js';
import {
  NotFoundError,
  ValidationError,
  ConflictError,
  ForbiddenError,
} from '../../middleware/errorHandler.js';

const TOP_N = 3;

const buildVotesMap = (voteCounts) =>
    voteCounts.reduce((map, row) => {
      map[row.project_id] = row.votes_count;
      return map;
    }, {});

export const calculateAndSaveFinalists = async (eventId, requestingRole) => {
  if (requestingRole !== 'ADMIN') {
    throw new ForbiddenError('Only admins can calculate and save finalists');
  }

  const event = await FinalistsRepository.getEventById(eventId);
  if (!event) throw new NotFoundError('Event not found');

  if (event.event_status === 'FINISHED' || event.status === 'FINISHED') {
    throw new ConflictError('This event is already finished and has finalists registered');
  }

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

  const projects = await FinalistsRepository.getTopProjectsByScore(eventId, 100);
  if (projects.length < TOP_N) {
    throw new ValidationError(
        `At least ${TOP_N} projects with a calculated score are required. Currently there are ${projects.length}.`,
    );
  }

  const voteCounts = await FinalistsRepository.getVoteCountsByEvent(eventId);
  const votesMap = buildVotesMap(voteCounts);

  const allVotes = projects.map((p) => votesMap[p.id_project] ?? 0);
  const maxVotes = Math.max(...allVotes);

  const scored = projects.map((p) => {
    const teamScore    = parseFloat(p.team_score);
    const votes        = votesMap[p.id_project] ?? 0;
    const second_grade = parseFloat((teamScore * 0.8).toFixed(4));
    const votes_result = maxVotes > 0
        ? parseFloat(((votes / maxVotes) * 100 * 0.2).toFixed(4))
        : 0;
    const final_grade  = parseFloat((second_grade + votes_result).toFixed(4));

    return {
      id_project:   p.id_project,
      project_name: p.project_name,
      team_name:    p.team_name,
      team_score:   teamScore,
      votes_count:  votes,
      second_grade,
      votes_result,
      final_grade,
    };
  });

  scored.sort((a, b) => b.final_grade - a.final_grade);
  const top3 = scored.slice(0, TOP_N);

  const saved = await FinalistsRepository.saveFinalistsAndCloseEvent(eventId, top3);

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
