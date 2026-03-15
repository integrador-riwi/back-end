import { Router } from "express";
import EventsController from "./events.controller.js";
import { authenticate } from "../../middleware/auth.js";
import { hasRole } from "../../middleware/rbac.js";

const router = Router();

const isAdmin = hasRole("ADMIN");
const canManage = hasRole(
  "ADMIN",
  "TL_DEVELOPMENT",
  "TL_SOFT_SKILLS",
  "TL_ENGLISH",
);

/**
 * @swagger
 * tags:
 *   name: Events
 *   description: Endpoints para gestión de eventos
 */

/**
 * @swagger
 * /api/events:
 *   get:
 *     summary: Listar eventos
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de eventos
 *   post:
 *     summary: Crear un nuevo evento
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               date:
 *                 type: string
 *                 format: date
 *     responses:
 *       201:
 *         description: Evento creado
 */

/**
 * @swagger
 * /api/events/upcoming:
 *   get:
 *     summary: Listar próximos eventos
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de próximos eventos
 */

/**
 * @swagger
 * /api/events/active:
 *   get:
 *     summary: Listar eventos activos
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de eventos activos
 */

/**
 * @swagger
 * /api/events/past:
 *   get:
 *     summary: Listar eventos pasados
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de eventos pasados
 */

/**
 * @swagger
 * /api/events/stats:
 *   get:
 *     summary: Obtener estadísticas de eventos
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Estadísticas de eventos
 */

/**
 * @swagger
 * /api/events/{id}/metrics:
 *   get:
 *     summary: Obtener métricas de un evento
 *     tags: [Events]
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
 *         description: Métricas del evento
 *       404:
 *         description: Evento no encontrado
 */

/**
 * @swagger
 * /api/events/{id}:
 *   get:
 *     summary: Obtener evento por ID
 *     tags: [Events]
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
 *         description: Evento encontrado
 *       404:
 *         description: Evento no encontrado
 *   put:
 *     summary: Actualizar evento por ID
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               date:
 *                 type: string
 *                 format: date
 *     responses:
 *       200:
 *         description: Evento actualizado
 *       404:
 *         description: Evento no encontrado
 *   delete:
 *     summary: Eliminar evento por ID
 *     tags: [Events]
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
 *         description: Evento eliminado
 *       404:
 *         description: Evento no encontrado
 */

/**
 * @swagger
 * /api/events/{id}/rubrics:
 *   get:
 *     summary: Listar rúbricas de un evento
 *     tags: [Events]
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
 *         description: Lista de rúbricas
 *   post:
 *     summary: Agregar rúbricas a un evento
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               rubrics:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Rúbricas agregadas
 *       404:
 *         description: Evento no encontrado
 */

/**
 * @swagger
 * /api/events/{id}/rubrics/{rubricId}:
 *   put:
 *     summary: Actualizar una rúbrica de un evento
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: rubricId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *     responses:
 *       200:
 *         description: Rúbrica actualizada
 *       404:
 *         description: Rúbrica o evento no encontrado
 *   delete:
 *     summary: Eliminar una rúbrica de un evento
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: rubricId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Rúbrica eliminada
 *       404:
 *         description: Rúbrica o evento no encontrado
 */

router.get("/", authenticate, EventsController.list);
router.get("/upcoming", authenticate, EventsController.getUpcoming);
router.get("/active", authenticate, EventsController.getActive);
router.get("/past", authenticate, EventsController.getPast);
router.get("/stats", authenticate, isAdmin, EventsController.getStats);
router.get("/:id/metrics", authenticate, isAdmin, EventsController.getMetrics);
router.get("/:id", authenticate, EventsController.get);

router.post("/", authenticate, canManage, EventsController.create);
router.put("/:id", authenticate, canManage, EventsController.update);
router.delete("/:id", authenticate, isAdmin, EventsController.remove);

// GET  /api/events/:id/rubrics           — list all rubrics for an event
router.get("/:id/rubrics", authenticate, EventsController.getRubrics);

// POST /api/events/:id/rubrics           — add rubrics to an existing event
router.post(
  "/:id/rubrics",
  authenticate,
  canManage,
  EventsController.addRubrics,
);

// PUT  /api/events/:id/rubrics/:rubricId — update a single rubric
router.put(
  "/:id/rubrics/:rubricId",
  authenticate,
  canManage,
  EventsController.updateRubric,
);

// DELETE /api/events/:id/rubrics/:rubricId — soft-delete a rubric
router.delete(
  "/:id/rubrics/:rubricId",
  authenticate,
  isAdmin,
  EventsController.deleteRubric,
);

export default router;
