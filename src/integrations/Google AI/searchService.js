// src/services/searchService.js
import pool from '../../db/pool.js'
import { generarEmbedding } from './embeddingService.js'

/**
 * Busca proyectos por similitud semántica e incluye team e integrantes
 * @param {string} query - texto que escribe el usuario
 * @param {number} limit - cantidad de resultados (default 5)
 * @param minSimilarity
 * @param excludeProjectId
 * @returns {Promise<Array>}
 */
export async function searchProjectByDescription(query, limit = 5, minSimilarity = 0.1, excludeProjectId = null) {
    const client = await pool.connect()

    try {
        const embedding = await generarEmbedding(query)
        const vectorString = `[${embedding.join(',')}]`

        const { rows } = await client.query(
            `
                SELECT
                    p.id_project,
                    p.name              AS project_name,
                    p.description,
                    p.repo_url,
                    p.video_url,
                    p.preview_photo_url,
                    p.project_final_grade,
                    1 - (p.embedding <=> $1::vector) AS similarity,
                    t.id_team,
                    t.name              AS team_name,
                    t.created_at        AS team_created_at,
                    JSON_AGG(
                            JSON_BUILD_OBJECT(
                                    'id_user',         u.id_user,
                                    'name',            u.name,
                                    'role',            u.role,
                                    'clan',            u.clan,
                                    'is_active',       u.is_active,
                                    'github_username', u.github_username,
                                    'team_role',       tc.team_role
                            )
                    ) AS members
                FROM projects p
                INNER JOIN teams t       ON t.id_team  = p.team_id
                LEFT JOIN team_coders tc ON tc.id_team = t.id_team
                LEFT JOIN users u        ON u.id_user  = tc.id_user
                WHERE p.embedding IS NOT NULL
                AND ($4::int IS NULL OR p.id_project != $4)  -- excluye el proyecto actual
                GROUP BY
                    p.id_project, p.name, p.description, p.repo_url,
                    p.video_url, p.preview_photo_url, p.project_final_grade,
                    p.embedding, t.id_team, t.name, t.created_at
                HAVING 1 - (p.embedding <=> $1::vector) >= $3
                ORDER BY p.embedding <=> $1::vector
                LIMIT $2
            `,
            [vectorString, limit, minSimilarity, excludeProjectId]
        )

        return rows
    } finally {
        client.release()
    }
}
