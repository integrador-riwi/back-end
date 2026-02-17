import bcrypt from 'bcryptjs';
import AuthRepository from './auth.repository.js';
import { generateToken, generateRefreshToken } from '../../utils/jwt.js';
import { ValidationError, UnauthorizedError, NotFoundError, ConflictError } from '../../middleware/errorHandler.js';
import config from '../../config/env.js';

const SALT_ROUNDS = 12;

export const register = async (userData) => {
  const { name, email, password, role = 'CODER', documentNumber, documentType = 'CC', clan } = userData;

  if (!name || !email || !documentNumber) {
    throw new ValidationError('Nombre, email y número de documento son requeridos');
  }

  const finalPassword = password || documentNumber.toString();

  if (finalPassword.length < 6) {
    throw new ValidationError('La contraseña debe tener al menos 6 caracteres');
  }

  const existingUser = await AuthRepository.findByEmail(email);
  if (existingUser) {
    throw new ConflictError('El email ya está registrado');
  }

  const existingDocument = await AuthRepository.findByDocument(documentNumber);
  if (existingDocument) {
    throw new ConflictError('El número de documento ya está registrado');
  }

  const passwordHash = await bcrypt.hash(finalPassword, SALT_ROUNDS);

  const user = await AuthRepository.create({
    name,
    email,
    passwordHash,
    role,
    documentNumber,
    documentType,
    clan
  });

  await AuthRepository.createProfile(user.id_user, { clan });

  const token = generateToken({
    id_user: user.id_user,
    email: user.email,
    role: user.role,
    name: user.name
  });

  const refreshToken = generateRefreshToken({
    id_user: user.id_user
  });

  return {
    user: {
      id_user: user.id_user,
      name: user.name,
      email: user.email,
      role: user.role
    },
    token,
    refreshToken
  };
};

export const login = async (email, password) => {
  if (!email || !password) {
    throw new ValidationError('Email y contraseña son requeridos');
  }

  const user = await AuthRepository.findByEmail(email);
  
  if (!user) {
    throw new UnauthorizedError('Credenciales inválidas');
  }

  if (user.is_active === false) {
    throw new UnauthorizedError('Usuario desactivado');
  }

  const passwordMatch = await bcrypt.compare(password, user.encrypted_password || '');
  
  if (!passwordMatch) {
    throw new UnauthorizedError('Credenciales inválidas');
  }

  const token = generateToken({
    id_user: user.id_user,
    email: user.email,
    role: user.role,
    name: user.name
  });

  const refreshToken = generateRefreshToken({
    id_user: user.id_user
  });

  return {
    user: {
      id_user: user.id_user,
      name: user.name,
      email: user.email,
      role: user.role,
      clan: user.clan
    },
    token,
    refreshToken
  };
};

export const logout = async () => {
  return { message: 'Sesión cerrada exitosamente' };
};

export const refreshToken = async (userId) => {
  const user = await AuthRepository.findById(userId);
  
  if (!user) {
    throw new UnauthorizedError('Usuario no encontrado');
  }

  if (user.is_active === false) {
    throw new UnauthorizedError('Usuario desactivado');
  }

  const token = generateToken({
    id_user: user.id_user,
    email: user.email,
    role: user.role,
    name: user.name
  });

  const newRefreshToken = generateRefreshToken({
    id_user: user.id_user
  });

  return { token, refreshToken: newRefreshToken };
};

export const getMe = async (userId) => {
  const user = await AuthRepository.findById(userId);
  
  if (!user) {
    throw new NotFoundError('Usuario no encontrado');
  }

  const profile = await AuthRepository.getProfile(userId);

  return {
    id_user: user.id_user,
    name: user.name,
    email: user.email,
    role: user.role,
    document_number: user.document_number,
    document_type: user.document_type,
    clan: user.clan,
    profile
  };
};

export const changePassword = async (userId, currentPassword, newPassword) => {
  if (!currentPassword || !newPassword) {
    throw new ValidationError('Contraseña actual y nueva contraseña son requeridas');
  }

  if (newPassword.length < 6) {
    throw new ValidationError('La nueva contraseña debe tener al menos 6 caracteres');
  }

  const user = await AuthRepository.findById(userId);
  
  if (!user) {
    throw new NotFoundError('Usuario no encontrado');
  }

  const passwordMatch = await bcrypt.compare(currentPassword, user.encrypted_password || '');
  
  if (!passwordMatch) {
    throw new UnauthorizedError('La contraseña actual es incorrecta');
  }

  const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  await AuthRepository.updatePassword(userId, passwordHash);

  return { message: 'Contraseña actualizada exitosamente' };
};

export const updateProfile = async (userId, profileData) => {
  const { github_url, description, clan } = profileData;

  let profile = await AuthRepository.getProfile(userId);
  
  if (!profile) {
    profile = await AuthRepository.createProfile(userId, { github_url, description, clan });
  } else {
    profile = await AuthRepository.updateProfile(userId, { github_url, description, clan });
  }

  return profile;
};

export default {
  register,
  login,
  logout,
  refreshToken,
  getMe,
  changePassword,
  updateProfile
};
