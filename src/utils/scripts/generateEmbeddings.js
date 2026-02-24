// src/scripts/generateEmbeddings.js
import pool from '../../db/pool.js'
import { generarEmbedding } from '../../integrations/Google AI/embeddingService.js'

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))

async function generarEmbeddings() {
    const client = await pool.connect()

    try {
        console.log('📦 Obteniendo equipos sin embedding...\n')

        // Ajusta los campos al nombre real de tus columnas
        const { rows: projects } = await client.query(`
            SELECT id_project, name, description
            FROM projects
            WHERE embedding IS NULL
    `)

        if (projects.length === 0) {
            console.log('✅ Todos los equipos ya tienen embedding.')
            return
        }

        console.log(`🔎 ${projects.length} equipos por procesar\n`)

        for (const project of projects) {
            try {
                // Combina nombre + descripción para mejor contexto semántico
                const text = `${project.name}. ${project.description}`

                console.log(`🔄 Procesando: ${project.name}`)

                const embeddingNew = await generarEmbedding(text)

                console.log(embeddingNew.length)
                const result = await client.query(
                    `UPDATE projects SET embedding = $1::vector WHERE id_project = $2`,
                    [`[${embeddingNew.join(',')}]`, project.id_project]
                )
                console.log(`✅ Listo: ${project.name}`)

                // Pausa para no saturar la API de Google (rate limit)
                await sleep(200)

            } catch (err) {
                console.error(`❌ Error en "${project.name}":`, err.message)
                // Continúa con el siguiente aunque uno falle
            }
        }

        console.log('\n🎉 ¡Proceso completado!')

    } finally {
        client.release()
        await pool.end()
    }
}

generarEmbeddings()
