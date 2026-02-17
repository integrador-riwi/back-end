import { error } from '../utils/response.js';
import { ForbiddenError } from './errorHandler.js';

export const hasRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return error(res, 'Usuario no autenticado', 401);
    }

    if (!allowedRoles.includes(req.user.role)) {
      return error(res, 'No tienes permisos para realizar esta acción', 403);
    }

    next();
  };
};

export const isAdmin = hasRole('ADMIN');

export const isTeamLead = hasRole('TL_DEVELOPMENT', 'TL_SOFT_SKILLS', 'TL_ENGLISH');

export const isCoder = hasRole('CODER');

export const isStaff = hasRole('STAFF');

export const isAdminOrTeamLead = hasRole('ADMIN', 'TL_DEVELOPMENT', 'TL_SOFT_SKILLS', 'TL_ENGLISH');

export const canEvaluate = hasRole('ADMIN', 'TL_DEVELOPMENT', 'TL_SOFT_SKILLS', 'TL_ENGLISH');

export const canManageEvents = hasRole('ADMIN');

export const canManageTeams = hasRole('ADMIN', 'CODER');

export const canViewProjects = hasRole('ADMIN', 'CODER', 'TL_DEVELOPMENT', 'TL_SOFT_SKILLS', 'TL_ENGLISH', 'STAFF');

export const isOwnerOrAdmin = (req, res, next) => {
  if (!req.user) {
    return error(res, 'Usuario no autenticado', 401);
  }

  const resourceUserId = parseInt(req.params.userId || req.params.id_user || req.body.user_id);
  
  if (req.user.role === 'ADMIN' || req.user.id_user === resourceUserId) {
    return next();
  }

  return error(res, 'No tienes permisos para acceder a este recurso', 403);
};

export const isTeamLeaderOrAdmin = async (req, res, next) => {
  if (!req.user) {
    return error(res, 'Usuario no autenticado', 401);
  }

  if (req.user.role === 'ADMIN') {
    return next();
  }

  const teamId = parseInt(req.params.teamId || req.params.id_team || req.body.id_team);
  
  if (!teamId) {
    return error(res, 'ID de equipo requerido', 400);
  }

  next();
};
