// src/integrations/Google AI/embeddingService.js
import config from '../../config/env.js'

export async function generarEmbedding(texto) {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${config.openai.apiKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: 'text-embedding-3-small',
            input: texto
        })
    })

    if (!response.ok) {
        const error = await response.json()
        throw new Error(`OpenAI Error: ${JSON.stringify(error)}`)
    }

    const data = await response.json()
    return data.data[0].embedding
}
