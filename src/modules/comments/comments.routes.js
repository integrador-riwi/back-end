import { Router } from "express";
import CommentsController from "./comments.controller.js";
import { authenticate } from "../../middleware/auth.js";

const router = Router();

// GET /api/comments/project/:projectId  — listar comentarios de un proyecto
router.get(
  "/project/:projectId",
  authenticate,
  CommentsController.getByProject,
);

// POST /api/comments  — crear comentario (o reply con parentCommentId)
router.post("/", authenticate, CommentsController.create);

// DELETE /api/comments/:id  — eliminar comentario
router.delete("/:id", authenticate, CommentsController.remove);

export default router;
