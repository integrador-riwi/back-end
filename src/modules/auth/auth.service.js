import bcrypt from "bcryptjs";
import crypto from "crypto";
import AuthRepository from "./auth.repository.js";
import PasswordResetRepository from "./password-reset.repository.js";
import {
  generateToken,
  generateRefreshToken,
  hashToken,
  getTokenExpiration,
} from "../../utils/jwt.js";
import {
  ValidationError,
  UnauthorizedError,
  NotFoundError,
  ConflictError,
} from "../../middleware/errorHandler.js";
import GitHubService from "../../integrations/github.service.js";
import config from "../../config/env.js";
import { sendEmail } from "../../utils/emails/email.service.js";
import { buildPasswordResetEmail } from "../../utils/emails/password-reset.template.js";

const SALT_ROUNDS = 12;

const createTokens = async (user, userAgent = null, ipAddress = null) => {
  const token = generateToken({
    id_user: user.id_user,
    email: user.email,
    role: user.role,
    name: user.name,
  });

  const refreshToken = generateRefreshToken({
    id_user: user.id_user,
  });

  const tokenHash = hashToken(refreshToken);
  const expiresAt = getTokenExpiration(refreshToken);

  await AuthRepository.saveRefreshToken({
    userId: user.id_user,
    tokenHash,
    expiresAt,
    userAgent,
    ipAddress,
  });

  return { token, refreshToken };
};

export const register = async (
  userData,
  userAgent = null,
  ipAddress = null,
) => {
  const {
    name,
    email,
    password,
    role = "CODER",
    documentNumber,
    documentType = "CC",
    clan,
  } = userData;

  if (!name || !email || !documentNumber) {
    throw new ValidationError("Name, email, and document number are required.");
  }

  const finalPassword = password || documentNumber.toString();

  if (finalPassword.length < 6) {
    throw new ValidationError(
      "The password must be at least 6 characters long.",
    );
  }

  const existingUser = await AuthRepository.findByEmail(email);
  if (existingUser) {
    throw new ConflictError("The email address is already registered.");
  }

  const existingDocument = await AuthRepository.findByDocument(documentNumber);
  if (existingDocument) {
    throw new ConflictError("The document number is already registered.");
  }

  const passwordHash = await bcrypt.hash(finalPassword, SALT_ROUNDS);

  const user = await AuthRepository.create({
    name,
    email,
    passwordHash,
    role,
    documentNumber,
    documentType,
    clan,
  });

  await AuthRepository.createProfile(user.id_user, { clan });

  const tokens = await createTokens(user, userAgent, ipAddress);

  return {
    user: {
      id_user: user.id_user,
      name: user.name,
      email: user.email,
      role: user.role,
    },
    token: tokens.token,
    refreshToken: tokens.refreshToken,
  };
};

export const login = async (
  email,
  password,
  userAgent = null,
  ipAddress = null,
) => {
  if (!email || !password) {
    throw new ValidationError("Email and password are required");
  }

  const user = await AuthRepository.findByEmail(email);

  if (!user) {
    throw new UnauthorizedError("Invalid credentials");
  }

  if (user.is_active === false) {
    throw new UnauthorizedError("Usuario desactivado");
  }

  const passwordMatch = await bcrypt.compare(
    password,
    user.encrypted_password || "",
  );

  if (!passwordMatch) {
    throw new UnauthorizedError("Invalid credentials");
  }

  const tokens = await createTokens(user, userAgent, ipAddress);

  return {
    user: {
      id_user: user.id_user,
      name: user.name,
      email: user.email,
      role: user.role,
      clan: user.clan,
      github_avatar_url: user.github_avatar_url ?? null,
      github_username: user.github_username ?? null,
    },
    token: tokens.token,
    refreshToken: tokens.refreshToken,
  };
};

export const logout = async (refreshToken, userId) => {
  if (refreshToken) {
    const tokenHash = hashToken(refreshToken);
    await AuthRepository.revokeRefreshToken(tokenHash, userId);
  }
  return { message: "Sesión cerrada exitosamente" };
};

