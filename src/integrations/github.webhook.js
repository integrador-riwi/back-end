import express from "express";
import crypto from "crypto";
import pool from "../db/pool.js";
import config from "../config/env.js";

const router = express.Router();

function verifySignature(req, res, next) {
  const signature = req.headers["x-hub-signature-256"];
  const secret =
    config.github?.webhookSecret || process.env.GITHUB_WEBHOOK_SECRET;

  if (!secret) {
    console.warn(
      "[GitHub Webhook] GITHUB_WEBHOOK_SECRET not set, skipping verification",
    );
    req.body = JSON.parse(req.body.toString());
    return next();
  }

  if (!signature) {
    return res
      .status(401)
      .json({ error: "Missing x-hub-signature-256 header" });
  }

  const hmac = crypto.createHmac("sha256", secret);
  const digest = "sha256=" + hmac.update(req.body).digest("hex");

  let valid = false;
  try {
    valid =
      signature.length === digest.length &&
      crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest));
  } catch {
    valid = false;
  }

  if (!valid) {
    console.warn("[GitHub Webhook] Invalid signature — request rejected");
    return res.status(401).json({ error: "Invalid signature" });
  }

  req.body = JSON.parse(req.body.toString());
  next();
}

async function findUserByGithubUsername(githubUsername) {
  const result = await pool.query(
    "SELECT id_user, name, email FROM users WHERE github_username = $1",
    [githubUsername],
  );
  return result.rows[0] || null;
}

async function findTeamByRepoName(repoName) {
  const result = await pool.query(
    "SELECT id_team FROM team_projects WHERE repo_name = $1",
    [repoName],
  );
  return result.rows[0] || null;
}

async function removeMemberFromTeam(teamId, userId) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const check = await client.query(
      "SELECT team_role FROM team_coders WHERE id_team = $1 AND id_user = $2",
      [teamId, userId],
    );

    if (check.rows.length === 0) {
      await client.query("ROLLBACK");
      return { skipped: true, reason: "User was not a member of the team" };
    }

    if (check.rows[0].team_role === "LEADER") {
      await client.query("ROLLBACK");
      return { skipped: true, reason: "Leader is not removed automatically" };
    }

    await client.query(
      "DELETE FROM team_coders WHERE id_team = $1 AND id_user = $2",
      [teamId, userId],
    );

    await client.query(
      "DELETE FROM team_invitations WHERE id_team = $1 AND id_user = $2",
      [teamId, userId],
    );

    await client.query("COMMIT");
    return { removed: true };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

// express.raw() scoped ONLY to this route — does not affect other routes
router.post(
  "/github",
  express.raw({ type: "application/json" }),
  verifySignature,
  async (req, res) => {
    const event = req.headers["x-github-event"];
    const { action, member, membership, repository } = req.body;

    console.log(`[GitHub Webhook] event=${event} action=${action}`);

    res.status(200).json({ received: true });

    if (event === "organization" && action === "member_removed") {
      const githubUsername = member?.login;
      if (!githubUsername) return;

      console.log(`[GitHub Webhook] ${githubUsername} left the organization`);

      try {
        const user = await findUserByGithubUsername(githubUsername);
        if (!user) {
          console.warn(`[GitHub Webhook] ${githubUsername} not found in DB`);
          return;
        }

        const teams = await pool.query(
          `SELECT id_team FROM team_coders WHERE id_user = $1 AND team_role != 'LEADER'`,
          [user.id_user],
        );

        for (const row of teams.rows) {
          const result = await removeMemberFromTeam(row.id_team, user.id_user);
          console.log(
            `[GitHub Webhook] Team ${row.id_team} -> ${JSON.stringify(result)}`,
          );
        }
      } catch (error) {
        console.error(
          "[GitHub Webhook] Error on org member_removed:",
          error.message,
        );
      }
      return;
    }

    if (event === "member" && action === "removed") {
      const githubUsername = member?.login;
      const repoName = repository?.name;
      if (!githubUsername || !repoName) return;

      console.log(`[GitHub Webhook] ${githubUsername} left repo ${repoName}`);

      try {
        const user = await findUserByGithubUsername(githubUsername);
        if (!user) {
          console.warn(`[GitHub Webhook] ${githubUsername} not found in DB`);
          return;
        }

        const teamProject = await findTeamByRepoName(repoName);
        if (!teamProject) {
          console.warn(
            `[GitHub Webhook] Repo ${repoName} not linked to any team`,
          );
          return;
        }

        const result = await removeMemberFromTeam(
          teamProject.id_team,
          user.id_user,
        );
        console.log(
          `[GitHub Webhook] Team ${teamProject.id_team} -> ${JSON.stringify(result)}`,
        );
      } catch (error) {
        console.error(
          "[GitHub Webhook] Error on repo member removed:",
          error.message,
        );
      }
      return;
    }

    if (event === "membership" && action === "member_added") {
      const githubUsername = membership?.user?.login;
      if (githubUsername) {
        console.log(`[GitHub Webhook] ${githubUsername} was added to the org`);
      }
    }
  },
);

export default router;
