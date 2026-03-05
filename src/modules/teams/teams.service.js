import TeamsRepository from "./teams.repository.js";
import ProjectsRepository from "../projects/projects.repository.js";
import n8nService from "../../integrations/n8n.service.js";
import {
  NotFoundError,
  ForbiddenError,
  ValidationError,
} from "../../middleware/errorHandler.js";

const MAX_TEAM_MEMBERS = 5;

export const createTeam = async (
  data,
  leaderId,
  userRole = [
    "ADMIN",
    "TL_DEVELOPMENT",
    "TL_SOFT_SKILLS",
    "TL_ENGLISH",
    "CODER",
  ],
) => {
  if (!data.name || data.name.trim().length === 0) {
    throw new ValidationError("El nombre del equipo es requerido");
  }

  if (data.name.length > 100) {
    throw new ValidationError(
      "El nombre del equipo no puede exceder 100 caracteres",
    );
  }

  const leaderWithGithub = await TeamsRepository.getMemberWithGithub(leaderId);

  if (!leaderWithGithub || !leaderWithGithub.github_username) {
    throw new ValidationError(
      "Debes tener GitHub conectado para crear un equipo",
    );
  }

  if (!leaderWithGithub.github_token) {
    throw new ValidationError(
      "Tu token de GitHub no está disponible. Por favor, reconnécta tu cuenta.",
    );
  }

  // Idempotencia: si ya es líder de un equipo, devolver ese en vez de crear otro
  const existingTeam = await TeamsRepository.findLeaderTeam(leaderId);
  if (existingTeam) {
    const project = await ProjectsRepository.findByTeamId(existingTeam.id_team);
    return {
      ...existingTeam,
      leader_id: leaderId,
      members: [],
      project: project || null,
    };
  }

  const team = await TeamsRepository.create({
    name: data.name.trim(),
    leaderId,
  });

  try {
    const repoName = `project-${team.id_team}-${data.name.toLowerCase().replace(/\s+/g, "-")}`;

    const n8nResponse = await n8nService.triggerProjectCreated(
      {
        id: team.id_team,
        name: data.name.trim(),
      },
      {
        githubUsername: leaderWithGithub.github_username,
        githubToken: leaderWithGithub.github_token,
      },
    );

    let repoUrl = null;
    let savedRepoName = repoName;

    // n8n responde: { status, message, data: { repositoryUrl, repositoryName } }
    // axios wrappea eso en response.data -> n8nResponse.data.data es el objeto real
    const n8nData = n8nResponse?.data?.data ?? n8nResponse?.data ?? null;
    if (n8nData) {
      repoUrl = n8nData.repositoryUrl || n8nData.repository_url || null;
      savedRepoName = n8nData.repositoryName || repoName;
    }
    console.log(
      "[n8n team-created] savedRepoName:",
      savedRepoName,
      "repoUrl:",
      repoUrl,
    );

    // Guardar el repo en team_projects para que invite/remove funcionen
    await TeamsRepository.saveTeamProject(team.id_team, {
      repoName: savedRepoName,
      repoUrl: repoUrl,
      inviteToken: null,
    });

    // Guardar el proyecto con nombre y descripción
    let project = await ProjectsRepository.create(team.id_team, {
      name: data.name.trim(),
      description: data.description?.trim() || `${data.name.trim()} project`,
    });

    // Actualizar el proyecto con el repo_url
    if (repoUrl) {
      project = await ProjectsRepository.update(project.id_project, {
        repoUrl,
      });
    }

    return {
      ...team,
      project: project,
      repo_url: repoUrl,
    };
  } catch (error) {
    console.error("Error triggering n8n:", error.message);
    return team;
  }
};

export const listTeams = async (query) => {
  const { search, page, limit } = query;

  const pageNum = parseInt(page) || 1;
  const limitNum = parseInt(limit) || 10;

  if (pageNum < 1 || limitNum < 1 || limitNum > 100) {
    throw new ValidationError("Parámetros de paginación inválidos");
  }

  return TeamsRepository.findAll({ search, page: pageNum, limit: limitNum });
};

