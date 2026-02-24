import TeamsService from './teams.service.js';
import { success, created } from '../../utils/response.js';
import { asyncHandler } from '../../middleware/errorHandler.js';
// Google AI Search By Description
import { searchProjectByDescription } from '../../integrations/Google AI/searchService.js'

export const create = asyncHandler(async (req, res) => {
  const { name } = req.body;
  const userId = req.user.id_user;
  const userRole = req.user.role;

  const team = await TeamsService.createTeam({ name }, userId, userRole);

  return created(res, team);
});

export const list = asyncHandler(async (req, res) => {
  const { search, page, limit } = req.query;

  const result = await TeamsService.listTeams({ search, page, limit });

  return success(res, result);
});

export const get = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id_user;
  const userRole = req.user.role;

  const team = await TeamsService.getTeamById(id, userId, userRole);

  return success(res, team);
});

export const getSimple = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const team = await TeamsService.getTeamSimple(id);

  return success(res, team);
});

export const update = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name } = req.body;
  const userId = req.user.id_user;
  const userRole = req.user.role;

  const team = await TeamsService.updateTeam(id, { name }, userId, userRole);

  return success(res, team);
});

export const remove = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userRole = req.user.role;

  await TeamsService.deleteTeam(id, userRole);

  return success(res, { message: 'Equipo eliminado correctamente' });
});

export const addMember = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { userId, role } = req.body;
  const userIdCurrent = req.user.id_user;
  const userRole = req.user.role;

  const member = await TeamsService.addMemberToTeam(
    id,
    { userId, role },
    userIdCurrent,
    userRole
  );

  return success(res, member);
});

export const removeMember = asyncHandler(async (req, res) => {
  const { id, userId } = req.params;
  const userIdCurrent = req.user.id_user;
  const userRole = req.user.role;

  await TeamsService.removeMemberFromTeam(id, parseInt(userId), userIdCurrent, userRole);

  return success(res, { message: 'Miembro eliminado del equipo' });
});

export const getMembers = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id_user;
  const userRole = req.user.role;

  const team = await TeamsService.getTeamMembers(id, userId, userRole);

  return success(res, team);
});

export const getMyTeams = asyncHandler(async (req, res) => {
  const userId = req.user.id_user;

  const teams = await TeamsService.getMyTeams(userId);

  return success(res, teams);
});

export const getAvailable = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { search, page, limit } = req.query;

  const result = await TeamsService.getAvailableCoders(id, { search, page, limit });

  return success(res, result);
});

export const getTeamInvitations = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id_user;
  const userRole = req.user.role;

  const invitations = await TeamsService.getTeamInvitations(id, userId, userRole);

  return success(res, invitations);
});

export const getMyInvitations = asyncHandler(async (req, res) => {
  const userId = req.user.id_user;

  const invitations = await TeamsService.getMyPendingInvitations(userId);

  return success(res, invitations);
});

export const acceptInvitation = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id_user;

  const result = await TeamsService.acceptInvitation(parseInt(id), userId);

  return success(res, { message: 'Te has unido al equipo correctamente', ...result });
});

export const rejectInvitation = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id_user;

  const result = await TeamsService.rejectInvitation(parseInt(id), userId);

  return success(res, { message: 'Invitación rechazada', ...result });
});

// AI Google Search by Description
export const searchProjects = asyncHandler( async (req, res) => {
  const { q, limit } = req.query

  if (!q || q.trim() === '') {
    return res.status(400).json({
      success: false,
      message: 'El parámetro de búsqueda "q" es requerido'
    })
  }

  try {
    const results = await searchProjectByDescription(q.trim(), limit ? parseInt(limit) : 5)

    return res.status(200).json({
      success: true,
      query: q,
      total: results.length,
      data: results
    })
  } catch (err) {
    console.error('❌ Error en búsqueda semántica:', err.message)
    return res.status(500).json({
      success: false,
      message: 'Error al procesar la búsqueda'
    })
  }
})

export default {
  create,
  list,
  get,
  getSimple,
  update,
  remove,
  addMember,
  removeMember,
  getMembers,
  getMyTeams,
  getAvailable,
  getTeamInvitations,
  getMyInvitations,
  acceptInvitation,
  rejectInvitation,
  searchProjects
};
