import pool from '../../db/pool.js'
import { generarEmbedding } from './embeddingService.js'

/**
 * Searches projects by semantic similarity against their description embedding.
 *
 * @param {string}  query            - Text to search
 * @param {number}  limit            - Max results (default 5)
 * @param {number}  minSimilarity    - Minimum cosine similarity threshold (default 0.1)
 * @param {number|null} excludeProjectId - Project ID to exclude from results
 * @param {number|null} eventId      - Filter results to a specific event
 */
export async function searchProjectByDescription(
    query,
    limit = 5,
    minSimilarity = 0.1,
    excludeProjectId = null,
    eventId = null,
) {
    const client = await pool.connect()

    try {
        const embedding = await generarEmbedding(query)
        const vectorString = `[${embedding.join(',')}]`

        // Build WHERE clauses dynamically to avoid null cast issues
        const conditions = ['p.embedding IS NOT NULL']
        const params = [vectorString, limit, minSimilarity]

        if (excludeProjectId != null) {
            params.push(excludeProjectId)
            conditions.push(`p.id_project != $${params.length}`)
        }

        if (eventId != null) {
            params.push(eventId)
            conditions.push(`p.id_event = $${params.length}`)
        }

        const whereClause = conditions.join(' AND ')

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
            LEFT  JOIN team_coders tc ON tc.id_team = t.id_team
            LEFT  JOIN users u        ON u.id_user  = tc.id_user
            WHERE ${whereClause}
            GROUP BY
                p.id_project, p.name, p.description, p.repo_url,
                p.video_url, p.preview_photo_url, p.project_final_grade,
                p.embedding, t.id_team, t.name, t.created_at
            HAVING 1 - (p.embedding <=> $1::vector) >= $3
            ORDER BY p.embedding <=> $1::vector
            LIMIT $2
            `,
            params,
        )

        return rows
    } finally {
        client.release()
    }
}
