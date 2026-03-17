import * as service from './votes.service.js';
import { getIO } from '../../socket/index.js';

// POST /api/qr-votes
// Admin: crea una sesión de votación y genera el QR
const createQrVote = async (req, res) => {
    try {
        const { id_event, expires_at, top_n, finalist_ids } = req.body;
        const created_by = req.user.id_user;

        if (!id_event) return res.status(400).json({ error: 'id_event es requerido' });
        if (!top_n || top_n < 1) return res.status(400).json({ error: 'top_n debe ser un número mayor a 0' });

        const result = await service.createQrVote({ id_event, expires_at, created_by, top_n, finalist_ids });
        res.status(201).json(result);
    } catch (err) {
        const status = err.status || 500;
        res.status(status).json({ error: err.message || 'Error al crear QR de votación' });
    }
};

// GET /api/qr-votes/event/:eventId
// Admin: lista todos los QRs de un evento
const getQrsByEvent = async (req, res) => {
    try {
        const { eventId } = req.params;
        const qrs = await service.getQrsByEvent(eventId);
        res.json(qrs);
    } catch (err) {
        const status = err.status || 500;
        res.status(status).json({ error: err.message || 'Error al obtener QRs' });
    }
};

// PATCH /api/qr-votes/:id/toggle
// Admin: activa o desactiva un QR
const toggleQrActive = async (req, res) => {
    try {
        const { id } = req.params;
        const updated = await service.toggleQrActive(id);
        res.json(updated);
    } catch (err) {
        const status = err.status || 500;
        res.status(status).json({ error: err.message || 'Error al actualizar QR' });
    }
};

// GET /api/vote/:eventId/projects
// Público: carga los proyectos del evento para votar
const getProjectsForVoting = async (req, res) => {
    try {
        const { eventId } = req.params;
        const data = await service.getProjectsForVoting(eventId);
        res.json(data);
    } catch (err) {
        const status = err.status || 500;
        res.status(status).json({ error: err.message || 'Error al cargar proyectos' });
    }
};

// POST /api/vote
// Público: registra el voto de una persona externa
const registerVote = async (req, res) => {
    try {
        const { qr_vote_id, project_id, voter_token } = req.body;

        if (!qr_vote_id || !project_id || !voter_token)
            return res.status(400).json({ error: 'qr_vote_id, project_id y voter_token son requeridos' });

        const vote = await service.registerVote({ qr_vote_id, project_id, voter_token });

        const io = getIO();
        if (io) {
            io.emit("vote:new", { qr_vote_id, project_id, vote });
        }

        res.status(201).json({ success: true, message: '¡Voto registrado exitosamente!', vote });

    } catch (err) {
        const status = err.status || 500;
        res.status(status).json({ error: err.message || 'Error al registrar voto' });
    }
};

// GET /api/qr-votes/event/:eventId/results
// Admin: resultados de votos del público por evento
const getResults = async (req, res) => {
    try {
        const { eventId } = req.params;
        const results = await service.getResults(eventId);
        res.json(results);
    } catch (err) {
        const status = err.status || 500;
        res.status(status).json({ error: err.message || 'Error al obtener resultados' });
    }
};

// DELETE /api/qr-votes/event/:eventId/votes
// Admin: elimina todos los votos públicos de un evento
const deleteVotesByEvent = async (req, res) => {
    try {
        const { eventId } = req.params;
        const result = await service.deleteVotesByEvent(eventId);
        res.json({
            success: true,
            message: `Se eliminaron ${result.deleted_count} voto(s) del evento`,
            ...result,
        });
    } catch (err) {
        const status = err.status || 500;
        res.status(status).json({ error: err.message || 'Error al eliminar votos' });
    }
};

export {
    createQrVote,
    getQrsByEvent,
    toggleQrActive,
    getProjectsForVoting,
    registerVote,
    getResults,
    deleteVotesByEvent,
};