export const getTeamById = async (id, userId, userRole) => {
  const team = await TeamsRepository.findByIdWithMembers(id);

  if (!team) {
    throw new NotFoundError("Equipo no encontrado");
  }

  const isMember = await TeamsRepository.isMember(id, userId);
  const isAdmin = userRole === "ADMIN";

  if (!isMember && !isAdmin) {
    throw new ForbiddenError("No tienes acceso a este equipo");
  }

  const project = await ProjectsRepository.findByTeamId(id);

  return {
    ...team,
    project: project || null,
  };
};

export const getTeamSimple = async (id) => {
  const team = await TeamsRepository.findById(id);

  if (!team) {
    throw new NotFoundError("Equipo no encontrado");
  }

  const project = await ProjectsRepository.findByTeamId(id);

  return {
    ...team,
    project: project || null,
  };
};

export const updateTeam = async (id, data, userId, userRole) => {
  const team = await TeamsRepository.findById(id);

  if (!team) {
    throw new NotFoundError("Equipo no encontrado");
  }

  const isLeader = await TeamsRepository.isLeader(id, userId);
  const isAdmin = userRole === "ADMIN";

  if (!isLeader && !isAdmin) {
    throw new ForbiddenError("No tienes permiso para actualizar este equipo");
  }

  if (data.name !== undefined) {
    if (data.name.trim().length === 0) {
      throw new ValidationError("El nombre del equipo no puede estar vacío");
    }
    if (data.name.length > 100) {
      throw new ValidationError(
        "El nombre del equipo no puede exceder 100 caracteres",
      );
    }
  }

  const updatedTeam = await TeamsRepository.update(id, {
    name: data.name?.trim(),
  });

  return updatedTeam;
};

export const deleteTeam = async (id, userRole) => {
  if (userRole !== "ADMIN") {
    throw new ForbiddenError(
      "Solo los administradores pueden eliminar equipos",
    );
  }

  const team = await TeamsRepository.findById(id);

  if (!team) {
    throw new NotFoundError("Equipo no encontrado");
  }

  const deletedTeam = await TeamsRepository.remove(id);

  return deletedTeam;
};

export const addMemberToTeam = async (teamId, memberData, userId, userRole) => {
  const team = await TeamsRepository.findById(teamId);

  if (!team) {
    throw new NotFoundError("Equipo no encontrado");
  }

  const isLeader = await TeamsRepository.isLeader(teamId, userId);
  const isAdmin = userRole === "ADMIN";

  if (!isLeader && !isAdmin) {
    throw new ForbiddenError(
      "No tienes permiso para agregar miembros a este equipo",
    );
  }

  if (!memberData.userId) {
    throw new ValidationError("El ID del usuario es requerido");
  }

  if (memberData.userId === userId) {
    throw new ValidationError("No puedes invitarte a ti mismo");
  }

  const memberWithGithub = await TeamsRepository.getMemberWithGithub(
    memberData.userId,
  );

  if (!memberWithGithub || !memberWithGithub.github_username) {
    throw new ValidationError(
      "El usuario debe tener GitHub conectado para ser invitado",
    );
  }

  const currentMembers = await TeamsRepository.countTeamMembers(teamId);
  const canAddMore = isAdmin || currentMembers < MAX_TEAM_MEMBERS;

  if (!canAddMore) {
    throw new ValidationError(
      `El equipo ya tiene el máximo de ${MAX_TEAM_MEMBERS} miembros`,
    );
  }

  const invitation = await TeamsRepository.createInvitation(
    teamId,
    memberData.userId,
    userId,
  );

  try {
    const leaderWithGithub = await TeamsRepository.getLeaderWithGithub(teamId);
    const teamProject = await TeamsRepository.getTeamProject(teamId);

    console.log("[n8n] leaderWithGithub:", JSON.stringify(leaderWithGithub));
    console.log("[n8n] teamProject:", JSON.stringify(teamProject));
    console.log(
      "[n8n] memberWithGithub:",
      JSON.stringify({
        githubUsername: memberWithGithub.github_username,
        email: memberWithGithub.email,
        name: memberWithGithub.name,
      }),
    );

    if (leaderWithGithub && teamProject) {
      console.log("[n8n] Firing triggerMemberInvited...");
      await n8nService.triggerMemberInvited(
        {
          id: teamId,
          projectId: teamId,
          repoName: teamProject.repo_name,
          leaderGithubUsername: leaderWithGithub.github_username,
        },
        {
          githubUsername: memberWithGithub.github_username,
          githubToken: memberWithGithub.github_token,
          email: memberWithGithub.email,
          name: memberWithGithub.name,
          role: memberData.role || "DEVELOPER",
        },
      );
      console.log("[n8n] triggerMemberInvited OK");
    } else {
      console.warn(
        "[n8n] Skipped: leaderWithGithub=",
        leaderWithGithub,
        "teamProject=",
        teamProject,
      );
    }
  } catch (error) {
    console.error("[n8n] Error triggering member invited:", error.message);
    console.error("[n8n] Full error:", error);
  }

  return {
    ...invitation,
    message:
      "Invitación enviada. El usuario debe aceptar la invitación en GitHub y luego en la plataforma.",
  };
};

