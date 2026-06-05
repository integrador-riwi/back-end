import axios from "axios";
import config from "../config/env.js";

const GITHUB_API_BASE = "https://api.github.com";
const GITHUB_OAUTH_AUTHORIZE = "https://github.com/login/oauth/authorize";
const GITHUB_OAUTH_TOKEN = "https://github.com/login/oauth/access_token";

export const getAuthorizationUrl = (state = null) => {
  const params = new URLSearchParams({
    client_id: config.github.clientId,
    redirect_uri: config.github.redirectUri,
    scope: "repo user:email read:org write:org admin:org_hook",
    response_type: "code",
  });

  if (state) {
    params.append("state", state);
  }

  return `${GITHUB_OAUTH_AUTHORIZE}?${params.toString()}`;
};

export const exchangeCodeForToken = async (code) => {
  try {
    const response = await axios.post(
      GITHUB_OAUTH_TOKEN,
      {
        client_id: config.github.clientId,
        client_secret: config.github.clientSecret,
        code,
        redirect_uri: config.github.redirectUri,
      },
      {
        headers: {
          Accept: "application/json",
        },
      },
    );

    if (response.data.error) {
      throw new Error(response.data.error_description || response.data.error);
    }

    return {
      accessToken: response.data.access_token,
      refreshToken: response.data.refresh_token,
      expiresIn: response.data.expires_in,
      refreshTokenExpiresIn: response.data.refresh_token_expires_in,
      tokenType: response.data.token_type,
      scope: response.data.scope,
    };
  } catch (error) {
    if (error.response) {
      throw new Error(
        `GitHub OAuth error: ${error.response.data.error_description || error.message}`,
      );
    }
    throw error;
  }
};

export const refreshToken = async (refreshTokenValue) => {
  try {
    const response = await axios.post(
      GITHUB_OAUTH_TOKEN,
      {
        client_id: config.github.clientId,
        client_secret: config.github.clientSecret,
        grant_type: "refresh_token",
        refresh_token: refreshTokenValue,
      },
      {
        headers: {
          Accept: "application/json",
        },
      },
    );

    if (response.data.error) {
      throw new Error(response.data.error_description || response.data.error);
    }

    return {
      accessToken: response.data.access_token,
      refreshToken: response.data.refresh_token,
      expiresIn: response.data.expires_in,
      refreshTokenExpiresIn: response.data.refresh_token_expires_in,
    };
  } catch (error) {
    if (error.response) {
      throw new Error(
        `GitHub token refresh error: ${error.response.data.error_description || error.message}`,
      );
    }
    throw error;
  }
};

export const getUserInfo = async (accessToken) => {
  try {
    const response = await axios.get(`${GITHUB_API_BASE}/user`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/vnd.github.v3+json",
      },
    });

    return {
      id: response.data.id.toString(),
      login: response.data.login,
      name: response.data.name,
      email: response.data.email,
      avatarUrl: response.data.avatar_url,
      htmlUrl: response.data.html_url,
    };
  } catch (error) {
    if (error.response?.status === 401) {
      throw new Error("GitHub token is invalid or expired");
    }
    throw error;
  }
};

export const getUserEmails = async (accessToken) => {
  try {
    const response = await axios.get(`${GITHUB_API_BASE}/user/emails`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/vnd.github.v3+json",
      },
    });

    return response.data.map((email) => ({
      email: email.email,
      primary: email.primary,
      verified: email.verified,
    }));
  } catch (error) {
    if (error.response?.status === 401) {
      throw new Error("GitHub token is invalid or expired");
    }
    throw error;
  }
};

export const revokeToken = async (accessToken) => {
  try {
    const response = await axios.delete(
      `https://api.github.com/applications/${config.github.clientId}/grant`,
      {
        data: {
          access_token: accessToken,
        },
        auth: {
          username: config.github.clientId,
          password: config.github.clientSecret,
        },
        headers: {
          Accept: "application/vnd.github.v3+json",
        },
      },
    );

    return true;
  } catch (error) {
    console.error("Error revoking GitHub token:", error.message);
    return false;
  }
};

export const getPrimaryEmail = async (accessToken) => {
  const emails = await getUserEmails(accessToken);
  const primary = emails.find((e) => e.primary && e.verified);
  return primary?.email || emails.find((e) => e.verified)?.email || null;
};

export const getUserOrgs = async (accessToken) => {
  const response = await axios.get(`${GITHUB_API_BASE}/user/orgs`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    params: { per_page: 100 },
  });
  return response.data.map((org) => ({
    login: org.login,
    avatarUrl: org.avatar_url,
  }));
};

export const calculateTokenExpiration = (expiresInSeconds) => {
  if (!expiresInSeconds) return null;
  const expiresAt = new Date();
  expiresAt.setSeconds(expiresAt.getSeconds() + expiresInSeconds);
  return expiresAt;
};

export const registerOrgWebhook = async (org, token) => {
  const webhookUrl = `${config.github.backendUrl}/api/webhooks/github`;
  const secret = config.github.webhookSecret;

  try {
    const { data: hooks } = await axios.get(
      `${GITHUB_API_BASE}/orgs/${org}/hooks`,
      { headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" } },
    );

    const already = hooks.some((h) => h.config?.url === webhookUrl);
    if (already) return { skipped: true };

    await axios.post(
      `${GITHUB_API_BASE}/orgs/${org}/hooks`,
      {
        name: "web",
        active: true,
        events: ["member", "organization", "repository"],
        config: { url: webhookUrl, content_type: "json", secret, insecure_ssl: "0" },
      },
      { headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" } },
    );

    return { registered: true };
  } catch (err) {
    console.warn(`[GitHub] Could not register org webhook for ${org}:`, err.response?.data?.message ?? err.message);
    return { error: true };
  }
};

export default {
  getAuthorizationUrl,
  exchangeCodeForToken,
  refreshToken,
  getUserInfo,
  getUserEmails,
  getPrimaryEmail,
  revokeToken,
  calculateTokenExpiration,
  getUserOrgs,
  registerOrgWebhook,
};