export const refreshTokens = async (
  oldRefreshToken,
  userAgent = null,
  ipAddress = null,
) => {
  if (!oldRefreshToken) {
    throw new ValidationError("Refresh token requerido");
  }

  const tokenHash = hashToken(oldRefreshToken);
  const storedToken = await AuthRepository.findRefreshToken(tokenHash);

  if (!storedToken) {
    throw new UnauthorizedError("Refresh token inválido o expirado");
  }

  if (storedToken.is_active === false) {
    throw new UnauthorizedError("Usuario desactivado");
  }

  await AuthRepository.revokeRefreshToken(tokenHash, storedToken.user_id);

  const user = {
    id_user: storedToken.user_id,
    name: storedToken.name,
    email: storedToken.email,
    role: storedToken.role,
  };

  const tokens = await createTokens(user, userAgent, ipAddress);

  return {
    token: tokens.token,
    refreshToken: tokens.refreshToken,
  };
};

export const getMe = async (userId) => {
  const user = await AuthRepository.findById(userId);

  if (!user) {
    throw new NotFoundError("User not found");
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
    github_avatar_url: user.github_avatar_url ?? null,
    github_username: user.github_username ?? null,
    profile,
  };
};

export const changePassword = async (userId, currentPassword, newPassword) => {
  if (!currentPassword || !newPassword) {
    throw new ValidationError("Current password and new password are required");
  }

  if (newPassword.length < 6) {
    throw new ValidationError(
      "The new password must be at least 6 characters long.",
    );
  }

  const user = await AuthRepository.findById(userId);

  if (!user) {
    throw new NotFoundError("User not found");
  }

  const passwordMatch = await bcrypt.compare(
    currentPassword,
    user.encrypted_password || "",
  );

  if (!passwordMatch) {
    throw new UnauthorizedError("The current password is incorrect.");
  }

  const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  await AuthRepository.updatePassword(userId, passwordHash);

  return { message: "Password successfully updated" };
};

export const updateProfile = async (userId, profileData) => {
  const { github_url, description, clan } = profileData;

  let profile = await AuthRepository.getProfile(userId);

  if (!profile) {
    profile = await AuthRepository.createProfile(userId, {
      github_url,
      description,
      clan,
    });
  } else {
    profile = await AuthRepository.updateProfile(userId, {
      github_url,
      description,
      clan,
    });
  }

  return profile;
};

export const getGithubAuthUrl = (userId) => {
  if (!config.github.clientId || !config.github.clientSecret) {
    throw new ValidationError("GitHub OAuth is not configured");
  }
  const state = Buffer.from(
    JSON.stringify({ userId, ts: Date.now() }),
  ).toString("base64");
  return GitHubService.getAuthorizationUrl(state);
};

export const handleGithubCallback = async (code, userId) => {
  if (!code) {
    throw new ValidationError("Authorization code is required");
  }

  const tokenData = await GitHubService.exchangeCodeForToken(code);

  const githubUser = await GitHubService.getUserInfo(tokenData.accessToken);

  const existingUser = await AuthRepository.findByGithubId(githubUser.id);
  if (existingUser && existingUser.id_user !== userId) {
    throw new ConflictError(
      "This GitHub account is already linked to another user",
    );
  }

  const expiresAt = GitHubService.calculateTokenExpiration(tokenData.expiresIn);

  await AuthRepository.saveGithubTokens(userId, {
    githubId: githubUser.id,
    githubUsername: githubUser.login,
    githubAvatarUrl: githubUser.avatarUrl,
    accessToken: tokenData.accessToken,
    refreshToken: tokenData.refreshToken,
    expiresAt,
  });

  return {
    message: "GitHub account linked successfully",
    github: {
      id: githubUser.id,
      username: githubUser.login,
      name: githubUser.name,
      avatarUrl: githubUser.avatarUrl,
    },
  };
};

