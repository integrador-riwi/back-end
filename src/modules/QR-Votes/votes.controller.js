import * as service from './votes.service.js';

// POST /api/qr-votes
// Admin: crea una sesión de votación y genera el QR
const createQrVote = async (req, res) => {
    try {
        const { id_event, expires_at } = req.body;
        const created_by = req.user.id_user;

        if (!id_event) return res.status(400).json({ error: 'id_event es requerido' });

        const result = await service.createQrVote({ id_event, expires_at, created_by });
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
        const { qr_vote_id, project_id } = req.body;
        const voter_ip = req.headers['x-forwarded-for']?.split(',')[0] || req.ip;

        if (!qr_vote_id || !project_id)
            return res.status(400).json({ error: 'qr_vote_id y project_id son requeridos' });

        const vote = await service.registerVote({ qr_vote_id, project_id, voter_ip });
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

export {
    createQrVote,
    getQrsByEvent,
    toggleQrActive,
    getProjectsForVoting,
    registerVote,
    getResults,
};
