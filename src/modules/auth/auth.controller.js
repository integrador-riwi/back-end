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

export const githubAuth = asyncHandler(async (req, res) => {
  const authUrl = await AuthService.getGithubAuthUrl();
  return res.redirect(authUrl);
});

export const githubCallback = asyncHandler(async (req, res) => {
  const { code, error: githubError } = req.query;

  if (githubError) {
    const redirectUrl = `${config.client.url}/settings/github?error=${encodeURIComponent(githubError)}`;
    return res.redirect(redirectUrl);
  }

  if (!code) {
    const redirectUrl = `${config.client.url}/settings/github?error=no_code`;
    return res.redirect(redirectUrl);
  }

  const userId = req.user?.id_user;

  if (!userId) {
    const redirectUrl = `${config.client.url}/settings/github?error=not_authenticated`;
    return res.redirect(redirectUrl);
  }

  try {
    const result = await AuthService.handleGithubCallback(code, userId);
    const redirectUrl = `${config.client.url}/settings/github?success=true&username=${encodeURIComponent(result.github.username)}`;
    return res.redirect(redirectUrl);
  } catch (err) {
    const redirectUrl = `${config.client.url}/settings/github?error=${encodeURIComponent(err.message)}`;
    return res.redirect(redirectUrl);
  }
});

export const getGithubStatus = asyncHandler(async (req, res) => {
  const userId = req.user.id_user;
  const result = await AuthService.getGithubConnection(userId);
  return success(res, result);
});

export const disconnectGithub = asyncHandler(async (req, res) => {
  const userId = req.user.id_user;
  const result = await AuthService.disconnectGithub(userId);
  return success(res, result);
});

export default {
  register,
  login,
  logout,
  refresh,
  getMe,
  changePassword,
  updateProfile,
  githubAuth,
  githubCallback,
  getGithubStatus,
  disconnectGithub
};
