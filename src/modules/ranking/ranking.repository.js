import pool from "../../db/pool.js";

/**
 * Returns every project in the event with:
 *  - team name
 *  - how many distinct areas each project has been evaluated in
 *  - which distinct areas exist in rubrics for this event (= required areas)
 */
export const getEventEvaluationStatus = async (eventId) => {
  const query = `
    WITH required_areas AS (
      -- Areas that have rubrics defined for this event = areas that must be evaluated
      SELECT DISTINCT area
      FROM rubrics
      WHERE id_event = $1 AND active = true
    ),
    project_evaluated_areas AS (
      -- For each project, which areas have at least 1 evaluation
      SELECT
        p.id_project,
        e.area,
        COUNT(DISTINCT e.evaluator_user_id) AS tl_count
      FROM projects p
      JOIN evaluations e ON e.project_id = p.id_project
      WHERE p.id_event = $1
      GROUP BY p.id_project, e.area
    ),
    project_coverage AS (
      -- For each project, count how many required areas are covered
      -- LEFT JOIN required_areas so projects still appear even if no rubrics defined
      SELECT
        p.id_project,
        p.name              AS project_name,
        t.name              AS team_name,
        t.id_team,
        (SELECT COUNT(*) FROM required_areas)  AS required_area_count,
        COUNT(DISTINCT pea.area)               AS evaluated_area_count,
        -- fully_evaluated = true when every required area has at least 1 evaluation
        -- if there are no required areas, treat as not fully evaluated
        CASE
          WHEN (SELECT COUNT(*) FROM required_areas) = 0 THEN false
          ELSE BOOL_AND(
            ra.area IS NULL OR EXISTS (
              SELECT 1 FROM project_evaluated_areas pea2
              WHERE pea2.id_project = p.id_project AND pea2.area = ra.area
            )
          )
        END AS fully_evaluated
      FROM projects p
      JOIN teams t ON t.id_team = p.team_id
      LEFT JOIN required_areas ra ON true
      LEFT JOIN project_evaluated_areas pea ON pea.id_project = p.id_project
      WHERE p.id_event = $1
      GROUP BY p.id_project, p.name, t.name, t.id_team
    )
    SELECT
      pc.*,
      e.final_delivery_date,
      e.event_status,
      (SELECT json_agg(area ORDER BY area) FROM required_areas) AS required_areas
    FROM project_coverage pc
    CROSS JOIN events e
    WHERE e.id_event = $1
    ORDER BY pc.project_name
  `;
  const result = await pool.query(query, [eventId]);
  return result.rows;
};

/**
 * Returns the full ranking for an event:
 * team average score = average of all individual final_scores in that team's project.
 * Ordered by team_score DESC.
 */
export const getEventRanking = async (eventId) => {
  const query = `
    SELECT
      p.id_project,
      p.name                                  AS project_name,
      p.repo_url,
      t.id_team,
      t.name                                  AS team_name,
      ROUND(AVG(ipr.final_score)::numeric, 2) AS team_score,
      COUNT(ipr.user_id)                      AS member_count,
      json_agg(
        json_build_object(
          'user_id',    ipr.user_id,
          'user_name',  u.name,
          'avatar_url', u.github_avatar_url,
          'score',      ipr.final_score,
          'area_scores', (
            SELECT json_agg(
              json_build_object('area', iar.area, 'score', iar.final_score)
              ORDER BY iar.area
            )
            FROM individual_area_results iar
            WHERE iar.project_id = ipr.project_id
              AND iar.user_id    = ipr.user_id
          )
        ) ORDER BY ipr.final_score DESC
      ) AS members
    FROM individual_project_results ipr
    JOIN projects p  ON p.id_project  = ipr.project_id
    JOIN teams t     ON t.id_team     = p.team_id
    JOIN users u     ON u.id_user     = ipr.user_id
    WHERE p.id_event = $1
    GROUP BY p.id_project, p.name, p.repo_url, t.id_team, t.name
    ORDER BY team_score DESC
  `;
  const result = await pool.query(query, [eventId]);
  return result.rows;
};

/**
 * Bulk-calculate grades for every project in the event that hasn't been
 * calculated yet (or recalculate all if force=true).
 * Returns list of project IDs that were processed.
 */
export const getProjectsForEvent = async (eventId) => {
  const result = await pool.query(
    `SELECT id_project FROM projects WHERE id_event = $1`,
    [eventId],
  );
  return result.rows.map((r) => r.id_project);
};