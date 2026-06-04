import pool from "../../db/pool.js";

// ─── Password Reset Token Queries ────────────────────────────────────────────

/**
 * Save a hashed reset token for a user (invalidates all previous tokens first).
 */
export const saveResetToken = async (userId, tokenHash, expiresAt) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Invalidate any existing unused tokens for this user (one at a time policy)
    await client.query(
      `UPDATE password_reset_tokens
       SET used_at = NOW()
       WHERE user_id = $1 AND used_at IS NULL AND expires_at > NOW()`,
      [userId]
    );

    const result = await client.query(
      `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
       VALUES ($1, $2, $3)
       RETURNING id, expires_at`,
      [userId, tokenHash, expiresAt]
    );

    await client.query("COMMIT");
    return result.rows[0];
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
};

/**
 * Find a valid (non-expired, non-used) token and return user data along with it.
 */
export const findValidResetToken = async (tokenHash) => {
  const result = await pool.query(
    `SELECT prt.id, prt.user_id, prt.expires_at, u.email, u.name
     FROM password_reset_tokens prt
     JOIN users u ON u.id_user = prt.user_id
     WHERE prt.token_hash = $1
       AND prt.used_at IS NULL
       AND prt.expires_at > NOW()`,
    [tokenHash]
  );
  return result.rows[0] || null;
};

/**
 * Mark a token as used so it cannot be replayed.
 */
export const markTokenUsed = async (tokenId) => {
  await pool.query(
    `UPDATE password_reset_tokens SET used_at = NOW() WHERE id = $1`,
    [tokenId]
  );
};

/**
 * Delete all tokens for a user (called after a successful password reset).
 */
export const deleteUserResetTokens = async (userId) => {
  await pool.query(
    `DELETE FROM password_reset_tokens WHERE user_id = $1`,
    [userId]
  );
};
