import { Router } from "express";
import CommentsController from "./comments.controller.js";
import { authenticate } from "../../middleware/auth.js";

/**
 * @swagger
 * tags:
 *   name: Comments
 *   description: Endpoints para comentarios en proyectos
 */

/**
 * @swagger
 * /api/comments/project/{projectId}:
 *   get:
 *     summary: Listar comentarios de un proyecto
 *     tags: [Comments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Lista de comentarios
 */

/**
 * @swagger
 * /api/comments:
 *   post:
 *     summary: Crear un comentario o respuesta
 *     tags: [Comments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               projectId:
 *                 type: string
 *               content:
 *                 type: string
 *               parentCommentId:
 *                 type: string
 *                 nullable: true
 *     responses:
 *       201:
 *         description: Comentario creado
 *       400:
 *         description: Error de validación
 */

/**
 * @swagger
 * /api/comments/{id}:
 *   delete:
 *     summary: Eliminar comentario por ID
 *     tags: [Comments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Comentario eliminado
 *       404:
 *         description: Comentario no encontrado
 */

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
