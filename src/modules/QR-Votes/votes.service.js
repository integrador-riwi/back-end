import QRCode from 'qrcode';
import * as repo from './votes.repository.js';
import 'dotenv/config';

const createQrVote = async ({ id_event, expires_at, created_by, top_n, finalist_ids }) => {
    const votePageUrl = `${process.env.PUBLIC_URL}/vote/${id_event}`;

    const qrVote = await repo.createQrVote({
        qr_code_url: votePageUrl,
        expires_at,
        id_event,
        created_by,
        top_n,
        finalist_ids,
    });

    // Generar imagen QR en base64 para mostrar en el frontend
    const qrImage = await QRCode.toDataURL(votePageUrl);

    return { qrVote, qrImage };
};

const getQrsByEvent = async (id_event) => {
    return repo.getQrsByEvent(id_event);
};

const toggleQrActive = async (id) => {
    const qr = await repo.getQrById(id);
    if (!qr) throw { status: 404, message: 'QR no encontrado' };
    return repo.toggleQrActive(id);
};

const getProjectsForVoting = async (id_event) => {
    const activeQr = await repo.getActiveQrByEvent(id_event);
    if (!activeQr) throw { status: 403, message: 'La votación no está activa o ha expirado' };

    // Parsear finalist_ids guardados en el QR
    const finalist_ids = activeQr.finalist_ids
        ? (typeof activeQr.finalist_ids === 'string'
            ? JSON.parse(activeQr.finalist_ids)
            : activeQr.finalist_ids)
        : null;

    const projects = await repo.getProjectsByEvent(id_event, activeQr.top_n, finalist_ids);

    return {
        qr_vote_id: activeQr.id,
        top_n: activeQr.top_n,
        projects,
    };
};

const registerVote = async ({ qr_vote_id, project_id, voter_token }) => {
    // Verificar que el QR sigue activo
    const qr = await repo.getQrById(qr_vote_id);

    if (!qr || !qr.active) throw { status: 403, message: 'Sesión de votación inválida o inactiva' };
    if (qr.expires_at && new Date() > new Date(qr.expires_at))
        throw { status: 403, message: 'La votación ha expirado' };

    // Anti-fraude: un voto por token por sesión QR
    const existing = await repo.findExistingVote({ qr_vote_id, voter_token });
    if (existing) throw { status: 409, message: 'Ya registraste tu voto en esta sesión' };

    return repo.registerVote({ qr_vote_id, project_id, voter_token });
};

const getResults = async (id_event) => {
    return repo.getVoteResultsByEvent(id_event);
};

const deleteVotesByEvent = async (id_event) => {
    const deleted = await repo.deleteVotesByEvent(id_event);
    return { deleted_count: deleted };
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