export const getGithubConnection = async (userId) => {
  const connection = await AuthRepository.getGithubConnection(userId);

  if (!connection || !connection.github_id) {
    return {
      connected: false,
      github: null,
    };
  }

  const isExpired =
    connection.github_token_expires_at &&
    new Date(connection.github_token_expires_at) < new Date();

  return {
    connected: true,
    expired: isExpired,
    github: {
      id: connection.github_id,
      username: connection.github_username,
      avatarUrl: connection.github_avatar_url ?? null,
      expiresAt: connection.github_token_expires_at,
    },
  };
};

export const disconnectGithub = async (userId) => {
  const tokens = await AuthRepository.getGithubTokens(userId);

  if (tokens?.github_token) {
    await GitHubService.revokeToken(tokens.github_token);
  }

  const disconnected = await AuthRepository.disconnectGithub(userId);

  if (!disconnected) {
    throw new NotFoundError("User not found");
  }

  return { message: "GitHub account disconnected successfully" };
};

export const getGithubOrgs = async (userId) => {
  const user = await AuthRepository.findById(userId);
  if (!user) throw new NotFoundError("User not found.");
  if (!user.github_token) {
    throw new ValidationError(
      "No tienes GitHub conectado. Conecta tu cuenta primero.",
    );
  }
  try {
    const orgs = await GitHubService.getUserOrgs(user.github_token);
    return { connected: true, username: user.github_username, orgs };
  } catch (err) {
    throw new ValidationError(
      "No se pudieron obtener las organizaciones de GitHub. Tu token puede haber expirado.",
    );
  }
};

/**
 * FORGOT PASSWORD — Step 1
 * Accepts an email, generates a secure one-time token, stores a hash of it,
 * and sends the reset link. Always returns the same generic response to
 * avoid user enumeration attacks.
 */
export const forgotPassword = async (email) => {
  if (!email) {
    throw new ValidationError("Email is required.");
  }

  // Generic response regardless of outcome (prevents user enumeration)
  const genericResponse = {
    message:
      "If an account with that email exists, you will receive a reset link shortly.",
  };

  const user = await AuthRepository.findByEmail(email.toLowerCase().trim());
  if (!user) return genericResponse; // Silently do nothing – don't reveal existence

  // Generate a cryptographically secure 32-byte random token
  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");

  const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
  await PasswordResetRepository.saveResetToken(user.id_user, tokenHash, expiresAt);

  // Build the reset URL that points to the frontend
  const resetLink = `${config.client.url}/reset-password?token=${rawToken}`;

  await sendEmail({
    toEmail: user.email,
    toName: user.name,
    subject: "Restablecer contraseña – TeamUp",
    html: buildPasswordResetEmail(user.name, resetLink),
  });

  return genericResponse;
};

/**
 * RESET PASSWORD — Step 2
 * Validates the raw token, hashes it, looks it up, checks expiry,
 * updates the password, then invalidates all existing tokens.
 */
export const resetPassword = async (rawToken, newPassword) => {
  if (!rawToken || !newPassword) {
    throw new ValidationError("Token and new password are required.");
  }

  if (newPassword.length < 6) {
    throw new ValidationError("Password must be at least 6 characters.");
  }

  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  const record = await PasswordResetRepository.findValidResetToken(tokenHash);

  if (!record) {
    // Same error for expired and invalid tokens to avoid timing attacks
    throw new ValidationError(
      "This reset link is invalid or has expired. Please request a new one."
    );
  }

  const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  await AuthRepository.updatePassword(record.user_id, passwordHash);

  // Consume the token and wipe all others for this user
  await PasswordResetRepository.markTokenUsed(record.id);
  await PasswordResetRepository.deleteUserResetTokens(record.user_id);

  // Revoke all active login sessions for security
  await AuthRepository.revokeAllUserTokens(record.user_id);

  return { message: "Your password has been reset successfully. Please log in." };
};

export default {
  register,
  login,
  logout,
  refreshTokens,
  getMe,
  changePassword,
  forgotPassword,
  resetPassword,
  updateProfile,
  getGithubAuthUrl,
  handleGithubCallback,
  getGithubConnection,
  disconnectGithub,
  getGithubOrgs,
};
