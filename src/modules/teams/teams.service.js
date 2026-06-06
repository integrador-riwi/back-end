import TeamsRepository from "./teams.repository.js";
import ProjectsRepository from "../projects/projects.repository.js";
import n8nService from "../../integrations/n8n.service.js";
import {
  NotFoundError,
  ForbiddenError,
  ValidationError,
} from "../../middleware/errorHandler.js";
import {
  emitInvitationCreated,
  emitJoinRequestCreated,
  emitInvitationAccepted,
  emitInvitationRejected,
  emitJoinRequestAccepted,
  emitJoinRequestRejected,
  emitMemberRemoved,
} from "../../socket/notifications.js";

const slugify = (str) =>
  str
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

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

  if (!data.description || data.description.trim().length === 0) {
    throw new ValidationError("La descripción del proyecto es requerida");
  }

  if (data.description.trim().length < 10) {
    throw new ValidationError(
      "La descripción del proyecto debe tener al menos 10 caracteres",
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

  // Idempotencia: si ya es líder de un equipo en el MISMO evento, devolver ese
  const existingTeam = await TeamsRepository.findLeaderTeam(
    leaderId,
    data.idEvent ?? null,
  );
  if (existingTeam && existingTeam.id_event === data.idEvent) {
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
    idEvent: data.idEvent ?? null,
  });

  try {
    const repoName = `${team.id_team}-${slugify(data.name)}`;

    // Fetch event to get githubOrg if provided
    let githubOrg = null;
    let githubOrgToken = null;
    if (data.idEvent) {
      try {
        const { findById: findEvent } =
          await import("../events/events.repository.js");
        const event = await findEvent(data.idEvent);
        githubOrg = event?.github_org ?? null;
        githubOrgToken = event?.github_org_token ?? null;
      } catch (_) {}
    }

    const n8nResponse = await n8nService.triggerProjectCreated(
      {
        id: team.id_team,
        name: data.name.trim(),
        githubOrg,
      },
      {
        githubUsername: leaderWithGithub.github_username,
        githubToken: githubOrgToken ?? leaderWithGithub.github_token,
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
  const { search, page, limit, idEvent, includeSubmitted, includeClosed } =
    query;

  const pageNum = parseInt(page) || 1;
  const limitNum = parseInt(limit) || 10;

  if (pageNum < 1 || limitNum < 1 || limitNum > 100) {
    throw new ValidationError("Parámetros de paginación inválidos");
  }

  return TeamsRepository.findAll({
    search,
    page: pageNum,
    limit: limitNum,
    idEvent,
    includeSubmitted: includeSubmitted === "true" || includeSubmitted === true,
    includeClosed: includeClosed === "true" || includeClosed === true,
  });
};

export const getTeamById = async (id, userId, userRole) => {
  const team = await TeamsRepository.findByIdWithMembers(id);

  if (!team) {
    throw new NotFoundError("Equipo no encontrado");
  }

  const isMember = await TeamsRepository.isMember(id, userId);
  const isAdmin = userRole === "ADMIN";
  const isTL = ["TL_DEVELOPMENT", "TL_SOFT_SKILLS", "TL_ENGLISH"].includes(
    userRole,
  );

  if (!isMember && !isAdmin && !isTL) {
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

export const closeTeam = async (id, userId, userRole) => {
  const team = await TeamsRepository.findById(id);

  if (!team) {
    throw new NotFoundError("Equipo no encontrado");
  }

  const isLeader = await TeamsRepository.isLeader(id, userId);
  const isAdmin = userRole === "ADMIN";

  if (!isLeader && !isAdmin) {
    throw new ForbiddenError("No tienes permiso para cerrar este equipo");
  }

  if (team.closed_at) {
    return team;
  }

  return TeamsRepository.close(id);
};

export const reopenTeam = async (id, userId, userRole) => {
  const team = await TeamsRepository.findById(id);

  if (!team) {
    throw new NotFoundError("Equipo no encontrado");
  }

  const isLeader = await TeamsRepository.isLeader(id, userId);
  const isAdmin = userRole === "ADMIN";

  if (!isLeader && !isAdmin) {
    throw new ForbiddenError("No tienes permiso para reabrir este equipo");
  }

  if (!team.closed_at) {
    return team;
  }

  return TeamsRepository.reopen(id);
};

export const addMemberToTeam = async (teamId, memberData, userId, userRole) => {
  const team = await TeamsRepository.findById(teamId);

  if (!team) {
    throw new NotFoundError("Equipo no encontrado");
  }

  if (team.closed_at) {
    throw new ForbiddenError("El equipo está cerrado y no acepta nuevos miembros");
  }

  const isLeader = await TeamsRepository.isLeader(teamId, userId);
  const isAdmin = userRole === "ADMIN";

  if (!isLeader && !isAdmin) {
    throw new ForbiddenError(
      "No tienes permiso para agregar miembros a este equipo",
    );
  }

  // Block if project has been submitted
  const project = await ProjectsRepository.findByTeamId(teamId);
  if (project?.submitted_at) {
    throw new ForbiddenError(
      "El proyecto ya fue entregado. No se pueden agregar miembros.",
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
  const eventMaxSize = await TeamsRepository.getTeamEventMaxSize(teamId);
  const canAddMore = isAdmin || currentMembers < eventMaxSize;

  if (!canAddMore) {
    throw new ValidationError(
      `El equipo ya tiene el máximo de ${eventMaxSize} miembros`,
    );
  }

  const invitation = await TeamsRepository.createInvitation(
    teamId,
    memberData.userId,
    userId,
  );

  // Emit socket notification immediately — don't wait for n8n
  try {
    let eventName = "Event";
    if (team?.id_event) {
      try {
        const { findById } = await import("../events/events.repository.js");
        const event = await findById(team.id_event);
        eventName = event?.event_name || "Event";
      } catch (_) {}
    }
    emitInvitationCreated(invitation, team, memberWithGithub, eventName);
  } catch (err) {
    console.error("[Socket] Error sending notification:", err.message);
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

  // Block if project has been submitted (admins can still remove)
  if (!isAdmin) {
    const project = await ProjectsRepository.findByTeamId(teamId);
    if (project?.submitted_at) {
      throw new ForbiddenError(
        "El proyecto ya fue entregado. No puedes salirte ni modificar el equipo.",
      );
    }
  }

  const memberWithGithub = await TeamsRepository.getMemberWithGithub(memberId);
  const memberIsLeader = await TeamsRepository.isLeader(teamId, memberId);
  const memberCount = await TeamsRepository.countTeamMembers(teamId);

  // Si el líder intenta salir pero hay otros miembros, bloquearlo
  if (memberIsLeader && memberCount > 1) {
    throw new ForbiddenError(
      "No puedes salir del equipo siendo líder si hay otros miembros. Expúlsalos primero.",
    );
  }

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

    if (memberWithGithub && leaderWithGithub) {
      const githubOrgRemove = await TeamsRepository.getTeamGithubOrg(teamId);
      const allRepoNames = await TeamsRepository.getAllTeamRepoNames(teamId);
      for (const repoName of allRepoNames) {
        await n8nService.triggerMemberRemoved(
          {
            repoName,
            leaderGithubUsername: leaderWithGithub.github_username,
            leaderToken: leaderWithGithub.github_token,
            githubOrg: githubOrgRemove,
          },
          {
            githubUsername: memberWithGithub.github_username,
            email: memberWithGithub.email,
            name: memberWithGithub.name,
          },
        );
      }
    }
  } catch (error) {
    console.error("Error triggering n8n member removed:", error.message);
  }

  try {
    emitMemberRemoved(team, memberWithGithub);
  } catch (err) {
    console.error(
      "[Socket] Error sending member removed notification:",
      err.message,
    );
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

  const team = await TeamsRepository.findById(invitation.id_team);
  if (team?.closed_at) {
    throw new ValidationError("El equipo está cerrado y no acepta nuevos miembros");
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

    if (leaderWithGithub) {
      const { githubOrg: githubOrg2, githubOrgToken: githubOrgToken2 } =
        await TeamsRepository.getTeamGithubOrgWithToken(teamId);
      const allRepoNames = await TeamsRepository.getAllTeamRepoNames(teamId);
      for (const repoName of allRepoNames) {
        await n8nService.triggerMemberInvited(
          {
            id: teamId,
            projectId: teamId,
            repoName,
            leaderGithubUsername: leaderWithGithub.github_username,
            leaderToken: githubOrgToken2 ?? leaderWithGithub.github_token,
            githubOrg: githubOrg2,
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
    }
  } catch (error) {
    console.error("Error triggering n8n on accept invitation:", error.message);
  }

  try {
    const user = await TeamsRepository.getMemberWithGithub(userId);
    emitInvitationAccepted(invitation, team, user);
  } catch (err) {
    console.error("[Socket] Error sending accept notification:", err.message);
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

  const result = await TeamsRepository.rejectInvitation(invitationId, userId);

  try {
    const team = await TeamsRepository.findById(invitation.id_team);
    const user = await TeamsRepository.getMemberWithGithub(userId);
    emitInvitationRejected(invitation, team, user);
  } catch (err) {
    console.error("[Socket] Error sending reject notification:", err.message);
  }

  return result;
};

export const requestToJoinTeam = async (teamId, userId) => {
  const team = await TeamsRepository.findById(teamId);
  if (!team) {
    throw new NotFoundError("Equipo no encontrado");
  }

  if (team.closed_at) {
    throw new ValidationError("El equipo está cerrado y no acepta solicitudes");
  }

  const alreadyInTeam = await TeamsRepository.isInAnyTeam(
    userId,
    team.id_event ?? null,
  );
  if (alreadyInTeam) {
    throw new ValidationError("Ya perteneces a un equipo en este evento");
  }

  const userWithGithub = await TeamsRepository.getMemberWithGithub(userId);
  if (!userWithGithub || !userWithGithub.github_username) {
    throw new ValidationError(
      "Debes tener GitHub conectado para solicitar unirte a un equipo",
    );
  }

  const currentMembers = await TeamsRepository.countTeamMembers(teamId);
  const eventMaxSize = await TeamsRepository.getTeamEventMaxSize(teamId);
  if (currentMembers >= eventMaxSize) {
    throw new ValidationError(
      `El equipo ya tiene el máximo de ${eventMaxSize} miembros`,
    );
  }

  const request = await TeamsRepository.createJoinRequest(teamId, userId);

  try {
    let eventName = "Event";
    if (team?.id_event) {
      try {
        const { findById: findEvent } =
          await import("../events/events.repository.js");
        const event = await findEvent(team.id_event);
        eventName = event?.event_name || "Event";
      } catch (_) {}
    }
    const coder = await TeamsRepository.getMemberWithGithub(userId);

    emitJoinRequestCreated(request, team, coder, eventName);
  } catch (err) {
    console.error(
      "[Socket] Error sending join request notification:",
      err.message,
    );
  }

  return request;
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

  const team = await TeamsRepository.findById(request.id_team);
  if (team?.closed_at) {
    throw new ValidationError("El equipo está cerrado y no acepta nuevos miembros");
  }

  const result = await TeamsRepository.acceptJoinRequest(requestId);

  // Trigger n8n to add the member to the GitHub repo (same as acceptInvitation)
  try {
    const teamId = request.id_team;
    const memberWithGithub = await TeamsRepository.getMemberWithGithub(
      request.id_user,
    );
    const leaderWithGithub = await TeamsRepository.getLeaderWithGithub(teamId);

    if (memberWithGithub?.github_username && leaderWithGithub) {
      const { githubOrg: githubOrg3, githubOrgToken: githubOrgToken3 } =
        await TeamsRepository.getTeamGithubOrgWithToken(teamId);
      const allRepoNames = await TeamsRepository.getAllTeamRepoNames(teamId);
      for (const repoName of allRepoNames) {
        await n8nService.triggerMemberInvited(
          {
            id: teamId,
            projectId: teamId,
            repoName,
            leaderGithubUsername: leaderWithGithub.github_username,
            leaderToken: githubOrgToken3 ?? leaderWithGithub.github_token,
            githubOrg: githubOrg3,
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
    }
  } catch (error) {
    console.error("Error triggering n8n on acceptJoinRequest:", error.message);
  }

  try {
    const team = await TeamsRepository.findById(request.id_team);
    const coder = await TeamsRepository.getMemberWithGithub(request.id_user);
    emitJoinRequestAccepted(request, team, coder);
  } catch (err) {
    console.error(
      "[Socket] Error sending join request accept notification:",
      err.message,
    );
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

  const result = await TeamsRepository.rejectJoinRequest(requestId);

  try {
    const team = await TeamsRepository.findById(request.id_team);
    const coder = await TeamsRepository.getMemberWithGithub(request.id_user);
    emitJoinRequestRejected(request, team, coder);
  } catch (err) {
    console.error(
      "[Socket] Error sending join request reject notification:",
      err.message,
    );
  }

  return result;
};

export const createAdditionalRepo = async (teamId, data, userId, userRole) => {
  const team = await TeamsRepository.findById(teamId);
  if (!team) throw new NotFoundError("Equipo no encontrado");

  const isLeader = await TeamsRepository.isLeader(teamId, userId);
  if (!isLeader && userRole !== "ADMIN") {
    throw new ForbiddenError("Solo el líder puede agregar repos adicionales");
  }

  const leaderWithGithub = await TeamsRepository.getMemberWithGithub(userId);
  if (!leaderWithGithub?.github_username) {
    throw new ValidationError("Debes tener GitHub conectado");
  }

  const label = data.label?.trim();
  if (!label) {
    throw new ValidationError("El label es requerido para crear un repositorio adicional");
  }
  if (label.length > 50) {
    throw new ValidationError("El label no puede exceder 50 caracteres");
  }
  const repoName = `${teamId}-${slugify(team.name)}-${slugify(label)}`;

  let githubOrg = null;
  let githubOrgToken = null;
  if (team.id_event) {
    try {
      const { findById: findEvent } = await import("../events/events.repository.js");
      const event = await findEvent(team.id_event);
      githubOrg = event?.github_org ?? null;
      githubOrgToken = event?.github_org_token ?? null;
    } catch (_) {}
  }

  let repoUrl = null;
  let savedRepoName = repoName;

  try {
    const n8nResponse = await n8nService.triggerSecondaryRepo(
      { teamId, projectId: team.id_project ?? null, teamName: team.name, repoName, label, githubOrg },
      {
        githubUsername: leaderWithGithub.github_username,
        githubToken: githubOrgToken ?? leaderWithGithub.github_token,
        githubPersonalToken: leaderWithGithub.github_token,
      },
    );
    const n8nData = n8nResponse?.data?.data ?? n8nResponse?.data ?? null;
    if (n8nData) {
      repoUrl = n8nData.repositoryUrl || n8nData.repository_url || null;
      savedRepoName = n8nData.repositoryName || repoName;
    }
  } catch (error) {
    console.error("[n8n] secondary-repo error:", error.message);
  }

  const repo = await TeamsRepository.createAdditionalRepo(teamId, {
    repoName: savedRepoName,
    repoUrl,
    label,
  });

  // Sync existing members to the new repo (fire-and-forget — don't block response)
  TeamsRepository.getTeamMembersWithGithub(teamId)
    .then((allMembers) => {
      const nonLeaders = allMembers.filter(
        (m) => m.team_role !== "LEADER" && m.github_username && m.github_token,
      );
      for (const member of nonLeaders) {
        n8nService
          .triggerMemberInvited(
            {
              id: teamId,
              projectId: teamId,
              repoName: savedRepoName,
              leaderGithubUsername: leaderWithGithub.github_username,
              leaderToken: githubOrgToken ?? leaderWithGithub.github_token,
              githubOrg,
            },
            {
              githubUsername: member.github_username,
              githubToken: member.github_token,
              email: member.email,
              name: member.name,
              role: "DEVELOPER",
            },
          )
          .catch((e) =>
            console.error("[n8n] member sync error:", member.github_username, e.message),
          );
      }
    })
    .catch((e) => console.error("[n8n] sync existing members fetch error:", e.message));

  return repo;
};

export const listAllRepos = async (teamId, userId, userRole) => {
  const team = await TeamsRepository.findById(teamId);
  if (!team) throw new NotFoundError("Equipo no encontrado");

  const isMember = await TeamsRepository.isMember(teamId, userId);
  const isAdmin = userRole === "ADMIN";
  const isTL = ["TL_DEVELOPMENT", "TL_SOFT_SKILLS", "TL_ENGLISH"].includes(userRole);

  if (!isMember && !isAdmin && !isTL) {
    throw new ForbiddenError("No tienes acceso a este equipo");
  }

  const primary = await TeamsRepository.getTeamProject(teamId);
  const additional = await TeamsRepository.getAdditionalRepos(teamId);

  return {
    primary: primary || null,
    additional,
  };
};

export const deleteAdditionalRepo = async (teamId, repoId, userId, userRole) => {
  const team = await TeamsRepository.findById(teamId);
  if (!team) throw new NotFoundError("Equipo no encontrado");

  const isLeader = await TeamsRepository.isLeader(teamId, userId);
  if (!isLeader && userRole !== "ADMIN") {
    throw new ForbiddenError("Solo el líder puede eliminar repos adicionales");
  }

  const deleted = await TeamsRepository.deleteAdditionalRepo(repoId, teamId);
  if (!deleted) throw new NotFoundError("Repo adicional no encontrado");

  try {
    const leaderWithGithub = await TeamsRepository.getLeaderWithGithub(teamId);
    const allMembers = await TeamsRepository.getTeamMembersWithGithub(teamId);
    const githubOrg = await TeamsRepository.getTeamGithubOrg(teamId);

    if (leaderWithGithub) {
      for (const member of allMembers) {
        if (!member.github_username) continue;
        await n8nService.triggerMemberRemoved(
          {
            repoName: deleted.repo_name,
            leaderGithubUsername: leaderWithGithub.github_username,
            leaderToken: leaderWithGithub.github_token,
            githubOrg,
          },
          {
            githubUsername: member.github_username,
            email: member.email,
            name: member.name,
          },
        );
      }
    }
  } catch (error) {
    console.error("[n8n] revoke members on repo delete error:", error.message);
  }

  return deleted;
};

export default {
  createTeam,
  listTeams,
  getTeamById,
  getTeamSimple,
  updateTeam,
  deleteTeam,
  closeTeam,
  reopenTeam,
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
  createAdditionalRepo,
  listAllRepos,
  deleteAdditionalRepo,
};
