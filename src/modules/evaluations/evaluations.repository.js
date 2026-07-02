import pool from "../../db/pool.js";

// ── Rubrics ───────────────────────────────────────────────────────────────────

export const getRubricsByEvent = async (eventId) => {
    const query = `
        SELECT
            id_rubric,
            id_event,
            area,
            name,
            description,
            weight,
            active
        FROM rubrics
        WHERE id_event = $1 AND active = true
        ORDER BY area, name
    `;
    const result = await pool.query(query, [eventId]);
    return result.rows;
};

export const getGradesByRubric = async (rubricId) => {
    const query = `
        SELECT id_grade, id_rubric, score, name, description
        FROM grades
        WHERE id_rubric = $1
        ORDER BY score DESC
    `;
    const result = await pool.query(query, [rubricId]);
    return result.rows;
};

// ── Evaluations ───────────────────────────────────────────────────────────────

export const getExistingEvaluation = async ({
                                                projectId,
                                                evaluatorUserId,
                                                evaluatedUserId,
                                                area,
                                            }) => {
    const query = `
        SELECT id_evaluation
        FROM evaluations
        WHERE project_id = $1
          AND evaluator_user_id = $2
          AND evaluated_user_id = $3
          AND area = $4::evaluation_area
    `;
    const result = await pool.query(query, [
        projectId,
        evaluatorUserId,
        evaluatedUserId,
        area,
    ]);
    return result.rows[0] || null;
};

export const upsertEvaluation = async ({
                                           projectId,
                                           eventId,
                                           evaluatorUserId,
                                           evaluatedUserId,
                                           area,
                                           feedback,
                                           gradeId,
                                           idRubric,
                                       }) => {
    const query = `
        INSERT INTO evaluations
        (project_id, event_id, evaluator_user_id, evaluated_user_id, area, feedback, id_grade, id_rubric)
        VALUES ($1, $2, $3, $4, $5::evaluation_area, $6, $7, $8)
        ON CONFLICT (project_id, evaluator_user_id, evaluated_user_id, id_rubric)
            DO UPDATE SET
                          feedback  = EXCLUDED.feedback,
                          id_grade  = EXCLUDED.id_grade,
                          event_id  = EXCLUDED.event_id
        RETURNING id_evaluation, project_id, event_id, evaluator_user_id, evaluated_user_id, area, feedback, id_grade, id_rubric, created_at
    `;
    const result = await pool.query(query, [
        projectId,
        eventId,
        evaluatorUserId,
        evaluatedUserId,
        area,
        feedback ?? null,
        gradeId,
        idRubric,
    ]);
    return result.rows[0];
};

export const getEvaluationsByProject = async (projectId, evaluatorUserId) => {
    const query = `
        SELECT
            e.id_evaluation,
            e.project_id,
            e.event_id,
            e.evaluator_user_id,
            e.evaluated_user_id,
            e.area,
            e.feedback,
            e.created_at,
            e.id_grade,
            e.id_rubric,
            g.score,
            g.name AS grade_name,
            g.description AS grade_description,
            u.name AS evaluated_name,
            r.name AS rubric_name,
            r.weight
        FROM evaluations e
                 JOIN grades g ON e.id_grade = g.id_grade
                 JOIN rubrics r ON g.id_rubric = r.id_rubric
                 JOIN users u ON e.evaluated_user_id = u.id_user
        WHERE e.project_id = $1
          AND e.evaluator_user_id = $2
        ORDER BY e.evaluated_user_id, e.area
    `;
    const result = await pool.query(query, [projectId, evaluatorUserId]);
    return result.rows;
};

