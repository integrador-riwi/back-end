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
    required_area_count AS (
      SELECT COUNT(*) AS total
      FROM required_areas
    ),
    project_evaluated_areas AS (
      -- For each project, which areas have at least 1 evaluation
      SELECT
        p.id_project,
        e.area,
        COUNT(DISTINCT e.evaluator_user_id) AS tl_count
      FROM projects p
      JOIN evaluations e ON e.project_id = p.id_project
      JOIN required_areas ra ON ra.area = e.area
      WHERE p.id_event = $1
      GROUP BY p.id_project, e.area
    ),
    project_coverage AS (
      -- For each project, count how many required areas are covered.
      SELECT
        p.id_project,
        p.name              AS project_name,
        t.name              AS team_name,
        t.id_team,
        rac.total                             AS required_area_count,
        COUNT(DISTINCT pea.area)               AS evaluated_area_count,
        CASE
          WHEN rac.total = 0 THEN false
          ELSE COUNT(DISTINCT pea.area) = rac.total
        END AS fully_evaluated
      FROM projects p
      JOIN teams t ON t.id_team = p.team_id
      CROSS JOIN required_area_count rac
      LEFT JOIN project_evaluated_areas pea ON pea.id_project = p.id_project
      WHERE p.id_event = $1
      GROUP BY p.id_project, p.name, t.name, t.id_team, rac.total
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
 * Returns the full ranking for an event.
 *
 * Team average excludes members with a zero score in any evaluated area.
 * Ordered by team_score DESC.
 */
export const getEventRanking = async (eventId) => {
  const query = `
    WITH project_members AS (
      SELECT
        ipr.project_id,
        ipr.user_id,
        ipr.final_score
      FROM individual_project_results ipr
      JOIN projects p ON p.id_project = ipr.project_id
      WHERE p.id_event = $1
    ),
    member_area_results AS (
      SELECT
        pm.project_id,
        pm.user_id,
        COALESCE(BOOL_OR(COALESCE(iar.final_score, 0) = 0), false) AS has_zero_area,
        COALESCE(
          json_agg(
            json_build_object('area', iar.area, 'score', iar.final_score)
            ORDER BY iar.area
          ) FILTER (WHERE iar.area IS NOT NULL),
          '[]'::json
        ) AS area_scores
      FROM project_members pm
      LEFT JOIN individual_area_results iar
        ON iar.project_id = pm.project_id
       AND iar.user_id    = pm.user_id
      GROUP BY pm.project_id, pm.user_id
    ),
    ranked_members AS (
      SELECT
        pm.*,
        NOT mar.has_zero_area AS counts_for_team_average,
        mar.area_scores
      FROM project_members pm
      JOIN member_area_results mar
        ON mar.project_id = pm.project_id
       AND mar.user_id    = pm.user_id
    )
    SELECT
      p.id_project,
      p.name                                  AS project_name,
      p.repo_url,
      t.id_team,
      t.name                                  AS team_name,
      ROUND(
        COALESCE(AVG(rm.final_score) FILTER (WHERE rm.counts_for_team_average), 0)::numeric,
        2
      ) AS team_score,
      COUNT(rm.user_id)                       AS member_count,
      COUNT(rm.user_id) FILTER (WHERE rm.counts_for_team_average)
                                                AS averaged_member_count,
      json_agg(
        json_build_object(
          'user_id',    rm.user_id,
          'user_name',  u.name,
          'avatar_url', u.github_avatar_url,
          'score',      rm.final_score,
          'counts_for_team_average', rm.counts_for_team_average,
          'area_scores', rm.area_scores
        ) ORDER BY rm.final_score DESC
      ) AS members
    FROM ranked_members rm
    JOIN projects p  ON p.id_project  = rm.project_id
    JOIN teams t     ON t.id_team     = p.team_id
    JOIN users u     ON u.id_user     = rm.user_id
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
