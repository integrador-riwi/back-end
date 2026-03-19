import QRCode from 'qrcode';
import crypto from 'crypto';
import * as repo from './votes.repository.js';
import 'dotenv/config';

// ── Crear sesión de votación (pública o de staff) ────────────────────────────
const createQrVote = async ({ id_event, expires_at, created_by, top_n, finalist_ids, vote_type = 'PUBLIC' }) => {
    const isStaff = vote_type === 'STAFF';

    const staff_token = isStaff ? crypto.randomUUID() : null;

    const votePageUrl = isStaff
        ? `${process.env.PUBLIC_URL}/staff-vote/${staff_token}`
        : `${process.env.PUBLIC_URL}/vote/${id_event}`;

    const qrVote = await repo.createQrVote({
        qr_code_url: votePageUrl,
        expires_at,
        id_event,
        created_by,
        top_n,
        finalist_ids,
        vote_type,
        staff_token,
    });

    // Solo generar imagen QR para sesiones públicas
    const qrImage = isStaff ? null : await QRCode.toDataURL(votePageUrl);

    return { qrVote, qrImage, votePageUrl };
};

const getQrsByEvent = async (id_event) => {
    return repo.getQrsByEvent(id_event);
};

const toggleQrActive = async (id) => {
    const qr = await repo.getQrById(id);
    if (!qr) throw { status: 404, message: 'QR no encontrado' };
    return repo.toggleQrActive(id);
};

// ── Cargar proyectos para votar (público) ─────────────────────────────────────
const getProjectsForVoting = async (id_event) => {
    const activeQr = await repo.getActiveQrByEvent(id_event, 'PUBLIC');
    if (!activeQr) throw { status: 403, message: 'La votación pública no está activa o ha expirado' };

    const finalist_ids = _parseFinalistIds(activeQr.finalist_ids);
    const projects = await repo.getProjectsByEvent(id_event, activeQr.top_n, finalist_ids);

    return {
        qr_vote_id: activeQr.id,
        vote_type: 'PUBLIC',
        top_n: activeQr.top_n,
        projects,
    };
};

// ── Cargar proyectos para votar (staff, por token privado) ────────────────────
const getProjectsForStaffVoting = async (staff_token) => {
    const activeQr = await repo.getStaffQrByToken(staff_token);
    if (!activeQr) throw { status: 403, message: 'El enlace de votación es inválido, ya expiró o no está activo' };

    const finalist_ids = _parseFinalistIds(activeQr.finalist_ids);
    const projects = await repo.getProjectsByEvent(activeQr.id_event, activeQr.top_n, finalist_ids);

    return {
        qr_vote_id: activeQr.id,
        vote_type: 'STAFF',
        top_n: activeQr.top_n,
        projects,
    };
};

// ── Registrar voto (público o staff) ─────────────────────────────────────────
const registerVote = async ({ qr_vote_id, project_id, voter_token }) => {
    const qr = await repo.getQrById(qr_vote_id);

    if (!qr || !qr.active)
        throw { status: 403, message: 'Sesión de votación inválida o inactiva' };
    if (qr.expires_at && new Date() > new Date(qr.expires_at))
        throw { status: 403, message: 'La votación ha expirado' };

    const existing = await repo.findExistingVote({ qr_vote_id, voter_token });
    if (existing) throw { status: 409, message: 'Ya registraste tu voto en esta sesión' };

    // El voter_role queda registrado según el tipo de sesión QR
    const voter_role = qr.vote_type === 'STAFF' ? 'STAFF' : 'PUBLIC';

    return repo.registerVote({ qr_vote_id, project_id, voter_token, voter_role });
};

const getResults = async (id_event) => {
    return repo.getVoteResultsByEvent(id_event);
};

const deleteVotesByEvent = async (id_event) => {
    const deleted = await repo.deleteVotesByEvent(id_event);
    return { deleted_count: deleted };
};

// ── Helper ────────────────────────────────────────────────────────────────────
function _parseFinalistIds(raw) {
    if (!raw) return null;
    if (typeof raw === 'string') {
        try { return JSON.parse(raw); } catch { return null; }
    }
    return raw;
}

export {
    createQrVote,
    getQrsByEvent,
    toggleQrActive,
    getProjectsForVoting,
    getProjectsForStaffVoting,
    registerVote,
    getResults,
    deleteVotesByEvent,
};