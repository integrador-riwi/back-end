import ProjectsRepository from './projects.repository.js';
import TeamsRepository from '../teams/teams.repository.js';
import n8nService from '../../integrations/n8n.service.js';
import { NotFoundError, ForbiddenError, ValidationError } from '../../middleware/errorHandler.js';

export const listProjects = async (query) => {
  const { search, page, limit } = query;

  const pageNum = parseInt(page) || 1;
  const limitNum = parseInt(limit) || 10;

  if (pageNum < 1 || limitNum < 1 || limitNum > 100) {
    throw new ValidationError('Parámetros de paginación inválidos');
  }

  return ProjectsRepository.findAll({ search, page: pageNum, limit: limitNum });
};

export const getProjectById = async (id, userId, userRole) => {
  const project = await ProjectsRepository.findById(id);

  if (!project) {
    throw new NotFoundError('Proyecto no encontrado');
  }

  const isMember = await ProjectsRepository.isMemberOfTeam(id, userId);
  const isAdmin = userRole === 'ADMIN';

  if (!isMember && !isAdmin) {
    throw new ForbiddenError('No tienes acceso a este proyecto');
  }

  return project;
};

export const getProjectByTeamId = async (teamId, userId, userRole) => {
  const project = await ProjectsRepository.findByTeamId(teamId);

  if (!project) {
    throw new NotFoundError('Proyecto no encontrado');
  }

  const isMember = await TeamsRepository.isMember(teamId, userId);
  const isAdmin = userRole === 'ADMIN';

  if (!isMember && !isAdmin) {
    throw new ForbiddenError('No tienes acceso a este proyecto');
  }

  return project;
};

export const updateProject = async (id, data, userId, userRole) => {
  const project = await ProjectsRepository.findById(id);

  if (!project) {
    throw new NotFoundError('Proyecto no encontrado');
  }

  const isLeader = await ProjectsRepository.isLeaderOfTeamByProjectId(id, userId);
  const isAdmin = userRole === 'ADMIN';

  if (!isLeader && !isAdmin) {
    throw new ForbiddenError('No tienes permiso para editar este proyecto');
  }

  if (data.name !== undefined) {
    if (data.name.trim().length === 0) {
      throw new ValidationError('El nombre del proyecto no puede estar vacío');
    }
    if (data.name.length > 200) {
      throw new ValidationError('El nombre del proyecto no puede exceder 200 caracteres');
    }
  }

  const updatedProject = await ProjectsRepository.update(id, {
    name: data.name?.trim(),
    description: data.description?.trim(),
    repoUrl: data.repoUrl
  });

  return updatedProject;
};

export const updateDeliverables = async (id, data, userId, userRole) => {
  const project = await ProjectsRepository.findById(id);

  if (!project) {
    throw new NotFoundError('Proyecto no encontrado');
  }

  const isLeader = await ProjectsRepository.isLeaderOfTeamByProjectId(id, userId);
  const isAdmin = userRole === 'ADMIN';

  if (!isLeader && !isAdmin) {
    throw new ForbiddenError('No tienes permiso para editar los entregables de este proyecto');
  }

  if (data.videoUrl !== undefined) {
    if (data.videoUrl && !isValidUrl(data.videoUrl)) {
      throw new ValidationError('La URL del video no es válida');
    }
  }

  if (data.presentationUrl !== undefined) {
    if (data.presentationUrl && !isValidUrl(data.presentationUrl)) {
      throw new ValidationError('La URL de la presentación no es válida');
    }
  }

  const updatedProject = await ProjectsRepository.updateDeliverables(id, {
    videoUrl: data.videoUrl,
    presentationUrl: data.presentationUrl,
    previewPhotoUrl: data.previewPhotoUrl
  });

  return updatedProject;
};

function isValidUrl(string) {
  try {
    new URL(string);
    return true;
  } catch {
    return false;
  }
}

export const createProject = async (teamId, data, userId, userRole) => {
  const isLeader = await TeamsRepository.isLeader(teamId, userId);
  const isAdmin = userRole === 'ADMIN';

  if (!isLeader && !isAdmin) {
    throw new ForbiddenError('Solo el líder puede crear el proyecto');
  }

  if (!data.name || data.name.trim().length === 0) {
    throw new ValidationError('El nombre del proyecto es requerido');
  }

  if (data.name.length > 200) {
    throw new ValidationError('El nombre del proyecto no puede exceder 200 caracteres');
  }

  const leaderWithGithub = await TeamsRepository.getMemberWithGithub(userId);

  if (!leaderWithGithub || !leaderWithGithub.github_username) {
    throw new ValidationError('Debes tener GitHub conectado para crear un proyecto');
  }

  if (!leaderWithGithub.github_token) {
    throw new ValidationError('Tu token de GitHub no está disponible. Por favor, reconnécta tu cuenta.');
  }

  const project = await ProjectsRepository.create(teamId, {
    name: data.name.trim(),
    description: data.description?.trim() || ''
  });

  const repoName = `project-${data.name.toLowerCase().replace(/\s+/g, '-')}`;
  const repoUrl = `https://github.com/riwi-proyects-integrations/${repoName}`;

  try {
    await n8nService.triggerProjectCreated({
      id: project.id_project,
      name: data.name.trim()
    }, {
      githubUsername: leaderWithGithub.github_username,
      githubToken: leaderWithGithub.github_token
    });

    await ProjectsRepository.update(project.id_project, { name: null, description: null, repoUrl });
    project.repo_url = repoUrl;

    return project;
  } catch (error) {
    console.error('Error triggering n8n:', error.message);
    return project;
  }
};

export const confirmTeamProject = async (teamId, data, userId, userRole) => {
  return createProject(teamId, data, userId, userRole);
};

export default {
  listProjects,
  getProjectById,
  getProjectByTeamId,
  updateProject,
  updateDeliverables,
  createProject,
  confirmTeamProject
};
