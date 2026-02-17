import bcrypt from 'bcryptjs';
import AuthRepository from './auth.repository.js';
import { generateToken, generateRefreshToken, hashToken, getTokenExpiration } from '../../utils/jwt.js';
import { ValidationError, UnauthorizedError, NotFoundError, ConflictError } from '../../middleware/errorHandler.js';
import config from '../../config/env.js';

const SALT_ROUNDS = 12;

const createTokens = async (user, userAgent = null, ipAddress = null) => {
  const token = generateToken({
    id_user: user.id_user,
    email: user.email,
    role: user.role,
    name: user.name
  });

  const refreshToken = generateRefreshToken({
    id_user: user.id_user
  });

  const tokenHash = hashToken(refreshToken);
  const expiresAt = getTokenExpiration(refreshToken);

  await AuthRepository.saveRefreshToken({
    userId: user.id_user,
    tokenHash,
    expiresAt,
    userAgent,
    ipAddress
  });

  return { token, refreshToken };
};

export const register = async (userData, userAgent = null, ipAddress = null) => {
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

  const tokens = await createTokens(user, userAgent, ipAddress);

  return {
    user: {
      id_user: user.id_user,
      name: user.name,
      email: user.email,
      role: user.role
    },
    token: tokens.token,
    refreshToken: tokens.refreshToken
  };
};

export const login = async (email, password, userAgent = null, ipAddress = null) => {
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

  const tokens = await createTokens(user, userAgent, ipAddress);

  return {
    user: {
      id_user: user.id_user,
      name: user.name,
      email: user.email,
      role: user.role,
      clan: user.clan
    },
    token: tokens.token,
    refreshToken: tokens.refreshToken
  };
};

export const logout = async (refreshToken, userId) => {
  if (refreshToken) {
    const tokenHash = hashToken(refreshToken);
    await AuthRepository.revokeRefreshToken(tokenHash, userId);
  }
  return { message: 'Sesión cerrada exitosamente' };
};

export const refreshTokens = async (oldRefreshToken, userAgent = null, ipAddress = null) => {
  if (!oldRefreshToken) {
    throw new ValidationError('Refresh token requerido');
  }

  const tokenHash = hashToken(oldRefreshToken);
  const storedToken = await AuthRepository.findRefreshToken(tokenHash);

  if (!storedToken) {
    throw new UnauthorizedError('Refresh token inválido o expirado');
  }

  if (storedToken.is_active === false) {
    throw new UnauthorizedError('Usuario desactivado');
  }

  await AuthRepository.revokeRefreshToken(tokenHash, storedToken.user_id);

  const user = {
    id_user: storedToken.user_id,
    name: storedToken.name,
    email: storedToken.email,
    role: storedToken.role
  };

  const tokens = await createTokens(user, userAgent, ipAddress);

  return {
    token: tokens.token,
    refreshToken: tokens.refreshToken
  };
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
  refreshTokens,
  getMe,
  changePassword,
  updateProfile
};
