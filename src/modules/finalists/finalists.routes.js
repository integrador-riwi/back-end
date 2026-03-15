import { Router } from 'express';
import FinalistsController from './finalists.controller.js';
import { authenticate } from '../../middleware/auth.js';
import { hasRole } from '../../middleware/rbac.js';

const router = Router({ mergeParams: true });

const isAdmin = hasRole('ADMIN');

/**
 * @swagger
 * tags:
 *   name: Finalists
 *   description: Endpoints para gestión de finalistas
 */

/**
 * @swagger
 * /api/finalists/events/{eventId}:
 *   get:
 *     summary: Obtener finalistas de un evento
 *     tags: [Finalists]
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
 *         description: Lista de finalistas
 */

// GET /api/finalists/events/:eventId
router.get('/events/:eventId', authenticate, FinalistsController.getFinalists);

/**
 * @swagger
 * /api/finalists/events/{eventId}/calculate:
 *   post:
 *     summary: Calcular finalistas de un evento
 *     tags: [Finalists]
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
 *         description: Finalistas calculados
 *       403:
 *         description: Prohibido
 *       404:
 *         description: Evento no encontrado
 */
// POST /api/finalists/events/:eventId/calculate
// Calculates the top 3 finalists using (score * 0.8) + (votes * 0.2), saves them and closes the event.
// Admin only. Can only be run once per event.
router.post('/events/:eventId/calculate', authenticate, isAdmin, FinalistsController.calculateFinalists);

/**
 * @swagger
 * /api/finalists/events/{eventId}/auto-select:
 *   post:
 *     summary: Seleccionar finalistas automáticamente
 *     tags: [Finalists]
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
 *         description: Finalistas seleccionados
 *       403:
 *         description: Prohibido
 *       404:
 *         description: Evento no encontrado
 */
// POST /api/finalists/events/:eventId/auto-select
// Selects the top N projects from the ranking without factoring in votes.
router.post('/events/:eventId/auto-select', authenticate, isAdmin, FinalistsController.autoSelectFinalists);

/**
 * @swagger
 * /api/finalists/events/{eventId}:
 *   post:
 *     summary: Establecer finalistas manualmente
 *     tags: [Finalists]
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
 *         description: Finalistas establecidos
 *       403:
 *         description: Prohibido
 *       404:
 *         description: Evento no encontrado
 */
// POST /api/finalists/events/:eventId
// Manually sets finalists by providing an array of projectIds.
router.post('/events/:eventId', authenticate, isAdmin, FinalistsController.setFinalists);

export default router;
