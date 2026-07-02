import pool from '../../db/pool.js';

export const getEventById = async (eventId) => {
    const result = await pool.query(
        `SELECT id_event, event_name, title, event_status, status
         FROM events
         WHERE id_event = $1`,
        [eventId],
    );
    return result.rows[0] ?? null;
};

export const getFinalistsByEvent = async (eventId) => {
    const result = await pool.query(
        `SELECT
             f.id_finalist,
             f.id_project,
             f.event_id,
             f.second_grade,
             f.votes_result,
             f.votes_count,
             f.final_grade,
             p.name             AS project_name,
             p.repo_url,
             p.preview_photo_url,
             p.video_url,
             p.presentation_url,
             p.deploy_url,
             t.id_team,
             t.name             AS team_name
         FROM finalists f
                  JOIN projects p ON p.id_project = f.id_project
                  JOIN teams t    ON t.id_team    = p.team_id
         WHERE f.event_id = $1
         ORDER BY f.final_grade ASC NULLS LAST`,
        [eventId],
    );
    return result.rows;
};

export const getFinalistsCountByEvent = async (eventId) => {
    const result = await pool.query(
        `SELECT COUNT(*)::int AS count FROM finalists WHERE event_id = $1`,
        [eventId],
    );
    return result.rows[0].count;
};

// Returns all projects for an event with the same team score rule used by ranking:
// each area excludes only members with a zero score in that specific area.
export const getTopProjectsByScore = async (eventId, limit = 3) => {
    const result = await pool.query(
        `WITH calculated_projects AS (
             SELECT DISTINCT ipr.project_id
             FROM individual_project_results ipr
             JOIN projects p ON p.id_project = ipr.project_id
             WHERE p.id_event = $1
         ),
         team_area_scores AS (
             SELECT
                 p.id_project,
                 iar.area,
                 COALESCE(
                     AVG(iar.final_score) FILTER (WHERE COALESCE(iar.final_score, 0) <> 0),
                     0
                 ) AS area_score
             FROM projects p
             JOIN individual_area_results iar ON iar.project_id = p.id_project
             WHERE p.id_event = $1
             GROUP BY p.id_project, iar.area
         ),
         team_scores AS (
             SELECT
                 id_project,
                 ROUND(
                     COALESCE(
                         (
                             SUM(area_score * CASE area
                                 WHEN 'DEVELOPMENT' THEN 0.55
                                 WHEN 'ENGLISH' THEN 0.25
                                 WHEN 'SOFT_SKILLS' THEN 0.2
                                 ELSE 0
                             END)
                             / NULLIF(SUM(CASE area
                                 WHEN 'DEVELOPMENT' THEN 0.55
                                 WHEN 'ENGLISH' THEN 0.25
                                 WHEN 'SOFT_SKILLS' THEN 0.2
                                 ELSE 0
                             END), 0)
                         ),
                         0
                     )::numeric,
                     4
                 ) AS team_score
             FROM team_area_scores
             GROUP BY id_project
         )
         SELECT
             p.id_project,
             p.name                                  AS project_name,
             t.id_team,
             t.name                                  AS team_name,
             COALESCE(ts.team_score, 0)              AS team_score
         FROM calculated_projects cp
                  JOIN projects p ON p.id_project = cp.project_id
                  JOIN teams t    ON t.id_team    = p.team_id
                  LEFT JOIN team_scores ts ON ts.id_project = p.id_project
         WHERE p.id_event = $1
         ORDER BY team_score DESC
         LIMIT $2`,
        [eventId, limit],
    );
    return result.rows;
};

export const getVoteCountsByEvent = async (eventId) => {
    // Returns points per project (pos1=3pts, pos2=2pts, pos3=1pt)
    const result = await pool.query(
        `SELECT
             vr.project_id,
             COALESCE(SUM(vr.points), 0)::integer AS votes_count
         FROM vote_rankings vr
                  JOIN public_votes pv ON pv.id_vote = vr.id_vote
                  JOIN qr_votes qr ON qr.id = pv.qr_vote_id
         WHERE qr.id_event = $1
           AND pv.vote_hash IS NOT NULL
           AND pv.voter_role = 'PUBLIC'
         GROUP BY vr.project_id`,
        [eventId],
    );
    return result.rows;
};

// Inserts the calculated finalists and closes the event in a single atomic transaction.
export const saveFinalists = async (eventId, finalists) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const inserted = [];
        for (const f of finalists) {
            const { rows } = await client.query(
                `INSERT INTO finalists
                 (id_project, event_id, second_grade, votes_result, votes_count, final_grade)
                 VALUES ($1, $2, $3, $4, $5, $6)
                 RETURNING *`,
                [f.id_project, eventId, f.second_grade, f.votes_result, f.votes_count, f.final_grade],
            );
            inserted.push(rows[0]);
        }

        await client.query('COMMIT');
        return inserted;
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
};

export const setFinalists = async (eventId, projectIds, secondGrades = null) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        await client.query(`DELETE FROM finalists WHERE event_id = $1`, [eventId]);
        for (let i = 0; i < projectIds.length; i++) {
            await client.query(
                `INSERT INTO finalists (id_project, event_id, second_grade)
                 VALUES ($1, $2, $3)`,
                [projectIds[i], eventId, secondGrades ? secondGrades[i] : null],
            );
        }
        await client.query('COMMIT');
        return true;
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
};

export const updateFinalistVotes = async (finalistId, votesResult) => {
    const result = await pool.query(
        `UPDATE finalists SET votes_result = $1 WHERE id_finalist = $2 RETURNING *`,
        [votesResult, finalistId],
    );
    return result.rows[0];
};

export const updateFinalistFinalGrade = async (finalistId, finalGrade) => {
    const result = await pool.query(
        `UPDATE finalists SET final_grade = $1 WHERE id_finalist = $2 RETURNING *`,
        [finalGrade, finalistId],
    );
    return result.rows[0];
};

export const getTopProjectsFromRanking = getTopProjectsByScore;

export default {
    getEventById,
    getFinalistsByEvent,
    getFinalistsCountByEvent,
    getTopProjectsByScore,
    getVoteCountsByEvent,
    saveFinalists,
    setFinalists,
    updateFinalistVotes,
    updateFinalistFinalGrade,
    getTopProjectsFromRanking,
};
