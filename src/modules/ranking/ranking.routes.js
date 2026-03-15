import { Router } from "express";
import RankingController from "./ranking.controller.js";
import { authenticate } from "../../middleware/auth.js";
import { hasRole } from "../../middleware/rbac.js";

const router = Router({ mergeParams: true });

const isAdmin = hasRole("ADMIN");

/**
 * @swagger
 * tags:
 *   name: Ranking
 *   description: Endpoints para ranking de proyectos en eventos
 */

/**
 * @swagger
 * /api/events/{eventId}/ranking:
 *   get:
 *     summary: Obtener ranking de proyectos de un evento
 *     tags: [Ranking]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Ranking obtenido
 */

/**
 * @swagger
 * /api/events/{eventId}/ranking/status:
 *   get:
 *     summary: Obtener el estado del ranking de un evento
 *     tags: [Ranking]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Estado del ranking obtenido
 *       404:
 *         description: Evento no encontrado
 */

/**
 * @swagger
 * /api/events/{eventId}/ranking/publish:
 *   post:
 *     summary: Publicar el ranking de un evento
 *     tags: [Ranking]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Ranking publicado
 *       404:
 *         description: Evento no encontrado
 */

router.get(
  "/status",
  authenticate,
  isAdmin,
  RankingController.getRankingStatus,
);

router.post(
  "/publish",
  authenticate,
  isAdmin,
  RankingController.publishRanking,
);

router.get("/", authenticate, RankingController.getRanking);

export default router;
