import config from '../../config/env.js'

export async function generarEmbedding(text) {
    const response = await fetch('https://api.cohere.com/v2/embed', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${config.cohere.apiKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: 'embed-v4.0',
            texts: [text],
            input_type: 'search_document',
            embedding_types: ['float']
        })
    })

    if (!response.ok) {
        const error = await response.json()
        throw new Error(`Cohere Error: ${JSON.stringify(error)}`)
    }

    const data = await response.json()
    return data.embeddings.float[0]
}
