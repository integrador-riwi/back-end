import { Router } from 'express';
import * as controller from './votes.controller.js';
import { authenticate } from "../../middleware/auth.js";
import { hasRole, isAdminOrTeamLead } from "../../middleware/rbac.js";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: QRVotes
 *   description: Endpoints para votación por QR
 */

/**
 * @swagger
 * /api/qr-votes:
 *   post:
 *     summary: Crear sesión de votación QR para un evento
 *     tags: [QRVotes]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               id_event:
 *                 type: string
 *               expires_at:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       201:
 *         description: Sesión de votación creada
 */

/**
 * @swagger
 * /api/qr-votes/event/{id}:
 *   get:
 *     summary: Listar todos los QRs de un evento
 *     tags: [QRVotes]
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
 *         description: Lista de QRs
 *       404:
 *         description: Evento no encontrado
 */

/**
 * @swagger
 * /api/qr-votes/event/{eventId}/results:
 *   get:
 *     summary: Ver resultados de votos públicos de un evento
 *     tags: [QRVotes]
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
 *         description: Resultados de votos
 *       404:
 *         description: Evento no encontrado
 */

/**
 * @swagger
 * /api/qr-votes/{id}/toggle:
 *   patch:
 *     summary: Activar o desactivar un QR
 *     tags: [QRVotes]
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
 *         description: Estado del QR actualizado
 *       404:
 *         description: QR no encontrado
 */

/**
 * @swagger
 * /api/qr-votes/vote/{eventId}/projects:
 *   get:
 *     summary: Obtener proyectos del evento para votar
 *     tags: [QRVotes]
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Lista de proyectos para votar
 *       404:
 *         description: Evento no encontrado
 */

/**
 * @swagger
 * /api/qr-votes/vote:
 *   post:
 *     summary: Registrar voto de persona externa
 *     tags: [QRVotes]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               qr_vote_id:
 *                 type: string
 *               project_id:
 *                 type: string
 *     responses:
 *       201:
 *         description: Voto registrado
 *       400:
 *         description: Error de validación
 */

// ─── Rutas de Admin (requieren JWT) ───────────────────────────────────────────

// Crear sesión de votación QR para un evento
// Body: { id_event, expires_at? }
router.post('/', authenticate, controller.createQrVote);

// Listar todos los QRs de un evento
router.get('/event/:id', authenticate, controller.getQrsByEvent);

// Ver resultados de votos públicos de un evento
router.get('/event/:eventId/results', authenticate, controller.getResults);

// Activar o desactivar un QR
router.patch('/:id/toggle', authenticate, controller.toggleQrActive);

// ─── Rutas Públicas (sin JWT, accesibles desde el QR) ─────────────────────────

// Obtener proyectos del evento para mostrar en la página de votación
router.get('/vote/:eventId/projects', controller.getProjectsForVoting);

// Registrar voto de persona externa
// Body: { qr_vote_id, project_id }
router.post('/vote', controller.registerVote);

export default router;