export const removeMemberFromTeam = async (
  teamId,
  memberId,
  userId,
  userRole,
) => {
  const team = await TeamsRepository.findById(teamId);

  if (!team) {
    throw new NotFoundError("Equipo no encontrado");
  }

  const isLeader = await TeamsRepository.isLeader(teamId, userId);
  const isAdmin = userRole === "ADMIN";
  const isSelf = memberId === userId;

  if (!isLeader && !isAdmin && !isSelf) {
    throw new ForbiddenError(
      "No tienes permiso para eliminar miembros de este equipo",
    );
  }

  const memberWithGithub = await TeamsRepository.getMemberWithGithub(memberId);
  const memberIsLeader = await TeamsRepository.isLeader(teamId, memberId);
  const memberCount = await TeamsRepository.countTeamMembers(teamId);

  // Si el lider se va y el equipo esta vacio (solo el), eliminar el equipo
  if (memberIsLeader && memberCount <= 1) {
    await TeamsRepository.remove(teamId);
    return {
      deleted: true,
      message: "Equipo eliminado porque el lider salio y no habia mas miembros",
    };
  }

  const member = await TeamsRepository.removeMember(teamId, memberId);

  try {
    const leaderWithGithub = await TeamsRepository.getLeaderWithGithub(teamId);
    const teamProject = await TeamsRepository.getTeamProject(teamId);

    if (memberWithGithub && leaderWithGithub && teamProject) {
      await n8nService.triggerMemberRemoved(
        {
          repoName: teamProject.repo_name,
          leaderGithubUsername: leaderWithGithub.github_username,
        },
        {
          githubUsername: memberWithGithub.github_username,
          email: memberWithGithub.email,
          name: memberWithGithub.name,
        },
      );
    }
  } catch (error) {
    console.error("Error triggering n8n member removed:", error.message);
  }

  return member;
};

export const getMyTeams = async (userId) => {
  const teams = await TeamsRepository.getMyTeams(userId);
  const pendingInvitations =
    await TeamsRepository.getPendingInvitationsByUser(userId);

  return {
    teams,
    pendingInvitations,
  };
};

export const getAvailableCoders = async (teamId, query) => {
  const team = await TeamsRepository.findById(teamId);

  if (!team) {
    throw new NotFoundError("Equipo no encontrado");
  }

  const { search, page, limit } = query;

  const pageNum = parseInt(page) || 1;
  const limitNum = parseInt(limit) || 20;

  if (pageNum < 1 || limitNum < 1 || limitNum > 100) {
    throw new ValidationError("Parámetros de paginación inválidos");
  }

  const coders = await TeamsRepository.getAvailableCoders(teamId, {
    search,
    page: pageNum,
    limit: limitNum,
  });

  const invitations = await TeamsRepository.getInvitationsByTeam(teamId);
  const invitedUserIds = invitations
    .filter((inv) => inv.status === "PENDING")
    .map((inv) => inv.id_user);

  const codersWithInvitationStatus = coders.coders.map((coder) => ({
    ...coder,
    hasPendingInvitation: invitedUserIds.includes(coder.id_user),
  }));

  return {
    coders: codersWithInvitationStatus,
    pagination: coders.pagination,
  };
};

