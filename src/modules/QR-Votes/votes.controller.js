import * as service from './votes.service.js';
import { getIO } from '../../socket/index.js';

// Extrae la IP real del votante respetando proxies (Vercel, Render, etc.)
function getClientIp(req) {
    return (
        req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
        req.headers['x-real-ip'] ||
        req.socket?.remoteAddress ||
        null
    );
}

// Debounce del emit de socket — agrupa ráfagas de votos en un solo evento
// para no saturar al admin con 200 re-renders seguidos
const _debounceTimers = new Map();
function _debouncedEmit(io, key, event, data, delayMs = 800) {
    if (_debounceTimers.has(key)) clearTimeout(_debounceTimers.get(key));
    _debounceTimers.set(key, setTimeout(() => {
        io.emit(event, data);
        _debounceTimers.delete(key);
    }, delayMs));
}

// POST /api/qr-votes
// Admin: crea una sesión de votación (pública o de staff)
// Body: { id_event, expires_at?, top_n, finalist_ids?, vote_type? }
const createQrVote = async (req, res) => {
    try {
        const { id_event, expires_at, top_n, finalist_ids, vote_type = 'PUBLIC' } = req.body;
        const created_by = req.user.id_user;

        if (!id_event) return res.status(400).json({ error: 'id_event es requerido' });
        if (!top_n || top_n < 1) return res.status(400).json({ error: 'top_n debe ser un número mayor a 0' });
        if (!['PUBLIC', 'STAFF'].includes(vote_type))
            return res.status(400).json({ error: 'vote_type debe ser PUBLIC o STAFF' });

        const result = await service.createQrVote({ id_event, expires_at, created_by, top_n, finalist_ids, vote_type });
        res.status(201).json(result);
    } catch (err) {
        res.status(err.status || 500).json({ error: err.message || 'Error al crear QR de votación' });
    }
};

// GET /api/qr-votes/event/:id
// Admin: lista todos los QRs de un evento (públicos y de staff)
const getQrsByEvent = async (req, res) => {
    try {
        const { id } = req.params;
        const qrs = await service.getQrsByEvent(id);
        res.json(qrs);
    } catch (err) {
        res.status(err.status || 500).json({ error: err.message || 'Error al obtener QRs' });
    }
};

// PATCH /api/qr-votes/:id/toggle
// Admin: activa o desactiva un QR
const toggleQrActive = async (req, res) => {
    try {
        const updated = await service.toggleQrActive(req.params.id);
        res.json(updated);
    } catch (err) {
        res.status(err.status || 500).json({ error: err.message || 'Error al actualizar QR' });
    }
};

// GET /api/vote/:eventId/projects
// Público: carga los proyectos del evento para votar (sesión pública)
const getProjectsForVoting = async (req, res) => {
    try {
        const data = await service.getProjectsForVoting(req.params.eventId);
        res.json(data);
    } catch (err) {
        res.status(err.status || 500).json({ error: err.message || 'Error al cargar proyectos' });
    }
};

// GET /api/vote/staff/:staffToken/projects
// Staff: carga los proyectos usando el token privado del enlace de staff
const getProjectsForStaffVoting = async (req, res) => {
    try {
        const data = await service.getProjectsForStaffVoting(req.params.staffToken);
        res.json(data);
    } catch (err) {
        res.status(err.status || 500).json({ error: err.message || 'Error al cargar proyectos para staff' });
    }
};

// POST /api/vote
// Público / Staff: registra el voto
// Body: { qr_vote_id, project_id, voter_token }
const registerVote = async (req, res) => {
    try {
        const { qr_vote_id, project_id, voter_token } = req.body;

        if (!qr_vote_id || !project_id || !voter_token)
            return res.status(400).json({ error: 'qr_vote_id, project_id y voter_token son requeridos' });

        const voter_ip = getClientIp(req);
        const vote = await service.registerVote({ qr_vote_id, project_id, voter_token, voter_ip });

        const io = getIO();
        if (io) _debouncedEmit(io, `votes_event_${qr_vote_id}`, 'vote:new', { qr_vote_id, project_id });

        res.status(201).json({ success: true, message: '¡Voto registrado exitosamente!', vote });
    } catch (err) {
        res.status(err.status || 500).json({ error: err.message || 'Error al registrar voto' });
    }
};

// GET /api/qr-votes/event/:eventId/results
// Admin: resultados separados por votos públicos y de staff
const getResults = async (req, res) => {
    try {
        const results = await service.getResults(req.params.eventId);
        res.json(results);
    } catch (err) {
        res.status(err.status || 500).json({ error: err.message || 'Error al obtener resultados' });
    }
};

// DELETE /api/qr-votes/event/:eventId/votes
// Admin: elimina todos los votos de un evento
const deleteVotesByEvent = async (req, res) => {
    try {
        const result = await service.deleteVotesByEvent(req.params.eventId);
        res.json({ success: true, message: `Se eliminaron ${result.deleted_count} voto(s) del evento`, ...result });
    } catch (err) {
        res.status(err.status || 500).json({ error: err.message || 'Error al eliminar votos' });
    }
};

// GET /api/qr-votes/event/:eventId/audit
// Admin: audita todos los votos de un evento y devuelve resumen + detalle
const auditVotesByEvent = async (req, res) => {
    try {
        const result = await service.auditVotesByEvent(req.params.eventId);
        res.json({ success: true, ...result });
    } catch (err) {
        res.status(err.status || 500).json({ error: err.message || 'Error al auditar votos' });
    }
};

// GET /api/qr-votes/audit/:voteId
// Admin: verifica si un voto específico tiene firma HMAC válida
const auditVote = async (req, res) => {
    try {
        const result = await service.auditVote(req.params.voteId);
        res.json({ success: true, audit: result });
    } catch (err) {
        res.status(err.status || 500).json({ error: err.message || 'Error al auditar voto' });
    }
};

export {
    createQrVote,
    getQrsByEvent,
    toggleQrActive,
    getProjectsForVoting,
    getProjectsForStaffVoting,
    registerVote,
    getResults,
    deleteVotesByEvent,
    auditVote,
    auditVotesByEvent,
};