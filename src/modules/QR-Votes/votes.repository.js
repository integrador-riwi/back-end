import pool from '../../db/pool.js';

const createQrVote = async ({ qr_code_url, expires_at, id_event, created_by, top_n }) => {
    const result = await pool.query(
        `INSERT INTO qr_votes (qr_code_url, expires_at, active, id_event, created_by, top_n)
         VALUES ($1, $2, true, $3, $4, $5)
         RETURNING *`,
        [qr_code_url, expires_at || null, id_event, created_by, top_n]
    );
    return result.rows[0];
};

const getActiveQrByEvent = async (id_event) => {
    const result = await pool.query(
        `SELECT * FROM qr_votes
         WHERE id_event = $1
           AND active = true
           AND (expires_at IS NULL OR expires_at > NOW())
         ORDER BY id DESC
         LIMIT 1`,
        [id_event]
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
         ORDER BY qr.id DESC`,
        [id_event]
    );
    return result.rows;
};

const findExistingVote = async ({ qr_vote_id, voter_ip }) => {
    const result = await pool.query(
        `SELECT id_vote FROM public_votes
         WHERE qr_vote_id = $1 AND voter_ip = $2`,
        [qr_vote_id, voter_ip]
    );
    return result.rows[0] || null;
};

const registerVote = async ({ qr_vote_id, project_id, voter_ip }) => {
    const result = await pool.query(
        `INSERT INTO public_votes (qr_vote_id, project_id, voter_ip)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [qr_vote_id, project_id, voter_ip]
    );
    return result.rows[0];
};

const getProjectsByEvent = async (id_event, top_n) => {
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

const getVoteResultsByEvent = async (id_event) => {
    const result = await pool.query(
        `SELECT p.id_project, p.name AS project_name, t.name AS team_name,
                COUNT(pv.id_vote) AS total_votes
         FROM projects p
                  JOIN teams t ON t.id_team = p.team_id
                  LEFT JOIN public_votes pv ON pv.project_id = p.id_project
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
    return result.rowCount; // número de votos eliminados
};

export {
    createQrVote,
    getActiveQrByEvent,
    getQrById,
    toggleQrActive,
    getQrsByEvent,
    findExistingVote,
    registerVote,
    getProjectsByEvent,
    getVoteResultsByEvent,
    deleteVotesByEvent
};