export const getTeamMembers = async (id, userId, userRole) => {
  const team = await TeamsRepository.findById(id);

  if (!team) {
    throw new NotFoundError("Equipo no encontrado");
  }

  // Any authenticated user can view team members (needed for public team listing/discovery)
  return TeamsRepository.findByIdWithMembers(id);
};

export const getTeamInvitations = async (teamId, userId, userRole) => {
  const team = await TeamsRepository.findById(teamId);

  if (!team) {
    throw new NotFoundError("Equipo no encontrado");
  }

  const isLeader = await TeamsRepository.isLeader(teamId, userId);
  const isAdmin = userRole === "ADMIN";

  if (!isLeader && !isAdmin) {
    throw new ForbiddenError(
      "No tienes permiso para ver las invitaciones de este equipo",
    );
  }

  return TeamsRepository.getInvitationsByTeam(teamId);
};

export const getMyPendingInvitations = async (userId) => {
  return TeamsRepository.getPendingInvitationsByUser(userId);
};

export const acceptInvitation = async (invitationId, userId) => {
  const invitation = await TeamsRepository.getInvitationById(invitationId);

  if (!invitation) {
    throw new NotFoundError("Invitación no encontrada");
  }

  if (invitation.id_user !== userId) {
    throw new ForbiddenError("No puedes aceptar esta invitación");
  }

  if (invitation.status !== "PENDING") {
    throw new ValidationError("Esta invitación ya ha sido procesada");
  }

  const memberWithGithub = await TeamsRepository.getMemberWithGithub(userId);

  if (!memberWithGithub || !memberWithGithub.github_username) {
    throw new ValidationError(
      "Debes tener GitHub conectado para aceptar la invitación",
    );
  }

  const result = await TeamsRepository.acceptInvitation(invitationId, userId);

  try {
    const teamId = invitation.id_team;
    const leaderWithGithub = await TeamsRepository.getLeaderWithGithub(teamId);
    const teamProject = await TeamsRepository.getTeamProject(teamId);

    if (leaderWithGithub && teamProject?.repo_name) {
      await n8nService.triggerMemberInvited(
        {
          id: teamId,
          projectId: teamId,
          repoName: teamProject.repo_name,
          leaderGithubUsername: leaderWithGithub.github_username,
        },
        {
          githubUsername: memberWithGithub.github_username,
          githubToken: memberWithGithub.github_token,
          email: memberWithGithub.email,
          name: memberWithGithub.name,
          role: "DEVELOPER",
        },
      );
    }
  } catch (error) {
    console.error("Error triggering n8n on accept invitation:", error.message);
  }

  return result;
};

export const rejectInvitation = async (invitationId, userId) => {
  const invitation = await TeamsRepository.getInvitationById(invitationId);

  if (!invitation) {
    throw new NotFoundError("Invitación no encontrada");
  }

  if (invitation.id_user !== userId) {
    throw new ForbiddenError("No puedes rechazar esta invitación");
  }

  if (invitation.status !== "PENDING") {
    throw new ValidationError("Esta invitación ya ha sido procesada");
  }

  return TeamsRepository.rejectInvitation(invitationId, userId);
};

