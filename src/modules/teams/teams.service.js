import TeamsRepository from './teams.repository.js';
import n8nService from '../../integrations/n8n.service.js';
import { NotFoundError, ForbiddenError, ValidationError } from '../../middleware/errorHandler.js';

const MAX_TEAM_MEMBERS = 5;

export const createTeam = async (data, leaderId, userRole = 'TL_DEVELOPMENT') => {
  if (!data.name || data.name.trim().length === 0) {
    throw new ValidationError('El nombre del equipo es requerido');
  }

  if (data.name.length > 100) {
    throw new ValidationError('El nombre del equipo no puede exceder 100 caracteres');
  }

  const leaderWithGithub = await TeamsRepository.getMemberWithGithub(leaderId);

  if (!leaderWithGithub || !leaderWithGithub.github_username) {
    throw new ValidationError('Debes tener GitHub conectado para crear un equipo');
  }

  if (!leaderWithGithub.github_token) {
    throw new ValidationError('Tu token de GitHub no está disponible. Por favor, reconnécta tu cuenta.');
  }

  const team = await TeamsRepository.create({
    name: data.name.trim(),
    leaderId
  });

  try {
    const repoName = `project-${team.id_team}-${data.name.toLowerCase().replace(/\s+/g, '-')}`;
    
    const n8nResponse = await n8nService.triggerProjectCreated({
      id: team.id_team,
      name: data.name.trim()
    }, {
      githubUsername: leaderWithGithub.github_username,
      githubToken: leaderWithGithub.github_token
    });

    let repoUrl = null;

    if (n8nResponse && n8nResponse.data) {
      repoUrl = n8nResponse.data.repositoryUrl || n8nResponse.data.repository_url;
    }

    return {
      ...team,
      repo_url: repoUrl
    };
  } catch (error) {
    console.error('Error triggering n8n:', error.message);
    return team;
  }
};

export const listTeams = async (query) => {
  const { search, page, limit } = query;

  const pageNum = parseInt(page) || 1;
  const limitNum = parseInt(limit) || 10;

  if (pageNum < 1 || limitNum < 1 || limitNum > 100) {
    throw new ValidationError('Parámetros de paginación inválidos');
  }

  return TeamsRepository.findAll({ search, page: pageNum, limit: limitNum });
};

export const getTeamById = async (id, userId, userRole) => {
  const team = await TeamsRepository.findByIdWithMembers(id);

  if (!team) {
    throw new NotFoundError('Equipo no encontrado');
  }

  const isMember = await TeamsRepository.isMember(id, userId);
  const isAdmin = userRole === 'ADMIN';

  if (!isMember && !isAdmin) {
    throw new ForbiddenError('No tienes acceso a este equipo');
  }

  const project = await TeamsRepository.getTeamProject(id);

  return {
    ...team,
    project: project || null
  };
};

export const getTeamSimple = async (id) => {
  const team = await TeamsRepository.findById(id);

  if (!team) {
    throw new NotFoundError('Equipo no encontrado');
  }

  const project = await TeamsRepository.getTeamProject(id);

  return {
    ...team,
    project: project || null
  };
};

export const updateTeam = async (id, data, userId, userRole) => {
  const team = await TeamsRepository.findById(id);

  if (!team) {
    throw new NotFoundError('Equipo no encontrado');
  }

  const isLeader = await TeamsRepository.isLeader(id, userId);
  const isAdmin = userRole === 'ADMIN';

  if (!isLeader && !isAdmin) {
    throw new ForbiddenError('No tienes permiso para actualizar este equipo');
  }

  if (data.name !== undefined) {
    if (data.name.trim().length === 0) {
      throw new ValidationError('El nombre del equipo no puede estar vacío');
    }
    if (data.name.length > 100) {
      throw new ValidationError('El nombre del equipo no puede exceder 100 caracteres');
    }
  }

  const updatedTeam = await TeamsRepository.update(id, { name: data.name?.trim() });

  return updatedTeam;
};

export const deleteTeam = async (id, userRole) => {
  if (userRole !== 'ADMIN') {
    throw new ForbiddenError('Solo los administradores pueden eliminar equipos');
  }

  const team = await TeamsRepository.findById(id);

  if (!team) {
    throw new NotFoundError('Equipo no encontrado');
  }

  const deletedTeam = await TeamsRepository.remove(id);

  return deletedTeam;
};

export const addMemberToTeam = async (teamId, memberData, userId, userRole) => {
  const team = await TeamsRepository.findById(teamId);

  if (!team) {
    throw new NotFoundError('Equipo no encontrado');
  }

  const isLeader = await TeamsRepository.isLeader(teamId, userId);
  const isAdmin = userRole === 'ADMIN';

  if (!isLeader && !isAdmin) {
    throw new ForbiddenError('No tienes permiso para agregar miembros a este equipo');
  }

  if (!memberData.userId) {
    throw new ValidationError('El ID del usuario es requerido');
  }

  if (memberData.userId === userId) {
    throw new ValidationError('No puedes invitarte a ti mismo');
  }

  const memberWithGithub = await TeamsRepository.getMemberWithGithub(memberData.userId);

  if (!memberWithGithub || !memberWithGithub.github_username) {
    throw new ValidationError('El usuario debe tener GitHub conectado para ser invitado');
  }

  const currentMembers = await TeamsRepository.countTeamMembers(teamId);
  const canAddMore = isAdmin || currentMembers < MAX_TEAM_MEMBERS;

  if (!canAddMore) {
    throw new ValidationError(`El equipo ya tiene el máximo de ${MAX_TEAM_MEMBERS} miembros`);
  }

  const invitation = await TeamsRepository.createInvitation(teamId, memberData.userId, userId);

  try {
    const leaderWithGithub = await TeamsRepository.getLeaderWithGithub(teamId);
    const teamProject = await TeamsRepository.getTeamProject(teamId);

    if (leaderWithGithub && teamProject) {
      await n8nService.triggerMemberInvited({
        id: teamId,
        projectId: teamId,
        repoName: teamProject.repo_name,
        leaderGithubUsername: leaderWithGithub.github_username
      }, {
        githubUsername: memberWithGithub.github_username,
        githubToken: memberWithGithub.github_token,
        email: memberWithGithub.email,
        name: memberWithGithub.name,
        role: memberData.role || 'DEVELOPER'
      });
    }
  } catch (error) {
    console.error('Error triggering n8n member invited:', error.message);
  }

  return {
    ...invitation,
    message: 'Invitación enviada. El usuario debe aceptar la invitación en GitHub y luego en la plataforma.'
  };
};

