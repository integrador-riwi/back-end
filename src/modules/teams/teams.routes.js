import { Router } from "express";
import TeamsController from "./teams.controller.js";
import { authenticate } from "../../middleware/auth.js";
import { hasRole, isAdminOrTeamLead } from "../../middleware/rbac.js";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Teams
 *   description: Endpoints para gestión de equipos
 */

/**
 * @swagger
 * /api/teams:
 *   get:
 *     summary: Listar todos los equipos
 *     tags: [Teams]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de equipos
 *   post:
 *     summary: Crear un nuevo equipo
 *     tags: [Teams]
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
 *               members:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       201:
 *         description: Equipo creado
 */

/**
 * @swagger
 * /api/teams/{id}:
 *   get:
 *     summary: Obtener equipo por ID
 *     tags: [Teams]
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
 *         description: Equipo encontrado
 *       404:
 *         description: Equipo no encontrado
 *   put:
 *     summary: Actualizar equipo por ID
 *     tags: [Teams]
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
 *     responses:
 *       200:
 *         description: Equipo actualizado
 *       404:
 *         description: Equipo no encontrado
 *   delete:
 *     summary: Eliminar equipo por ID
 *     tags: [Teams]
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
 *         description: Equipo eliminado
 *       404:
 *         description: Equipo no encontrado
 */

/**
 * @swagger
 * /api/teams/{id}/members:
 *   get:
 *     summary: Listar miembros de un equipo
 *     tags: [Teams]
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
 *         description: Lista de miembros
 *   post:
 *     summary: Agregar miembro a un equipo
 *     tags: [Teams]
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
 *               userId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Miembro agregado
 *       404:
 *         description: Equipo no encontrado
 */

/**
 * @swagger
 * /api/teams/{id}/members/{userId}:
 *   delete:
 *     summary: Eliminar miembro de un equipo
 *     tags: [Teams]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Miembro eliminado
 *       404:
 *         description: Equipo o usuario no encontrado
 */

/**
 * @swagger
 * /api/teams/{id}/leave:
 *   delete:
 *     summary: Abandonar equipo
 *     tags: [Teams]
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
 *         description: Has abandonado el equipo
 *       404:
 *         description: Equipo no encontrado
 */

router.get("/", authenticate, TeamsController.list);

router.get("/my-teams", authenticate, TeamsController.getMyTeams);

router.get("/invitations", authenticate, TeamsController.getMyInvitations);

router.get("/search", authenticate, TeamsController.searchProjects);

router.get("/:id", authenticate, TeamsController.get);

router.get("/:id/members", authenticate, TeamsController.getMembers);

router.get(
  "/:id/invitations",
  authenticate,
  TeamsController.getTeamInvitations,
);

router.get(
  "/:id/available",
  authenticate,
  hasRole("ADMIN", "TL_DEVELOPMENT", "TL_SOFT_SKILLS", "TL_ENGLISH", "CODER"),
  TeamsController.getAvailable,
);

router.post(
  "/",
  authenticate,
  hasRole("ADMIN", "TL_DEVELOPMENT", "TL_SOFT_SKILLS", "TL_ENGLISH", "CODER"),
  TeamsController.create,
);

router.put("/:id", authenticate, TeamsController.update);

router.delete("/:id", authenticate, hasRole("ADMIN"), TeamsController.remove);

router.post("/:id/members", authenticate, TeamsController.addMember);

router.delete(
  "/:id/members/:userId",
  authenticate,
  TeamsController.removeMember,
);

router.delete("/:id/leave", authenticate, TeamsController.leaveTeam);

router.post(
  "/invitations/:id/accept",
  authenticate,
  TeamsController.acceptInvitation,
);

router.post(
  "/invitations/:id/reject",
  authenticate,
  TeamsController.rejectInvitation,
);

router.post("/:id/request-join", authenticate, TeamsController.requestJoinTeam);

router.get(
  "/join-requests/my",
  authenticate,
  TeamsController.getMyJoinRequests,
);

router.get(
  "/:id/join-requests",
  authenticate,
  TeamsController.getTeamJoinRequests,
);

router.post(
  "/join-requests/:id/accept",
  authenticate,
  TeamsController.acceptJoinRequest,
);

router.post(
  "/join-requests/:id/reject",
  authenticate,
  TeamsController.rejectJoinRequest,
);

router.delete(
  "/join-requests/:id/cancel",
  authenticate,
  TeamsController.cancelJoinRequest,
);

export default router;