export const requestToJoinTeam = async (teamId, userId) => {
  const team = await TeamsRepository.findById(teamId);
  if (!team) {
    throw new NotFoundError("Equipo no encontrado");
  }

  const alreadyInTeam = await TeamsRepository.isInAnyTeam(userId);
  if (alreadyInTeam) {
    throw new ValidationError("Ya perteneces a un equipo");
  }

  const userWithGithub = await TeamsRepository.getMemberWithGithub(userId);
  if (!userWithGithub || !userWithGithub.github_username) {
    throw new ValidationError(
      "Debes tener GitHub conectado para solicitar unirte a un equipo",
    );
  }

  const currentMembers = await TeamsRepository.countTeamMembers(teamId);
  if (currentMembers >= MAX_TEAM_MEMBERS) {
    throw new ValidationError(
      `El equipo ya tiene el máximo de ${MAX_TEAM_MEMBERS} miembros`,
    );
  }

  return TeamsRepository.createJoinRequest(teamId, userId);
};

export const getTeamJoinRequests = async (teamId, userId, userRole) => {
  const isLeaderOrAdmin = await TeamsRepository.isLeader(teamId, userId);
  const isAdmin = userRole === "ADMIN";

  if (!isLeaderOrAdmin && !isAdmin) {
    throw new ForbiddenError("No tienes permiso para ver las solicitudes");
  }

  const all = await TeamsRepository.getJoinRequestsByTeam(teamId);
  return all.filter((r) => r.status === "PENDING");
};

export const cancelJoinRequest = async (requestId, userId) => {
  return TeamsRepository.cancelJoinRequest(requestId, userId);
};

export const getMyPendingJoinRequests = async (userId) => {
  return TeamsRepository.getMyPendingJoinRequests(userId);
};

export const acceptJoinRequest = async (requestId, userId, userRole) => {
  const request = await TeamsRepository.getJoinRequestById(requestId);
  if (!request) {
    throw new NotFoundError("Solicitud no encontrada");
  }

  const isLeaderOrAdmin = await TeamsRepository.isLeader(
    request.id_team,
    userId,
  );
  const isAdmin = userRole === "ADMIN";

  if (!isLeaderOrAdmin && !isAdmin) {
    throw new ForbiddenError("No tienes permiso para aceptar esta solicitud");
  }

  const result = await TeamsRepository.acceptJoinRequest(requestId);

  // Trigger n8n to add the member to the GitHub repo (same as acceptInvitation)
  try {
    const teamId = request.id_team;
    const memberWithGithub = await TeamsRepository.getMemberWithGithub(
      request.id_user,
    );
    const leaderWithGithub = await TeamsRepository.getLeaderWithGithub(teamId);
    const teamProject = await TeamsRepository.getTeamProject(teamId);

    if (
      memberWithGithub?.github_username &&
      leaderWithGithub &&
      teamProject?.repo_name
    ) {
      await n8nService.triggerMemberInvited(
        {
          id: teamId,
          projectId: teamId,
          repoName: teamProject.repo_name,
          leaderGithubUsername: leaderWithGithub.github_username,
        },
        {
          githubUsername: memberWithGithub.github_username,
          githubToken: memberWithGithub.github_token,
          email: memberWithGithub.email,
          name: memberWithGithub.name,
          role: "DEVELOPER",
        },
      );
    }
  } catch (error) {
    console.error("Error triggering n8n on acceptJoinRequest:", error.message);
  }

  return result;
};

export const rejectJoinRequest = async (requestId, userId, userRole) => {
  const request = await TeamsRepository.getJoinRequestById(requestId);
  if (!request) {
    throw new NotFoundError("Solicitud no encontrada");
  }

  const isLeaderOrAdmin = await TeamsRepository.isLeader(
    request.id_team,
    userId,
  );
  const isAdmin = userRole === "ADMIN";

  if (!isLeaderOrAdmin && !isAdmin) {
    throw new ForbiddenError("No tienes permiso para rechazar esta solicitud");
  }

  return TeamsRepository.rejectJoinRequest(requestId);
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
  rejectInvitation,
  requestToJoinTeam,
  getTeamJoinRequests,
  getMyPendingJoinRequests,
  acceptJoinRequest,
  rejectJoinRequest,
  cancelJoinRequest,
};