export const getEvaluationSummaryByProjectAndEvaluator = async (
    projectId,
    evaluatorUserId,
) => {
    const query = `
        WITH member_area_scores AS (
            SELECT
                e.project_id,
                e.evaluator_user_id,
                e.area,
                e.evaluated_user_id,
                u.name AS evaluated_name,
                u.github_avatar_url,
                ROUND(
                    (
                        SUM(g.score * COALESCE(NULLIF(r.weight, 0), 1))
                        / NULLIF(SUM(COALESCE(NULLIF(r.weight, 0), 1)), 0)
                    )::numeric,
                    2
                ) AS member_score,
                COUNT(DISTINCT r.id_rubric) AS rubric_count,
                MAX(e.created_at) AS last_evaluated_at
            FROM evaluations e
                     JOIN grades g ON g.id_grade = e.id_grade
                     JOIN rubrics r ON r.id_rubric = e.id_rubric
                     JOIN users u ON u.id_user = e.evaluated_user_id
            WHERE e.project_id = $1
              AND e.evaluator_user_id = $2
            GROUP BY
                e.project_id,
                e.evaluator_user_id,
                e.area,
                e.evaluated_user_id,
                u.name,
                u.github_avatar_url
        ),
        area_scores AS (
            SELECT
                area,
                ROUND(
                    COALESCE(
                        AVG(member_score) FILTER (WHERE COALESCE(member_score, 0) <> 0),
                        0
                    )::numeric,
                    2
                ) AS area_score,
                COUNT(*) AS member_count,
                COUNT(*) FILTER (WHERE COALESCE(member_score, 0) <> 0)
                    AS counted_member_count,
                COUNT(*) FILTER (WHERE COALESCE(member_score, 0) = 0)
                    AS zero_member_count,
                MAX(last_evaluated_at) AS last_evaluated_at
            FROM member_area_scores
            GROUP BY area
        )
        SELECT
            COALESCE(
                json_agg(
                    json_build_object(
                        'area', area,
                        'area_score', area_score,
                        'member_count', member_count,
                        'counted_member_count', counted_member_count,
                        'zero_member_count', zero_member_count,
                        'last_evaluated_at', last_evaluated_at
                    )
                    ORDER BY area
                ),
                '[]'::json
            ) AS areas,
            COALESCE(
                (
                    SELECT json_agg(
                        json_build_object(
                            'area', area,
                            'evaluated_user_id', evaluated_user_id,
                            'evaluated_name', evaluated_name,
                            'github_avatar_url', github_avatar_url,
                            'member_score', member_score,
                            'rubric_count', rubric_count,
                            'last_evaluated_at', last_evaluated_at
                        )
                        ORDER BY area, evaluated_name
                    )
                    FROM member_area_scores
                ),
                '[]'::json
            ) AS members
        FROM area_scores
    `;
    const result = await pool.query(query, [projectId, evaluatorUserId]);
    return result.rows[0] ?? { areas: [], members: [] };
};

export const getRawEvaluationsForProject = async (projectId) => {
    const query = `
        SELECT
            e.evaluated_user_id,
            e.evaluator_user_id,
            e.area,
            e.id_rubric,
            r.weight,
            g.score,
            u.name AS evaluated_name
        FROM evaluations e
                 JOIN grades g ON e.id_grade = g.id_grade
                 JOIN rubrics r ON e.id_rubric = r.id_rubric
                 JOIN users u ON e.evaluated_user_id = u.id_user
        WHERE e.project_id = $1
        ORDER BY e.evaluated_user_id, e.area, e.id_rubric
    `;
    const result = await pool.query(query, [projectId]);
    return result.rows;
};

/**
 * Returns all active rubrics for the event linked to this project.
 */
export const getRubricsForProject = async (projectId) => {
    const query = `
        SELECT r.id_rubric, r.area, r.weight, r.name
        FROM rubrics r
                 JOIN projects p ON p.id_event = r.id_event
        WHERE p.id_project = $1 AND r.active = true
        ORDER BY r.area, r.id_rubric
    `;
    const result = await pool.query(query, [projectId]);
    return result.rows;
};

// ── individual_area_results upsert ───────────────────────────────────────────

