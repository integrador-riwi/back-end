import CommentsRepository from "./comments.repository.js";
import ProjectsRepository from "../projects/projects.repository.js";
import {
  NotFoundError,
  ForbiddenError,
  ValidationError,
} from "../../middleware/errorHandler.js";

/**
 * Devuelve los comentarios de un proyecto.
 * Cualquier miembro autenticado puede verlos.
 */
export const getCommentsByProject = async (projectId) => {
  // Verificamos que el proyecto existe
  const project = await ProjectsRepository.findById(projectId);
  if (!project) {
    throw new NotFoundError("Proyecto no encontrado");
  }

  return CommentsRepository.findByProjectId(projectId);
};

/**
 * Crea un comentario en un proyecto.
 * Si parentCommentId viene, es un reply — validamos que el padre exista
 * y pertenezca al mismo proyecto.
 */
export const createComment = async ({
  projectId,
  authorUserId,
  comment,
  parentCommentId = null,
}) => {
  if (!comment || comment.trim().length === 0) {
    throw new ValidationError("El comentario no puede estar vacío");
  }

  if (comment.trim().length > 2000) {
    throw new ValidationError("El comentario no puede exceder 2000 caracteres");
  }

  const project = await ProjectsRepository.findById(projectId);
  if (!project) {
    throw new NotFoundError("Proyecto no encontrado");
  }

  if (parentCommentId) {
    const parent = await CommentsRepository.findById(parentCommentId);
    if (!parent) {
      throw new NotFoundError("Comentario padre no encontrado");
    }
    if (parent.id_project !== parseInt(projectId)) {
      throw new ValidationError(
        "El comentario padre no pertenece a este proyecto",
      );
    }
    // No permitimos replies de replies (máximo 1 nivel)
    if (parent.parent_comment_id !== null) {
      throw new ValidationError("No se pueden anidar replies más de un nivel");
    }
  }

  return CommentsRepository.create({
    projectId: parseInt(projectId),
    authorUserId,
    comment: comment.trim(),
    parentCommentId,
  });
};

/**
 * Elimina un comentario.
 * Solo el autor o un ADMIN pueden eliminar.
 */
export const deleteComment = async (commentId, userId, userRole) => {
  const comment = await CommentsRepository.findById(commentId);

  if (!comment) {
    throw new NotFoundError("Comentario no encontrado");
  }

  const isAuthor = comment.author_user_id === userId;
  const isAdmin = userRole === "ADMIN";

  if (!isAuthor && !isAdmin) {
    throw new ForbiddenError("No tienes permiso para eliminar este comentario");
  }

  return CommentsRepository.remove(commentId);
};

export default { getCommentsByProject, createComment, deleteComment };
