import got from 'got';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = 'llama-3.1-8b-instant'; // Mais rápido e estável para Free Tier

export interface ProductCandidate {
    title: string;
    price: number;
    link: string;
    index: number;
    sales?: number;
}

// Controle de Rate Limit Simples (30 RPM = 1 request a cada 2 segundos)
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 2000;

async function waitRateLimit() {
    const now = Date.now();
    const elapsed = now - lastRequestTime;
    if (elapsed < MIN_REQUEST_INTERVAL) {
        const waitTime = MIN_REQUEST_INTERVAL - elapsed;
        await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    lastRequestTime = Date.now();
}

export async function selectBestMatch(candidates: ProductCandidate[], query: string, retries = 3): Promise<number> {
    if (candidates.length === 0) return -1;
    if (candidates.length === 1) return 0;

    const candidatesText = candidates.map((c, i) =>
        `[${i}] Title: "${c.title}" | Price: R$ ${c.price}`
    ).join('\n');

    const prompt = `
You are an expert product matching assistant for a pet store scraper.
Your task is to identify which of the provided candidate products is the precise match for the user's search query.

User Query: "${query}"

Candidates provided:
${candidatesText}

Instructions for Matching:
1. **Exact Product Match**: The candidate must match the product being searched (e.g., specific brand, specific line like "Golden Special").
2. **Weight/Volume Strictness**: This is CRITICAL. If the query specifies "15kg", you MUST REJECT "3kg", "10kg", or "20kg" versions. If the query specifies "12x85g", you must match the multipack.
   - Example: Search "Ração Golden 15kg" -> Candidate "Ração Golden 3kg" is a MISMATCH.
3. **Life Stage/Type**: Match "Adulto" vs "Filhote" (Puppy), "Gatos" (Cats) vs "Cães" (Dogs).
4. **Price Check**: If the price seems absurdly low (e.g., R$ 10 for a 15kg bag), it might be a sample or wrong item. Use price as a secondary hint.

Output format:
Return ONLY a JSON object with a single key "best_match_index".
Value should be the integer index of the best match, or -1 if no candidate is a valid match.
Example: {"best_match_index": 2} or {"best_match_index": -1}
`.trim();

    try {
        const apiKey = process.env.GROQ_API_KEY;
        if (!apiKey) {
            console.error('❌ ERRO: GROQ_API_KEY não encontrada no .env.local');
            return -1;
        }

        await waitRateLimit();

        const response: any = await got.post(GROQ_API_URL, {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            json: {
                model: MODEL,
                messages: [
                    {
                        role: "system",
                        content: "You are a precise JSON-only answering assistant for product matching. You output valid JSON only."
                    },
                    {
                        role: "user",
                        content: prompt
                    }
                ],
                temperature: 0.1,
                response_format: { type: "json_object" }
            },
            responseType: 'json',
            timeout: { request: 30000 }
        }).json();

        const content = response.choices?.[0]?.message?.content;

        if (!content) {
            console.warn('⚠️ Groq retornou resposta vazia.');
            return 0; // Fallback
        }

        let resultIndex = -1;
        try {
            const json = JSON.parse(content);
            resultIndex = typeof json.best_match_index === 'number' ? json.best_match_index : -1;
        } catch (e) {
            const match = content.match(/[-]?\d+/);
            if (match) {
                resultIndex = parseInt(match[0]);
            }
        }

        if (resultIndex >= 0 && resultIndex < candidates.length) {
            console.log(`🤖 Groq Match: [${resultIndex}] "${candidates[resultIndex].title.slice(0, 50)}..."`);
        } else {
            console.log(`🤖 Groq: Nenhum match correspondente (-1).`);
            resultIndex = -1;
        }

        return resultIndex;

    } catch (error: any) {
        if (error.response?.statusCode === 429 && retries > 0) {
            const waitTime = 5000 * (4 - retries); // Exponential wait
            console.warn(`⚠️ Rate limit atingido. Tentando novamente em ${waitTime / 1000}s... (${retries} retentativas restantes)`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
            return selectBestMatch(candidates, query, retries - 1);
        }

        console.error('⚠️ Falha ao comunicar com Groq API.');
        if (error.response) {
            console.error(`Status: ${error.response.statusCode}, Body: ${JSON.stringify(error.response.body)}`);
        } else {
            console.error(`Erro: ${error.message}`);
        }
        return -1;
    }
}
