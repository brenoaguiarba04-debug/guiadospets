import got from 'got';

const OLLAMA_URL = 'http://127.0.0.1:11434/api/generate';
const MODEL = 'qwen2.5:latest'; // Defaulting to qwen as per context, user can change if needed

export interface ProductCandidate {
    title: string;
    price: number;
    link: string;
    index: number;
    sales?: number;
}

export async function selectBestMatch(candidates: ProductCandidate[], query: string): Promise<number> {
    if (candidates.length === 0) return -1;
    if (candidates.length === 1) return 0;

    const candidatesText = candidates.map((c, i) =>
        `[${i}] Title: "${c.title}" | Price: R$ ${c.price}`
    ).join('\n');

    const prompt = `
You are a smart shopping assistant. Verify which of the following products BEST matches the user search query.
Pay strict attention to:
1. Product Name (Exact match or close variant).
2. Weight/Size (If query specifies "15kg", exclude "3kg" or "10kg").
3. Type (If query is for "adulto", exclude "filhote").

User Query: "${query}"

Candidates:
${candidatesText}

Respond ONLY with the index number (0, 1, 2...) of the best match. 
If none are good matches, respond with -1.
Do not explain. Just the number.
    `.trim();

    try {
        console.log(`\n🤖 Consultando Ollama (${MODEL})...`);
        const response: any = await got.post(OLLAMA_URL, {
            json: {
                model: MODEL,
                prompt: prompt,
                stream: false,
                options: {
                    temperature: 0.1
                }
            },
            responseType: 'json',
            timeout: { request: 20000 }
        }).json();

        const responseText = response.response?.trim() || response.done_reason === 'stop' ? response.response : '';
        // Ollama API (non-chat) returns 'response' field.

        const answer = String(response.response).trim();
        const index = parseInt(answer.match(/-?\d+/)?.[0] || '-1');

        console.log(`🤖 Ollama escolheu: [${index}] (${index >= 0 ? candidates[index].title.slice(0, 40) + '...' : 'Nenhum'})`);
        return index;

    } catch (error: any) {
        console.warn('⚠️ Falha ao comunicar com Ollama. Usando fallback (primeiro item).');
        console.warn(`Erro: ${error.message}`);
        // Fallback: If Ollama fails, check if we have "qwen2.5" or match generic logic?
        // For now return 0 (first organic result)
        return 0;
    }
}
