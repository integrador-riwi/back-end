import pool from '../../db/pool.js';

const createQrVote = async ({ qr_code_url, expires_at, id_event, created_by, top_n, finalist_ids, vote_type = 'PUBLIC', staff_token = null }) => {
    const result = await pool.query(
        `INSERT INTO qr_votes (qr_code_url, expires_at, active, id_event, created_by, top_n, finalist_ids, vote_type, staff_token)
         VALUES ($1, $2, true, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [qr_code_url, expires_at || null, id_event, created_by, top_n, JSON.stringify(finalist_ids || []), vote_type, staff_token]
    );
    return result.rows[0];
};

const getActiveQrByEvent = async (id_event, vote_type = 'PUBLIC') => {
    const result = await pool.query(
        `SELECT * FROM qr_votes
         WHERE id_event = $1
           AND vote_type = $2
           AND active = true
           AND (expires_at IS NULL OR expires_at > NOW())
         ORDER BY id DESC
         LIMIT 1`,
        [id_event, vote_type]
    );
    return result.rows[0] || null;
};

// Buscar QR de staff por su token privado (sin exponer el id)
const getStaffQrByToken = async (staff_token) => {
    const result = await pool.query(
        `SELECT * FROM qr_votes
         WHERE staff_token = $1
           AND vote_type = 'STAFF'
           AND active = true
           AND (expires_at IS NULL OR expires_at > NOW())`,
        [staff_token]
    );
    return result.rows[0] || null;
};

const getQrById = async (id) => {
    const result = await pool.query(
        `SELECT * FROM qr_votes WHERE id = $1`,
        [id]
    );
    return result.rows[0] || null;
};

const toggleQrActive = async (id) => {
    const result = await pool.query(
        `UPDATE qr_votes SET active = NOT active WHERE id = $1 RETURNING *`,
        [id]
    );
    return result.rows[0];
};

const getQrsByEvent = async (id_event) => {
    const result = await pool.query(
        `SELECT qr.*, u.name as created_by_name
         FROM qr_votes qr
                  JOIN users u ON u.id_user = qr.created_by
         WHERE qr.id_event = $1
         ORDER BY qr.vote_type, qr.id DESC`,
        [id_event]
    );
    return result.rows;
};

const findExistingVote = async ({ qr_vote_id, voter_token }) => {
    const result = await pool.query(
        `SELECT id_vote FROM public_votes
         WHERE qr_vote_id = $1 AND voter_token = $2`,
        [qr_vote_id, voter_token]
    );
    return result.rows[0] || null;
};

const registerVote = async ({ qr_vote_id, project_id, voter_token, voter_role = 'PUBLIC', voter_ip = null, vote_hash = null, voted_at = null }) => {
    // INSERT ON CONFLICT elimina la race condition del SELECT+INSERT.
    // Requiere: UNIQUE(qr_vote_id, voter_token) en public_votes.
    const votedAtValue = voted_at ? new Date(voted_at) : new Date();
    const result = await pool.query(
        `INSERT INTO public_votes (qr_vote_id, project_id, voter_token, voter_role, voter_ip, vote_hash, voted_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (qr_vote_id, voter_token) DO NOTHING
         RETURNING *`,
        [qr_vote_id, project_id, voter_token, voter_role, voter_ip, vote_hash, votedAtValue]
    );
    // Si DO NOTHING disparó, el token ya había votado
    if (!result.rows[0]) {
        const err = new Error('Ya registraste tu voto en esta sesión');
        err.status = 409;
        throw err;
    }
    return result.rows[0];
};

const getVoteById = async (voteId) => {
    const result = await pool.query(
        `SELECT pv.id_vote, pv.qr_vote_id, pv.project_id, pv.voter_token,
                pv.voter_role, pv.voter_ip, pv.vote_hash, pv.voted_at,
                p.name AS project_name
         FROM public_votes pv
         LEFT JOIN projects p ON p.id_project = pv.project_id
         WHERE pv.id_vote = $1`,
        [voteId]
    );
    return result.rows[0] || null;
};

const getVotesByEvent = async (eventId) => {
    const result = await pool.query(
        `SELECT pv.id_vote, pv.qr_vote_id, pv.project_id, pv.voter_token,
                pv.voter_role, pv.voter_ip, pv.vote_hash, pv.voted_at,
                p.name AS project_name
         FROM public_votes pv
         JOIN qr_votes qr ON qr.id = pv.qr_vote_id
         LEFT JOIN projects p ON p.id_project = pv.project_id
         WHERE qr.id_event = $1
         ORDER BY pv.voted_at DESC`,
        [eventId]
    );
    return result.rows;
};

const getProjectsByEvent = async (id_event, top_n, finalist_ids) => {
    if (finalist_ids && finalist_ids.length > 0) {
        const result = await pool.query(
            `SELECT p.id_project, p.name, p.description, p.preview_photo_url,
                    t.name AS team_name
             FROM projects p
                      JOIN teams t ON t.id_team = p.team_id
             WHERE p.id_project = ANY($1::int[])`,
            [finalist_ids]
        );
        return result.rows;
    }
    const result = await pool.query(
        `SELECT p.id_project, p.name, p.description, p.preview_photo_url,
                t.name AS team_name
         FROM projects p
                  JOIN teams t ON t.id_team = p.team_id
         WHERE p.id_event = $1
         ORDER BY p.project_final_grade DESC NULLS LAST
         LIMIT $2`,
        [id_event, top_n]
    );
    return result.rows;
};

// Resultados separados por tipo de votante
const getVoteResultsByEvent = async (id_event) => {
    const result = await pool.query(
        `SELECT p.id_project, p.name AS project_name, t.name AS team_name,
                COUNT(pv.id_vote)                                             AS total_votes,
                COUNT(pv.id_vote) FILTER (WHERE pv.voter_role = 'PUBLIC')    AS public_votes,
                COUNT(pv.id_vote) FILTER (WHERE pv.voter_role = 'STAFF')     AS staff_votes
         FROM projects p
                  JOIN teams t ON t.id_team = p.team_id
                  LEFT JOIN public_votes pv ON pv.project_id = p.id_project
                      AND pv.vote_hash IS NOT NULL
                  LEFT JOIN qr_votes qr ON qr.id = pv.qr_vote_id AND qr.id_event = $1
         WHERE p.id_event = $1
         GROUP BY p.id_project, p.name, t.name
         ORDER BY total_votes DESC`,
        [id_event]
    );
    return result.rows;
};

const deleteVotesByEvent = async (id_event) => {
    const result = await pool.query(
        `DELETE FROM public_votes
         WHERE qr_vote_id IN (
             SELECT id FROM qr_votes WHERE id_event = $1
         )
         RETURNING id_vote`,
        [id_event]
    );
    return result.rowCount;
};

export {
    createQrVote,
    getActiveQrByEvent,
    getStaffQrByToken,
    getQrById,
    toggleQrActive,
    getQrsByEvent,
    findExistingVote,
    registerVote,
    getVoteById,
    getVotesByEvent,
    getProjectsByEvent,
    getVoteResultsByEvent,
    deleteVotesByEvent,
};