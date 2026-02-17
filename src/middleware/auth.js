import { verifyToken } from '../utils/jwt.js';
import { error } from '../utils/response.js';
import { UnauthorizedError } from './errorHandler.js';

export const authenticate = async (req, res, next) => {
  try {
    let token = null;

    if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    } else if (req.headers.authorization) {
      const parts = req.headers.authorization.split(' ');
      if (parts.length === 2 && parts[0] === 'Bearer') {
        token = parts[1];
      }
    }

    if (!token) {
      throw new UnauthorizedError('Token de autenticación requerido');
    }

    const decoded = verifyToken(token);

    req.user = {
      id_user: decoded.id_user,
      email: decoded.email,
      role: decoded.role,
      name: decoded.name
    };

    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return error(res, 'Token expirado', 401);
    }
    if (err.name === 'JsonWebTokenError') {
      return error(res, 'Token inválido', 401);
    }
    return error(res, err.message || 'No autorizado', 401);
  }
};

export const optionalAuth = async (req, res, next) => {
  try {
    let token = null;

    if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    } else if (req.headers.authorization) {
      const parts = req.headers.authorization.split(' ');
      if (parts.length === 2 && parts[0] === 'Bearer') {
        token = parts[1];
      }
    }

    if (token) {
      const decoded = verifyToken(token);
      req.user = {
        id_user: decoded.id_user,
        email: decoded.email,
        role: decoded.role,
        name: decoded.name
      };
    }

    next();
  } catch (err) {
    next();
  }
};

export const requireAuth = authenticate;
