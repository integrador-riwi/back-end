-- Migration 014: Create placeholder evaluations for rubrics lost by old unique constraint
-- The old UNIQUE (project_id, evaluator_user_id, evaluated_user_id, area) meant that
-- when a TL submitted grades for multiple rubrics in the same area, each subsequent
-- INSERT would conflict and OVERWRITE the previous row via ON CONFLICT DO UPDATE.
-- Only one rubric per area per member survived (the last one processed).
--
-- This migration detects orphaned rubrics and creates rows for them, copying the
-- same grade score from the surviving rubric for that same member. If no matching
-- score exists in the target rubric, falls back to the lowest grade.

INSERT INTO evaluations (project_id, event_id, evaluator_user_id, evaluated_user_id, area, feedback, id_grade, id_rubric)
SELECT
    e.project_id,
    COALESCE(e.event_id, p.id_event) AS event_id,
    e.evaluator_user_id,
    e.evaluated_user_id,
    e.area,
    NULL AS feedback,
    COALESCE(match_grade.id_grade, lowest_grade.id_grade) AS id_grade,
    r.id_rubric
FROM evaluations e
JOIN projects p ON p.id_project = e.project_id
JOIN rubrics r ON r.id_event = COALESCE(e.event_id, p.id_event)
              AND r.area = e.area
              AND r.active = true
JOIN grades g ON g.id_grade = e.id_grade
LEFT JOIN grades match_grade ON match_grade.id_rubric = r.id_rubric
                           AND match_grade.score = g.score
JOIN LATERAL (
    SELECT g3.id_grade
    FROM grades g3
    WHERE g3.id_rubric = r.id_rubric
    ORDER BY g3.score ASC
    LIMIT 1
) lowest_grade ON true
WHERE COALESCE(e.event_id, p.id_event) IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM evaluations e2
    WHERE e2.project_id = e.project_id
      AND e2.evaluator_user_id = e.evaluator_user_id
      AND e2.evaluated_user_id = e.evaluated_user_id
      AND e2.id_rubric = r.id_rubric
)
ON CONFLICT (project_id, evaluator_user_id, evaluated_user_id, id_rubric) DO NOTHING;
