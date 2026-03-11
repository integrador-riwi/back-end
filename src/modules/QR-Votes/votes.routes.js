import { Router } from 'express';
import * as controller from './votes.controller.js';
import { authenticate } from "../../middleware/auth.js";
import { hasRole, isAdminOrTeamLead } from "../../middleware/rbac.js";

const router = Router();

// ─── Rutas de Admin (requieren JWT) ───────────────────────────────────────────

// Crear sesión de votación QR para un evento
// Body: { id_event, expires_at? }
router.post('/', authenticate, controller.createQrVote);

// Listar todos los QRs de un evento
router.get('/event/:eventId', authenticate, controller.getQrsByEvent);

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