export const upsertAreaResult = async ({
                                           projectId,
                                           userId,
                                           area,
                                           finalScore,
                                       }) => {
    const query = `
        INSERT INTO individual_area_results (project_id, user_id, area, final_score, calculated_at)
        VALUES ($1, $2, $3::evaluation_area, $4, now())
        ON CONFLICT (project_id, user_id, area)
            DO UPDATE SET final_score = EXCLUDED.final_score, calculated_at = now()
        RETURNING *
    `;
    const result = await pool.query(query, [projectId, userId, area, finalScore]);
    return result.rows[0];
};

// ── individual_project_results upsert ────────────────────────────────────────

export const upsertProjectResult = async ({
                                              projectId,
                                              userId,
                                              finalScore,
                                          }) => {
    const query = `
        INSERT INTO individual_project_results (project_id, user_id, final_score, calculated_at)
        VALUES ($1, $2, $3, now())
        ON CONFLICT (project_id, user_id)
            DO UPDATE SET final_score = EXCLUDED.final_score, calculated_at = now()
        RETURNING *
    `;
    const result = await pool.query(query, [projectId, userId, finalScore]);
    return result.rows[0];
};

export const getProjectsWithExistingResultsForEvent = async (eventId) => {
    const query = `
        SELECT DISTINCT ipr.project_id
        FROM individual_project_results ipr
                 JOIN projects p ON p.id_project = ipr.project_id
        WHERE p.id_event = $1
        ORDER BY ipr.project_id
    `;
    const result = await pool.query(query, [eventId]);
    return result.rows.map((row) => row.project_id);
};

export const getExistingProjectResultUsers = async (projectId) => {
    const query = `
        SELECT user_id
        FROM individual_project_results
        WHERE project_id = $1
    `;
    const result = await pool.query(query, [projectId]);
    return result.rows;
};

export const getExistingAreaResultRows = async (projectId) => {
    const query = `
        SELECT user_id, area
        FROM individual_area_results
        WHERE project_id = $1
    `;
    const result = await pool.query(query, [projectId]);
    return result.rows;
};

export const updateAreaResult = async ({
                                           projectId,
                                           userId,
                                           area,
                                           finalScore,
                                       }) => {
    const query = `
        UPDATE individual_area_results
        SET final_score = $4, calculated_at = now()
        WHERE project_id = $1
          AND user_id = $2
          AND area = $3::evaluation_area
        RETURNING *
    `;
    const result = await pool.query(query, [projectId, userId, area, finalScore]);
    return result.rows[0] || null;
};

export const updateProjectResult = async ({
                                              projectId,
                                              userId,
                                              finalScore,
                                          }) => {
    const query = `
        UPDATE individual_project_results
        SET final_score = $3, calculated_at = now()
        WHERE project_id = $1
          AND user_id = $2
        RETURNING *
    `;
    const result = await pool.query(query, [projectId, userId, finalScore]);
    return result.rows[0] || null;
};

// ── Read results ─────────────────────────────────────────────────────────────

export const getProjectResults = async (projectId) => {
    const query = `
        SELECT
            ipr.user_id,
            u.name             AS user_name,
            u.email,
            u.github_avatar_url,
            ipr.final_score,
            ipr.calculated_at,
            json_agg(
                    json_build_object(
                            'area',        iar.area,
                            'final_score', iar.final_score
                    ) ORDER BY iar.area
            ) AS area_scores
        FROM individual_project_results ipr
                 JOIN users u ON u.id_user = ipr.user_id
                 LEFT JOIN individual_area_results iar
                           ON iar.project_id = ipr.project_id AND iar.user_id = ipr.user_id
        WHERE ipr.project_id = $1
        GROUP BY
            ipr.user_id, u.name, u.email, u.github_avatar_url,
            ipr.final_score, ipr.calculated_at
        ORDER BY ipr.final_score DESC
    `;
    const result = await pool.query(query, [projectId]);
    return result.rows;
};

