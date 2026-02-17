import AuthService from './auth.service.js';
import { success, error, created } from '../../utils/response.js';
import { asyncHandler, ValidationError } from '../../middleware/errorHandler.js';
import config from '../../config/env.js';

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: config.nodeEnv === 'production',
  sameSite: config.nodeEnv === 'production' ? 'strict' : 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: '/'
};

const REFRESH_COOKIE_OPTIONS = {
  ...COOKIE_OPTIONS,
  maxAge: 30 * 24 * 60 * 60 * 1000
};

const getClientInfo = (req) => ({
  userAgent: req.headers['user-agent'] || null,
  ipAddress: req.ip || req.connection.remoteAddress || null
});

export const register = asyncHandler(async (req, res) => {
  const { name, email, password, role, documentNumber, documentType, clan } = req.body;
  const { userAgent, ipAddress } = getClientInfo(req);

  const result = await AuthService.register({
    name,
    email,
    password,
    role,
    documentNumber,
    documentType,
    clan
  }, userAgent, ipAddress);

  res.cookie('token', result.token, COOKIE_OPTIONS);
  res.cookie('refreshToken', result.refreshToken, REFRESH_COOKIE_OPTIONS);

  return created(res, result);
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const { userAgent, ipAddress } = getClientInfo(req);

  const result = await AuthService.login(email, password, userAgent, ipAddress);

  res.cookie('token', result.token, COOKIE_OPTIONS);
  res.cookie('refreshToken', result.refreshToken, REFRESH_COOKIE_OPTIONS);

  return success(res, result);
});

export const logout = asyncHandler(async (req, res) => {
  const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;
  const userId = req.user?.id_user;

  const result = await AuthService.logout(refreshToken, userId);

  res.clearCookie('token', { path: '/' });
  res.clearCookie('refreshToken', { path: '/' });

  return success(res, result);
});

export const refresh = asyncHandler(async (req, res) => {
  const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;

  if (!refreshToken) {
    return error(res, 'Refresh token requerido', 401);
  }

  const { userAgent, ipAddress } = getClientInfo(req);

  const result = await AuthService.refreshTokens(refreshToken, userAgent, ipAddress);

  res.cookie('token', result.token, COOKIE_OPTIONS);
  res.cookie('refreshToken', result.refreshToken, REFRESH_COOKIE_OPTIONS);

  return success(res, { message: 'Token actualizado', token: result.token });
});

export const getMe = asyncHandler(async (req, res) => {
  const userId = req.user.id_user;
  const result = await AuthService.getMe(userId);
  return success(res, result);
});

export const changePassword = asyncHandler(async (req, res) => {
  const userId = req.user.id_user;
  const { currentPassword, newPassword } = req.body;

  const result = await AuthService.changePassword(userId, currentPassword, newPassword);
  return success(res, result);
});

export const updateProfile = asyncHandler(async (req, res) => {
  const userId = req.user.id_user;
  const profileData = req.body;

  const result = await AuthService.updateProfile(userId, profileData);
  return success(res, result);
});

export default {
  register,
  login,
  logout,
  refresh,
  getMe,
  changePassword,
  updateProfile
};
