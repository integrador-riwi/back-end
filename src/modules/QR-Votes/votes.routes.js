import { Router } from 'express';
import * as controller from './votes.controller.js';
import { authenticate } from '../../middleware/auth.js';
import { hasRole } from '../../middleware/rbac.js';

const router = Router();

// ─── Rutas de Admin (requieren JWT) ───────────────────────────────────────────

// Crear sesión de votación QR (pública o de staff)
// Body: { id_event, expires_at?, top_n, finalist_ids?, vote_type: 'PUBLIC' | 'STAFF' }
router.post('/', authenticate, hasRole('ADMIN'), controller.createQrVote);

// Listar todos los QRs de un evento (públicos + staff)
router.get('/event/:id', authenticate, controller.getQrsByEvent);

// Ver resultados desglosados (votos públicos y de staff)
router.get('/event/:eventId/results', authenticate, controller.getResults);

// Regenerar imagen QR del QR activo de un evento
router.get('/event/:eventId/image', authenticate, controller.regenerateQrImage);

// Obtener imagen QR de cualquier QR por su id (usado para staff)
router.get('/:id/image', authenticate, controller.getQrImage);

// Activar o desactivar un QR
router.patch('/:id/toggle', authenticate, hasRole('ADMIN'), controller.toggleQrActive);

// Eliminar todos los votos de un evento
router.delete('/event/:eventId/votes', authenticate, hasRole('ADMIN'), controller.deleteVotesByEvent);

// Auditar todos los votos de un evento (resumen + detalle con veredicto HMAC)
router.get('/event/:eventId/audit', authenticate, hasRole('ADMIN'), controller.auditVotesByEvent);

// Auditar un voto específico (verificar firma HMAC)
router.get('/audit/:voteId', authenticate, hasRole('ADMIN'), controller.auditVote);

// ─── Rutas Públicas (sin JWT, accesibles desde el QR del público) ─────────────

// Obtener proyectos para votar (sesión pública)
router.get('/vote/:eventId/projects', controller.getProjectsForVoting);

// ─── Rutas de Staff (sin JWT, protegidas por token privado en la URL) ─────────

// Obtener proyectos para votar (sesión staff — el token en la URL ES la autenticación)
router.get('/vote/staff/:staffToken/projects', controller.getProjectsForStaffVoting);

// Registrar voto (tanto público como staff usan el mismo endpoint)
router.post('/vote', controller.registerVote);

export default router;