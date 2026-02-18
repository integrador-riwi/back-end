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
      throw new UnauthorizedError('Authentication token required');
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
      return error(res, 'Token expired', 401);
    }
    if (err.name === 'JsonWebTokenError') {
      return error(res, 'Invalid token', 401);
    }
    return error(res, err.message || 'Unauthorized', 401);
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