export const getProjectResultsSummary = async (projectId) => {
    const query = `
        WITH team_area_scores AS (
            SELECT
                area,
                ROUND(
                    COALESCE(
                        AVG(final_score) FILTER (WHERE COALESCE(final_score, 0) <> 0),
                        0
                    )::numeric,
                    2
                ) AS area_score,
                COUNT(user_id) AS member_count,
                COUNT(user_id) FILTER (WHERE COALESCE(final_score, 0) <> 0)
                    AS counted_member_count,
                COUNT(user_id) FILTER (WHERE COALESCE(final_score, 0) = 0)
                    AS zero_member_count,
                MAX(calculated_at) AS last_calculated_at
            FROM individual_area_results
            WHERE project_id = $1
            GROUP BY area
        ),
        project_score AS (
            SELECT
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
                    2
                ) AS final_score
            FROM team_area_scores
        )
        SELECT
            COALESCE((SELECT final_score FROM project_score), 0) AS project_score,
            COALESCE(
                (
                    SELECT json_agg(
                        json_build_object(
                            'area', area,
                            'score', area_score,
                            'member_count', member_count,
                            'counted_member_count', counted_member_count,
                            'zero_member_count', zero_member_count,
                            'last_calculated_at', last_calculated_at
                        )
                        ORDER BY area
                    )
                    FROM team_area_scores
                ),
                '[]'::json
            ) AS area_summary
    `;
    const result = await pool.query(query, [projectId]);
    return result.rows[0] ?? { project_score: 0, area_summary: [] };
};

// ── Evaluator counts per area per project ────────────────────────────────────

/**
 * Returns the number of distinct evaluators who have already submitted
 * evaluations for (projectId, area). Used for coverage/status displays.
 */
export const countEvaluatorsForArea = async (projectId, area) => {
    const query = `
        SELECT COUNT(DISTINCT evaluator_user_id) AS total
        FROM evaluations
        WHERE project_id = $1
          AND area       = $2::evaluation_area
    `;
    const result = await pool.query(query, [projectId, area]);
    return parseInt(result.rows[0].total, 10);
};

/**
 * Returns true if evaluatorUserId has already submitted evaluations
 * for (projectId, area).
 */
export const hasEvaluatorSubmittedArea = async (
    projectId,
    evaluatorUserId,
    area,
) => {
    const query = `
        SELECT 1
        FROM evaluations
        WHERE project_id        = $1
          AND evaluator_user_id = $2
          AND area              = $3::evaluation_area
        LIMIT 1
    `;
    const result = await pool.query(query, [projectId, evaluatorUserId, area]);
    return result.rows.length > 0;
};

// ── Event evaluations_closed helpers ─────────────────────────────────────────

/**
 * Returns { evaluations_closed, id_event } for a given event.
 */
export const getEventEvalStatus = async (eventId) => {
    const result = await pool.query(
        `SELECT id_event, evaluations_closed FROM events WHERE id_event = $1`,
        [eventId],
    );
    return result.rows[0] || null;
};

/**
 * Sets evaluations_closed on an event.
 */
export const setEvaluationsClosed = async (eventId, closed) => {
    const result = await pool.query(
        `UPDATE events
         SET evaluations_closed = $2, updated_at = now()
         WHERE id_event = $1
         RETURNING id_event, evaluations_closed`,
        [eventId, closed],
    );
    return result.rows[0] || null;
};

/**
 * Checks whether every project in the event has at least 1 evaluation
 * for each required area (areas with active rubrics).
 *
 * Returns { canClose: boolean, missing: [{ projectId, projectName, missingAreas }] }
 */
