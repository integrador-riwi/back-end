CREATE INDEX IF NOT EXISTS idx_individual_project_results_project_user
  ON individual_project_results(project_id, user_id);

CREATE INDEX IF NOT EXISTS idx_individual_area_results_project_user
  ON individual_area_results(project_id, user_id);

CREATE INDEX IF NOT EXISTS idx_evaluations_project_area
  ON evaluations(project_id, area);

CREATE INDEX IF NOT EXISTS idx_evaluations_event_project_area
  ON evaluations(event_id, project_id, area);

CREATE INDEX IF NOT EXISTS idx_rubrics_event_active_area
  ON rubrics(id_event, active, area);

CREATE INDEX IF NOT EXISTS idx_team_coders_team_user
  ON team_coders(id_team, id_user);
