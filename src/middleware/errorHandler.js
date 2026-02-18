import config from '../config/env.js';

export class AppError extends Error {
  constructor(message, status = 400, code = null) {
    super(message);
    this.status = status;
    this.code = code;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message) {
    super(message, 400, 'VALIDATION_ERROR');
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Access denied') {
    super(message, 403, 'FORBIDDEN');
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 404, 'NOT_FOUND');
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Conflict with existing resource') {
    super(message, 409, 'CONFLICT');
  }
}

export class DatabaseError extends AppError {
  constructor(message = 'Database error') {
    super(message, 500, 'DATABASE_ERROR');
  }
}

const handlePgError = (err) => {
  switch (err.code) {
    case '23505':
      return new ConflictError('The resource already exists.');
    case '23503':
      return new NotFoundError('Related resource not found');
    case '23502':
      return new ValidationError('Required field missing');
    case '08006':
    case '08001':
      return new DatabaseError('Database connection error');
    default:
      return new DatabaseError(err.message);
  }
};

export const errorHandler = (err, req, res, next) => {
  let error = err;

  if (err.code && typeof err.code === 'string' && err.code.length === 5) {
    error = handlePgError(err);
  }

  const status = error.status || 500;
  const message = error.message || 'Internal server error';
  const code = error.code || 'INTERNAL_ERROR';

  console.error(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  console.error(`Status: ${status} | Code: ${code} | Message: ${message}`);
  if (config.nodeEnv === 'development') {
    console.error(err.stack);
  }

  res.status(status).json({
    success: false,
    error: message,
    code,
    ...(config.nodeEnv === 'development' && { stack: err.stack })
  });
};

export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