export const getEventEvalCoverage = async (eventId) => {
    // Required areas for this event
    const areasRes = await pool.query(
        `SELECT DISTINCT area FROM rubrics WHERE id_event = $1 AND active = true`,
        [eventId],
    );
    const requiredAreas = areasRes.rows.map((r) => r.area);

    if (requiredAreas.length === 0) {
        return { canClose: false, missing: [] };
    }

    // All teams in the event (with or without submitted project)
    const teamsRes = await pool.query(
        `SELECT t.id_team, t.name AS team_name, p.id_project, p.name AS project_name
         FROM teams t
                  LEFT JOIN projects p ON p.team_id = t.id_team
         WHERE t.id_event = $1`,
        [eventId],
    );

    // If there are no teams at all, nothing to close
    if (teamsRes.rows.length === 0) {
        return { canClose: false, missing: [] };
    }

    const missing = [];

    for (const row of teamsRes.rows) {
        const projectId = row.id_project;

        // Team has no project at all — missing all areas
        if (!projectId) {
            missing.push({
                projectId: null,
                projectName: row.team_name,
                missingAreas: requiredAreas,
            });
            continue;
        }

        const coveredRes = await pool.query(
            `SELECT DISTINCT area FROM evaluations WHERE project_id = $1`,
            [projectId],
        );
        const covered = coveredRes.rows.map((r) => r.area);
        const missingAreas = requiredAreas.filter((a) => !covered.includes(a));

        if (missingAreas.length > 0) {
            missing.push({
                projectId,
                projectName: row.project_name ?? row.team_name,
                missingAreas,
            });
        }
    }

    return { canClose: missing.length === 0, missing };
};

// ── Event results ─────────────────────────────────────────────────────────────

export const getTeamEvalCounts = async (eventId) => {
    const result = await pool.query(
        `SELECT
             t.id_team,
             t.name AS team_name,
             area_counts.area,
             COALESCE(area_counts.evaluator_count, 0) AS evaluator_count
         FROM teams t
                  LEFT JOIN projects p ON p.team_id = t.id_team
                  LEFT JOIN (
             SELECT
                 e.project_id,
                 e.area,
                 COUNT(DISTINCT e.evaluator_user_id) AS evaluator_count
             FROM evaluations e
             GROUP BY e.project_id, e.area
         ) area_counts ON area_counts.project_id = p.id_project
         WHERE t.id_event = $1
         ORDER BY t.name, area_counts.area`,
        [eventId],
    );
    return result.rows;
};

export const getEventResults = async (eventId) => {
    const query = `
        SELECT
            ipr.project_id,
            p.name             AS project_name,
            t.name             AS team_name,
            ipr.user_id,
            u.name             AS user_name,
            u.email,
            u.github_avatar_url,
            ipr.final_score,
            ipr.calculated_at,
            json_agg(
                    json_build_object(
                            'area',        iar.area,
                            'final_score', iar.final_score
                    ) ORDER BY iar.area
            ) AS area_scores
        FROM individual_project_results ipr
                 JOIN users u ON u.id_user = ipr.user_id
                 JOIN projects p ON p.id_project = ipr.project_id
                 JOIN teams t ON t.id_team = p.team_id
                 LEFT JOIN individual_area_results iar
                           ON iar.project_id = ipr.project_id AND iar.user_id = ipr.user_id
        WHERE p.id_event = $1
        GROUP BY
            ipr.project_id, p.name, t.name,
            ipr.user_id, u.name, u.email, u.github_avatar_url,
            ipr.final_score, ipr.calculated_at
        ORDER BY ipr.final_score DESC
    `;
    const result = await pool.query(query, [eventId]);
    return result.rows;
};

