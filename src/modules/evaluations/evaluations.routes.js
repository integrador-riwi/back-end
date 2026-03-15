import { Router } from "express";
import EvaluationsController from "./evaluations.controller.js";
import { authenticate } from "../../middleware/auth.js";
import { hasRole } from "../../middleware/rbac.js";

const router = Router();

const canEvaluate = hasRole(
  "ADMIN",
  "TL_DEVELOPMENT",
  "TL_SOFT_SKILLS",
  "TL_ENGLISH",
);

/**
 * @swagger
 * tags:
 *   name: Evaluations
 *   description: Endpoints para evaluación de proyectos
 */

/**
 * @swagger
 * /api/evaluations/rubrics/{eventId}:
 *   get:
 *     summary: Obtener rúbricas de un evento
 *     tags: [Evaluations]
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
 *         description: Lista de rúbricas
 */

router.get(
  "/rubrics/:eventId",
  authenticate,
  canEvaluate,
  EvaluationsController.getRubrics,
);

/**
 * @swagger
 * /api/evaluations/project/{projectId}:
 *   post:
 *     summary: Enviar evaluaciones de un proyecto
 *     tags: [Evaluations]
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
 *         description: Evaluaciones enviadas con éxito
 *       400:
 *         description: Error en los datos enviados
 */

router.post(
  "/project/:projectId",
  authenticate,
  canEvaluate,
  EvaluationsController.submitEvaluations,
);

/**
 * @swagger
 * /api/evaluations/project/{projectId}/my:
 *   get:
 *     summary: Obtener mis evaluaciones para un proyecto
 *     tags: [Evaluations]
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
 *         description: Mis evaluaciones
 *       404:
 *         description: No se encontraron evaluaciones
 */

router.get(
  "/project/:projectId/my",
  authenticate,
  canEvaluate,
  EvaluationsController.getMyEvaluations,
);

/**
 * @swagger
 * /api/evaluations/project/{projectId}/calculate:
 *   post:
 *     summary: Calcular notas de un proyecto
 *     tags: [Evaluations]
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
 *         description: Notas calculadas con éxito
 *       400:
 *         description: Error en los datos enviados
 */

router.post(
  "/project/:projectId/calculate",
  authenticate,
  canEvaluate,
  EvaluationsController.calculateGrades,
);

/**
 * @swagger
 * /api/evaluations/project/{projectId}/results:
 *   get:
 *     summary: Obtener resultados de un proyecto
 *     tags: [Evaluations]
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
 *         description: Resultados del proyecto
 *       404:
 *         description: Proyecto no encontrado
 */

router.get(
  "/project/:projectId/results",
  authenticate,
  canEvaluate,
  EvaluationsController.getProjectResults,
);

/**
 * @swagger
 * /api/evaluations/event/{eventId}/results:
 *   get:
 *     summary: Obtener resultados de un evento
 *     tags: [Evaluations]
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
 *         description: Resultados del evento
 *       404:
 *         description: Evento no encontrado
 */

router.get(
  "/event/:eventId/results",
  authenticate,
  hasRole("ADMIN", "TL_DEVELOPMENT", "TL_SOFT_SKILLS", "TL_ENGLISH"),
  EvaluationsController.getEventResults,
);

export default router;
