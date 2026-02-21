import bcrypt from 'bcryptjs';
import UsersRepository from './users.repository.js';
import { ValidationError, NotFoundError, ConflictError, ForbiddenError } from '../../middleware/errorHandler.js';

const SALT_ROUNDS = 12;

const VALID_ROLES = ['ADMIN', 'CODER', 'TL_DEVELOPMENT', 'TL_SOFT_SKILLS', 'TL_ENGLISH', 'STAFF'];

const validateRole = (role) => {
  if (!VALID_ROLES.includes(role)) {
    throw new ValidationError(`Rol inválido. Roles válidos: ${VALID_ROLES.join(', ')}`);
  }
};

export const listUsers = async (filters = {}, pagination = {}) => {
  const { role, clan, isActive, search } = filters;
  const { page = 1, limit = 10 } = pagination;

  if (role) {
    validateRole(role);
  }

  if (typeof isActive === 'string') {
    filters.isActive = isActive === 'true';
  }

  const result = await UsersRepository.findAll({
    role,
    clan,
    isActive: filters.isActive,
    search,
    page: parseInt(page, 10),
    limit: parseInt(limit, 10)
  });

  return result;
};

export const getUser = async (id) => {
  const user = await UsersRepository.findById(id);

  if (!user) {
    throw new NotFoundError('Usuario no encontrado');
  }

  return user;
};

export const createUser = async (userData) => {
  const { name, email, password, role = 'CODER', documentNumber, documentType = 'CC', clan } = userData;

  if (!name || !email || !documentNumber) {
    throw new ValidationError('Nombre, email y número de documento son requeridos');
  }

  validateRole(role);

  const existingEmail = await UsersRepository.findByEmail(email);
  if (existingEmail) {
    throw new ConflictError('El email ya está registrado');
  }

  const existingDocument = await UsersRepository.findByDocument(documentNumber);
  if (existingDocument) {
    throw new ConflictError('El número de documento ya está registrado');
  }

  const finalPassword = password || documentNumber.toString();

  if (finalPassword.length < 6) {
    throw new ValidationError('La contraseña debe tener al menos 6 caracteres');
  }

  const passwordHash = await bcrypt.hash(finalPassword, SALT_ROUNDS);

  const user = await UsersRepository.create({
    name,
    email,
    passwordHash,
    role,
    documentNumber,
    documentType,
    clan
  });

  return {
    ...user,
    passwordGenerated: !password
  };
};

export const updateUser = async (id, updateData) => {
  const user = await UsersRepository.findById(id);

  if (!user) {
    throw new NotFoundError('Usuario no encontrado');
  }

  const { name, email, documentNumber, documentType, clan } = updateData;

  if (email && email.toLowerCase() !== user.email) {
    const existingEmail = await UsersRepository.findByEmail(email, id);
    if (existingEmail) {
      throw new ConflictError('El email ya está registrado por otro usuario');
    }
  }

  if (documentNumber && documentNumber !== user.document_number) {
    const existingDocument = await UsersRepository.findByDocument(documentNumber, id);
    if (existingDocument) {
      throw new ConflictError('El número de documento ya está registrado por otro usuario');
    }
  }

  const updatedUser = await UsersRepository.update(id, {
    name,
    email,
    documentNumber,
    documentType,
    clan
  });

  return updatedUser;
};

export const changePassword = async (id, newPassword) => {
  if (!newPassword || newPassword.length < 6) {
    throw new ValidationError('La nueva contraseña debe tener al menos 6 caracteres');
  }

  const user = await UsersRepository.findById(id);

  if (!user) {
    throw new NotFoundError('Usuario no encontrado');
  }

  const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  await UsersRepository.updatePassword(id, passwordHash);

  return { message: 'Contraseña actualizada exitosamente' };
};

export const toggleUserStatus = async (id, isActive, requesterId) => {
  if (parseInt(id, 10) === parseInt(requesterId, 10)) {
    throw new ForbiddenError('No puedes desactivar tu propia cuenta');
  }

  const user = await UsersRepository.findById(id);

  if (!user) {
    throw new NotFoundError('Usuario no encontrado');
  }

  const updatedUser = await UsersRepository.toggleStatus(id, isActive);

  return updatedUser;
};

export const getAvailableCoders = async (filters = {}, pagination = {}) => {
  const { search } = filters;
  const { page = 1, limit = 20 } = pagination;

  const result = await UsersRepository.findAvailableCoders({
    search,
    page: parseInt(page, 10),
    limit: parseInt(limit, 10)
  });

  return result;
};

export const getMe = async (userId) => {
  const user = await UsersRepository.findById(userId);

  if (!user) {
    throw new NotFoundError('Usuario no encontrado');
  }

  return user;
};

export const getUserStats = async () => {
  const stats = await UsersRepository.getStats();
  return stats;
};

export default {
  listUsers,
  getUser,
  createUser,
  updateUser,
  changePassword,
  toggleUserStatus,
  getAvailableCoders,
  getMe,
  getUserStats
};