export const getGradeAuditByEvent = async (eventId) => {
    const query = `
        SELECT
            e.id_evaluation,
            e.project_id,
            p.name AS project_name,
            t.id_team,
            t.name AS team_name,
            e.area,
            e.id_grade,
            e.feedback,
            e.created_at AS evaluated_at,
            evaluator.id_user AS evaluator_user_id,
            evaluator.name AS evaluator_name,
            evaluator.email AS evaluator_email,
            evaluator.role AS evaluator_role,
            evaluator.clan AS evaluator_clan,
            evaluated.id_user AS evaluated_user_id,
            evaluated.name AS evaluated_name,
            evaluated.email AS evaluated_email,
            evaluated.role AS evaluated_role,
            evaluated.clan AS evaluated_clan,
            e.id_rubric,
            r.name AS rubric_name,
            r.description AS rubric_description,
            r.weight AS rubric_weight,
            g.score AS grade_score,
            g.name AS grade_name,
            g.description AS grade_description,
            iar.final_score AS calculated_area_score,
            iar.calculated_at AS area_calculated_at,
            ipr.final_score AS calculated_project_score,
            ipr.calculated_at AS project_calculated_at
        FROM evaluations e
                 JOIN projects p ON p.id_project = e.project_id
                 JOIN teams t ON t.id_team = p.team_id
                 JOIN users evaluator ON evaluator.id_user = e.evaluator_user_id
                 JOIN users evaluated ON evaluated.id_user = e.evaluated_user_id
                 JOIN grades g ON g.id_grade = e.id_grade
                 JOIN rubrics r ON r.id_rubric = e.id_rubric
                 LEFT JOIN individual_area_results iar
                           ON iar.project_id = e.project_id
                          AND iar.user_id = e.evaluated_user_id
                          AND iar.area = e.area
                 LEFT JOIN individual_project_results ipr
                           ON ipr.project_id = e.project_id
                          AND ipr.user_id = e.evaluated_user_id
        WHERE p.id_event = $1
        ORDER BY t.name, p.name, e.area, evaluated.name, evaluator.name, r.name, e.created_at DESC
    `;
    const result = await pool.query(query, [eventId]);
    return result.rows;
};

