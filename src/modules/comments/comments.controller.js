import CommentsService from "./comments.service.js";
import { success, created, noContent } from "../../utils/response.js";
import { asyncHandler } from "../../middleware/errorHandler.js";

/**
 * GET /api/comments/project/:projectId
 * Trae todos los comentarios (con replies) de un proyecto.
 */
export const getByProject = asyncHandler(async (req, res) => {
  const { projectId } = req.params;

  const comments = await CommentsService.getCommentsByProject(projectId);

  return success(res, comments);
});

/**
 * POST /api/comments
 * Crea un comentario. Body: { projectId, comment, parentCommentId? }
 */
export const create = asyncHandler(async (req, res) => {
  const { projectId, comment, parentCommentId = null } = req.body;
  const authorUserId = req.user.id_user;

  const newComment = await CommentsService.createComment({
    projectId,
    authorUserId,
    comment,
    parentCommentId,
  });

  return created(res, newComment);
});

/**
 * DELETE /api/comments/:id
 * Elimina un comentario (y sus replies). Solo autor o ADMIN.
 */
export const remove = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id_user;
  const userRole = req.user.role;

  await CommentsService.deleteComment(parseInt(id), userId, userRole);

  return noContent(res);
});

export default { getByProject, create, remove };