export const removeMemberFromTeam = async (teamId, memberId, userId, userRole) => {
  const team = await TeamsRepository.findById(teamId);

  if (!team) {
    throw new NotFoundError('Equipo no encontrado');
  }

  const isLeader = await TeamsRepository.isLeader(teamId, userId);
  const isAdmin = userRole === 'ADMIN';

  if (!isLeader && !isAdmin) {
    throw new ForbiddenError('No tienes permiso para eliminar miembros de este equipo');
  }

  const member = await TeamsRepository.removeMember(teamId, memberId);

  return member;
};

export const getMyTeams = async (userId) => {
  const teams = await TeamsRepository.getMyTeams(userId);
  const pendingInvitations = await TeamsRepository.getPendingInvitationsByUser(userId);

  return {
    teams,
    pendingInvitations
  };
};

export const getAvailableCoders = async (teamId, query) => {
  const team = await TeamsRepository.findById(teamId);

  if (!team) {
    throw new NotFoundError('Equipo no encontrado');
  }

  const { search, page, limit } = query;

  const pageNum = parseInt(page) || 1;
  const limitNum = parseInt(limit) || 20;

  if (pageNum < 1 || limitNum < 1 || limitNum > 100) {
    throw new ValidationError('Parámetros de paginación inválidos');
  }

  const coders = await TeamsRepository.getAvailableCoders(teamId, { search, page: pageNum, limit: limitNum });

  const invitations = await TeamsRepository.getInvitationsByTeam(teamId);
  const invitedUserIds = invitations
    .filter(inv => inv.status === 'PENDING')
    .map(inv => inv.id_user);

  const codersWithInvitationStatus = coders.coders.map(coder => ({
    ...coder,
    hasPendingInvitation: invitedUserIds.includes(coder.id_user)
  }));

  return {
    coders: codersWithInvitationStatus,
    pagination: coders.pagination
  };
};

export const getTeamMembers = async (id, userId, userRole) => {
  const team = await TeamsRepository.findById(id);

  if (!team) {
    throw new NotFoundError('Equipo no encontrado');
  }

  const isMember = await TeamsRepository.isMember(id, userId);
  const isAdmin = userRole === 'ADMIN';

  if (!isMember && !isAdmin) {
    throw new ForbiddenError('No tienes acceso a este equipo');
  }

  return TeamsRepository.findByIdWithMembers(id);
};

export const getTeamInvitations = async (teamId, userId, userRole) => {
  const team = await TeamsRepository.findById(teamId);

  if (!team) {
    throw new NotFoundError('Equipo no encontrado');
  }

  const isLeader = await TeamsRepository.isLeader(teamId, userId);
  const isAdmin = userRole === 'ADMIN';

  if (!isLeader && !isAdmin) {
    throw new ForbiddenError('No tienes permiso para ver las invitaciones de este equipo');
  }

  return TeamsRepository.getInvitationsByTeam(teamId);
};

export const getMyPendingInvitations = async (userId) => {
  return TeamsRepository.getPendingInvitationsByUser(userId);
};

export const acceptInvitation = async (invitationId, userId) => {
  const invitation = await TeamsRepository.getInvitationById(invitationId);

  if (!invitation) {
    throw new NotFoundError('Invitación no encontrada');
  }

  if (invitation.id_user !== userId) {
    throw new ForbiddenError('No puedes aceptar esta invitación');
  }

  if (invitation.status !== 'PENDING') {
    throw new ValidationError('Esta invitación ya ha sido procesada');
  }

  const memberWithGithub = await TeamsRepository.getMemberWithGithub(userId);

  if (!memberWithGithub || !memberWithGithub.github_username) {
    throw new ValidationError('Debes tener GitHub conectado para aceptar la invitación');
  }

  return TeamsRepository.acceptInvitation(invitationId, userId);
};

export const rejectInvitation = async (invitationId, userId) => {
  const invitation = await TeamsRepository.getInvitationById(invitationId);

  if (!invitation) {
    throw new NotFoundError('Invitación no encontrada');
  }

  if (invitation.id_user !== userId) {
    throw new ForbiddenError('No puedes rechazar esta invitación');
  }

  if (invitation.status !== 'PENDING') {
    throw new ValidationError('Esta invitación ya ha sido procesada');
  }

  return TeamsRepository.rejectInvitation(invitationId, userId);
};

export default {
  createTeam,
  listTeams,
  getTeamById,
  getTeamSimple,
  updateTeam,
  deleteTeam,
  addMemberToTeam,
  removeMemberFromTeam,
  getMyTeams,
  getAvailableCoders,
  getTeamMembers,
  getTeamInvitations,
  getMyPendingInvitations,
  acceptInvitation,
  rejectInvitation
};