export const getTeamAreaAuditSummaryByEvent = async (eventId) => {
    const query = `
        WITH required_areas AS (
            SELECT COUNT(DISTINCT area) AS required_area_count
            FROM rubrics
            WHERE id_event = $1
              AND active = true
        ),
        rubric_scores AS (
            SELECT
                p.id_project,
                p.name AS project_name,
                t.id_team,
                t.name AS team_name,
                e.area,
                e.evaluated_user_id,
                r.id_rubric,
                COALESCE(NULLIF(r.weight, 0), 1) AS rubric_weight,
                AVG(g.score) AS rubric_score,
                COUNT(DISTINCT e.evaluator_user_id) AS evaluator_count,
                MAX(e.created_at) AS last_evaluated_at
            FROM evaluations e
                     JOIN projects p ON p.id_project = e.project_id
                     JOIN teams t ON t.id_team = p.team_id
                     JOIN grades g ON g.id_grade = e.id_grade
                     JOIN rubrics r ON r.id_rubric = e.id_rubric
            WHERE p.id_event = $1
            GROUP BY
                p.id_project,
                p.name,
                t.id_team,
                t.name,
                e.area,
                e.evaluated_user_id,
                e.id_rubric,
                r.weight
        ),
        member_area_scores AS (
            SELECT
                id_project,
                project_name,
                id_team,
                team_name,
                area,
                evaluated_user_id,
                ROUND(
                    (
                        SUM(rubric_score * rubric_weight)
                        / NULLIF(SUM(rubric_weight), 0)
                    )::numeric,
                    2
                ) AS member_score,
                COUNT(id_rubric) AS rubric_count,
                SUM(evaluator_count) AS evaluation_count,
                MAX(last_evaluated_at) AS last_evaluated_at
            FROM rubric_scores
            GROUP BY
                id_project,
                project_name,
                id_team,
                team_name,
                area,
                evaluated_user_id
        ),
        area_scores AS (
            SELECT
                id_project,
                project_name,
                id_team,
                team_name,
                area,
                ROUND(
                    COALESCE(
                        AVG(member_score) FILTER (WHERE COALESCE(member_score, 0) <> 0),
                        0
                    )::numeric,
                    2
                ) AS area_score,
                COUNT(evaluated_user_id) AS member_count,
                COUNT(evaluated_user_id) FILTER (WHERE COALESCE(member_score, 0) <> 0)
                    AS counted_member_count,
                COUNT(evaluated_user_id) FILTER (WHERE COALESCE(member_score, 0) = 0)
                    AS zero_member_count,
                SUM(evaluation_count) AS evaluation_count,
                MAX(last_evaluated_at) AS last_evaluated_at
            FROM member_area_scores
            GROUP BY id_project, project_name, id_team, team_name, area
        ),
        team_scores AS (
            SELECT
                area_scores.id_project,
                area_scores.project_name,
                area_scores.id_team,
                area_scores.team_name,
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
                    2
                ) AS team_score,
                COUNT(DISTINCT area) AS evaluated_area_count,
                MAX(required_areas.required_area_count) AS required_area_count,
                MAX(last_evaluated_at) AS last_evaluated_at
            FROM area_scores
                     CROSS JOIN required_areas
            GROUP BY
                area_scores.id_project,
                area_scores.project_name,
                area_scores.id_team,
                area_scores.team_name
        )
        SELECT
            COALESCE(
                (
                    SELECT json_agg(
                        json_build_object(
                            'id_project', area_scores.id_project,
                            'project_name', area_scores.project_name,
                            'id_team', area_scores.id_team,
                            'team_name', area_scores.team_name,
                            'area', area_scores.area,
                            'area_score', area_scores.area_score,
                            'team_score', team_scores.team_score,
                            'member_count', area_scores.member_count,
                            'counted_member_count', area_scores.counted_member_count,
                            'zero_member_count', area_scores.zero_member_count,
                            'evaluation_count', area_scores.evaluation_count,
                            'last_calculated_at', area_scores.last_evaluated_at,
                            'is_complete', team_scores.evaluated_area_count >= team_scores.required_area_count
                        )
                        ORDER BY area_scores.team_name, area_scores.project_name, area_scores.area
                    )
                    FROM area_scores
                             JOIN team_scores ON team_scores.id_project = area_scores.id_project
                ),
                '[]'::json
            ) AS area_summary,
            COALESCE(
                (
                    SELECT json_agg(
                        json_build_object(
                            'id_project', id_project,
                            'project_name', project_name,
                            'id_team', id_team,
                            'team_name', team_name,
                            'team_score', team_score,
                            'evaluated_area_count', evaluated_area_count,
                            'required_area_count', required_area_count,
                            'is_complete', evaluated_area_count >= required_area_count,
                            'last_calculated_at', last_evaluated_at
                        )
                        ORDER BY team_name, project_name
                    )
                    FROM team_scores
                ),
                '[]'::json
            ) AS team_summary
    `;
    const result = await pool.query(query, [eventId]);
    return result.rows[0] ?? { area_summary: [], team_summary: [] };
};

export default {
    getRubricsByEvent,
    getGradesByRubric,
    getExistingEvaluation,
    upsertEvaluation,
    getEvaluationsByProject,
    getEvaluationSummaryByProjectAndEvaluator,
    getRawEvaluationsForProject,
    getRubricsForProject,
    upsertAreaResult,
    upsertProjectResult,
    getProjectsWithExistingResultsForEvent,
    getExistingProjectResultUsers,
    getExistingAreaResultRows,
    updateAreaResult,
    updateProjectResult,
    getProjectResults,
    getProjectResultsSummary,
    getEventResults,
    getGradeAuditByEvent,
    getTeamAreaAuditSummaryByEvent,
    countEvaluatorsForArea,
    hasEvaluatorSubmittedArea,
    getEventEvalStatus,
    setEvaluationsClosed,
    getEventEvalCoverage,
    getTeamEvalCounts,
};
