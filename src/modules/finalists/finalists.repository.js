import pool from "../../db/pool.js";

export const getFinalistsByEvent = async (eventId) => {
  const query = `
    SELECT
      f.id_finalist,
      f.id_project,
      f.event_id,
      f.second_grade,
      f.votes_result,
      f.final_grade,
      p.name AS project_name,
      p.repo_url,
      p.preview_photo_url,
      p.video_url,
      p.presentation_url,
      t.id_team,
      t.name AS team_name
    FROM finalists f
    JOIN projects p ON p.id_project = f.id_project
    JOIN teams t ON t.id_team = p.team_id
    WHERE f.event_id = $1
    ORDER BY f.final_grade DESC NULLS LAST
  `;
  const result = await pool.query(query, [eventId]);
  return result.rows;
};

export const getFinalistsCountByEvent = async (eventId) => {
  const query = `
    SELECT COUNT(*)::int AS count
    FROM finalists
    WHERE event_id = $1
  `;
  const result = await pool.query(query, [eventId]);
  return result.rows[0].count;
};

export const setFinalists = async (eventId, projectIds, secondGrades = null) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    await client.query(
      `DELETE FROM finalists WHERE event_id = $1`,
      [eventId]
    );

    for (let i = 0; i < projectIds.length; i++) {
      const projectId = projectIds[i];
      const secondGrade = secondGrades ? secondGrades[i] : null;
      
      await client.query(
        `INSERT INTO finalists (id_project, event_id, second_grade)
         VALUES ($1, $2, $3)`,
        [projectId, eventId, secondGrade]
      );
    }

    await client.query("COMMIT");
    return true;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

export const updateFinalistVotes = async (finalistId, votesResult) => {
  const query = `
    UPDATE finalists
    SET votes_result = $1
    WHERE id_finalist = $2
    RETURNING *
  `;
  const result = await pool.query(query, [votesResult, finalistId]);
  return result.rows[0];
};

export const updateFinalistFinalGrade = async (finalistId, finalGrade) => {
  const query = `
    UPDATE finalists
    SET final_grade = $1
    WHERE id_finalist = $2
    RETURNING *
  `;
  const result = await pool.query(query, [finalGrade, finalistId]);
  return result.rows[0];
};

export const getTopProjectsFromRanking = async (eventId, count = 3) => {
  const query = `
    SELECT
      p.id_project,
      p.name AS project_name,
      t.id_team,
      t.name AS team_name,
      ROUND(AVG(ipr.final_score)::numeric, 2) AS team_score
    FROM individual_project_results ipr
    JOIN projects p ON p.id_project = ipr.project_id
    JOIN teams t ON t.id_team = p.team_id
    WHERE p.id_event = $1
    GROUP BY p.id_project, p.name, t.id_team, t.name
    ORDER BY team_score DESC
    LIMIT $2
  `;
  const result = await pool.query(query, [eventId, count]);
  return result.rows;
};

export default {
  getFinalistsByEvent,
  getFinalistsCountByEvent,
  setFinalists,
  updateFinalistVotes,
  updateFinalistFinalGrade,
  getTopProjectsFromRanking,
};
