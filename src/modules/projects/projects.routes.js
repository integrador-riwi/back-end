import { Router } from "express";
import ProjectsController from "./projects.controller.js";
import { authenticate } from "../../middleware/auth.js";
import { hasRole } from "../../middleware/rbac.js";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Projects
 *   description: Endpoints para gestión de proyectos
 */

/**
 * @swagger
 * /api/projects:
 *   get:
 *     summary: Listar proyectos
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de proyectos
 *   post:
 *     summary: Crear un nuevo proyecto
 *     tags: [Projects]
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
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: Proyecto creado
 */

/**
 * @swagger
 * /api/projects/search:
 *   get:
 *     summary: Buscar proyectos por descripción (semantic search)
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         required: false
 *         schema:
 *           type: string
 *         description: Texto a buscar
 *       - in: query
 *         name: limit
 *         required: false
 *         schema:
 *           type: integer
 *         description: Límite de resultados
 *     responses:
 *       200:
 *         description: Resultados de la búsqueda
 */

/**
 * @swagger
 * /api/projects/team/{id}:
 *   get:
 *     summary: Obtener proyecto por ID de equipo
 *     tags: [Projects]
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
 *         description: Proyecto encontrado
 *       404:
 *         description: Proyecto no encontrado
 */

/**
 * @swagger
 * /api/projects/{id}:
 *   get:
 *     summary: Obtener proyecto por ID
 *     tags: [Projects]
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
 *         description: Proyecto encontrado
 *       404:
 *         description: Proyecto no encontrado
 *   put:
 *     summary: Actualizar proyecto por ID
 *     tags: [Projects]
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
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         description: Proyecto actualizado
 *       404:
 *         description: Proyecto no encontrado
 */

/**
 * @swagger
 * /api/projects/{id}/deliverables:
 *   put:
 *     summary: Actualizar entregables de un proyecto
 *     tags: [Projects]
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
 *               deliverables:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Entregables actualizados
 *       404:
 *         description: Proyecto no encontrado
 */

/**
 * @swagger
 * /api/projects/{id}/submit:
 *   post:
 *     summary: Marcar proyecto como enviado
 *     tags: [Projects]
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
 *         description: Proyecto marcado como enviado
 *       404:
 *         description: Proyecto no encontrado
 */

/**
 * @swagger
 * /api/projects/team/{id}/confirm:
 *   post:
 *     summary: Confirmar equipo de un proyecto
 *     tags: [Projects]
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
 *         description: Equipo confirmado
 *       404:
 *         description: Proyecto o equipo no encontrado
 */

router.get(
    "/",
    authenticate,
    hasRole("ADMIN", "CODER"),
    ProjectsController.list,
);

// Semantic search over project descriptions. Admin only.
// GET /api/projects/search?q=<text>&limit=<n>
router.get(
    "/search",
    authenticate,
    hasRole("ADMIN"),
    ProjectsController.semanticSearch,
);

router.get("/team/:id", authenticate, ProjectsController.getByTeam);

router.get("/:id", authenticate, ProjectsController.get);

router.post("/", authenticate, ProjectsController.create);

router.post("/team/:id/confirm", authenticate, ProjectsController.confirmTeam);

router.put("/:id", authenticate, ProjectsController.update);

router.put(
    "/:id/deliverables",
    authenticate,
    ProjectsController.updateDeliverables,
);

router.post("/:id/submit", authenticate, ProjectsController.submitProject);

export default router;
