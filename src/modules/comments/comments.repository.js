import pool from "../../db/pool.js";
import { DatabaseError } from "../../middleware/errorHandler.js";

/**
 * Trae todos los comentarios de un proyecto, incluyendo
 * datos del autor y replies anidados (1 nivel).
 */
export const findByProjectId = async (projectId) => {
  // Primero traemos todos los comentarios del proyecto
  const query = `
    SELECT
      c.id_comment,
      c.id_project,
      c.author_user_id,
      c.parent_comment_id,
      c.comment,
      c.creationdate,
      u.name        AS author_name,
      u.github_avatar_url AS author_avatar
    FROM comments c
    JOIN users u ON c.author_user_id = u.id_user
    WHERE c.id_project = $1
    ORDER BY c.creationdate ASC
  `;

  try {
    const result = await pool.query(query, [projectId]);
    const rows = result.rows;

    // Separamos top-level y replies, luego anidamos
    const topLevel = rows.filter((r) => r.parent_comment_id === null);
    const replies = rows.filter((r) => r.parent_comment_id !== null);

    const nested = topLevel.map((comment) => ({
      ...comment,
      replies: replies.filter(
        (r) => r.parent_comment_id === comment.id_comment,
      ),
    }));

    return nested;
  } catch (error) {
    throw new DatabaseError(`Error al obtener comentarios: ${error.message}`);
  }
};

/**
 * Crea un comentario. parent_comment_id es opcional (para replies).
 */
export const create = async ({
  projectId,
  authorUserId,
  comment,
  parentCommentId = null,
}) => {
  const query = `
    INSERT INTO comments (id_project, author_user_id, comment, parent_comment_id)
    VALUES ($1, $2, $3, $4)
    RETURNING
      id_comment,
      id_project,
      author_user_id,
      parent_comment_id,
      comment,
      creationdate
  `;

  try {
    const result = await pool.query(query, [
      projectId,
      authorUserId,
      comment,
      parentCommentId,
    ]);
    const row = result.rows[0];

    // Traemos el nombre del autor para devolverlo en la respuesta
    const userResult = await pool.query(
      "SELECT name, github_avatar_url FROM users WHERE id_user = $1",
      [authorUserId],
    );
    const user = userResult.rows[0];

    return {
      ...row,
      author_name: user?.name ?? null,
      author_avatar: user?.github_avatar_url ?? null,
      replies: [],
    };
  } catch (error) {
    throw new DatabaseError(`Error al crear comentario: ${error.message}`);
  }
};

/**
 * Busca un comentario por ID (para validaciones en el service).
 */
export const findById = async (commentId) => {
  const query = `
    SELECT id_comment, id_project, author_user_id, parent_comment_id, comment, creationdate
    FROM comments
    WHERE id_comment = $1
  `;

  try {
    const result = await pool.query(query, [commentId]);
    return result.rows[0] ?? null;
  } catch (error) {
    throw new DatabaseError(`Error al buscar comentario: ${error.message}`);
  }
};

/**
 * Elimina un comentario y sus replies en cascada.
 */
export const remove = async (commentId) => {
  // Primero eliminamos los replies para evitar FK violation
  const deleteRepliesQuery = `DELETE FROM comments WHERE parent_comment_id = $1`;
  const deleteQuery = `DELETE FROM comments WHERE id_comment = $1 RETURNING id_comment`;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(deleteRepliesQuery, [commentId]);
    const result = await client.query(deleteQuery, [commentId]);
    await client.query("COMMIT");
    return result.rows[0] ?? null;
  } catch (error) {
    await client.query("ROLLBACK");
    throw new DatabaseError(`Error al eliminar comentario: ${error.message}`);
  } finally {
    client.release();
  }
};

export default { findByProjectId, create, findById, remove };
