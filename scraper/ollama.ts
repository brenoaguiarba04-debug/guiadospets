import got from 'got';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.1-8b-instant';

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
1. **Feed (Ração) Rules (STRICT)**:
   - **Weight Match**: You MUST match the exact weight.
   - Query "15kg" -> Candidate "15kg" (MATCH), Candidate "3kg" (MISMATCH).
   - Query "10.1kg" -> Candidate "10.1kg" (MATCH), Candidate "10kg" (MISMATCH).
   - If the query implies a multipack (e.g., "12x85g"), you must match the multipack, not a single unit.

2. **Medicine/Antipulgas Rules (STRICT)**:
   - **Target Weight Range**: Medicines are sold by the animal's weight range. You must match the range in the query.
   - Query "4 a 10kg" -> Candidate "4,5 a 10kg" (MATCH - close enough).
   - Query "4 a 10kg" -> Candidate "20 a 40kg" (MISMATCH).
   - Query "20 a 40kg" -> Candidate "10 a 20kg" (MISMATCH).
   - **Volume/Unit**: Match the count (e.g., "1 tablete", "3 pipetas").

3. **General Rules**:
   - **Brand & Type**: Match "Adulto" vs "Filhote" (Puppy), "Gatos" (Cats) vs "Cães" (Dogs).
   - **Price Logic**: Use price as a sanity check. A 15kg bag of premium food won't cost R$ 20. A 100g sachet won't cost R$ 200.
   - If multiple candidates are valid matches, prefer the one with the most sales or better price, but prioritizing correctness first.

4. **Return -1** if NO candidate is a valid match. Do not guess. It is better to return -1 than to link a wrong product.

Output format:
Return ONLY a JSON object with a single key "best_match_index".
Value should be the integer index of the best match, or -1 if no candidate is a valid match.
Example: {"best_match_index": 2} or {"best_match_index": -1}
`.trim();

    // Helper function to call LLM API
    async function callLLM(apiUrl: string, apiKey: string, model: string): Promise<number> {
        await waitRateLimit();

        const response: any = await got.post(apiUrl, {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            json: {
                model: model,
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
            timeout: { request: 30000 } // 30s timeout
        }).json();

        const content = response.choices?.[0]?.message?.content;
        if (!content) return -1;

        let resultIndex = -1;
        try {
            const json = JSON.parse(content);
            resultIndex = typeof json.best_match_index === 'number' ? json.best_match_index : -1;
        } catch {
            const match = content.match(/[-]?\d+/);
            if (match) resultIndex = parseInt(match[0]);
        }

        return (resultIndex >= 0 && resultIndex < candidates.length) ? resultIndex : -1;
    }

    // Fallback function for keyword matching
    function keywordFallback(): number {
        console.log('🔤 Usando fallback de palavras-chave...');
        const queryWords = query.toLowerCase().replace(/[^a-z0-9 ]/g, '').split(' ').filter(w => w.length > 2);
        let bestIdx = -1;
        let maxMatches = 0;

        candidates.forEach((c, i) => {
            const title = c.title.toLowerCase();
            let matches = 0;
            queryWords.forEach(word => {
                if (title.includes(word)) matches++;
            });

            if (matches > maxMatches && matches >= Math.ceil(queryWords.length * 0.5)) {
                maxMatches = matches;
                bestIdx = i;
            }
        });

        if (bestIdx >= 0) {
            console.log(`🔤 Keyword Match: [${bestIdx}] "${candidates[bestIdx].title.slice(0, 50)}..."`);
        }
        return bestIdx;
    }

    const localUrl = process.env.LOCAL_LLM_URL;
    const localModel = process.env.LOCAL_LLM_MODEL || 'llama3';
    const groqKey = process.env.GROQ_API_KEY;

    // 1. Tentar LLM Local primeiro
    if (localUrl) {
        try {
            console.log('🏠 Tentando LLM Local:', localUrl);
            const result = await callLLM(localUrl, 'dummy-key', localModel);
            if (result >= 0) {
                console.log(`🏠 Local LLM Match: [${result}] "${candidates[result].title.slice(0, 50)}..."`);
                return result;
            }
            console.log('🏠 LLM Local retornou -1, tentando fallback...');
        } catch (error: any) {
            console.warn(`⚠️ LLM Local falhou (${error.message}). Tentando Groq...`);
        }
    }

    // 2. Tentar Groq como fallback
    if (groqKey) {
        try {
            console.log('☁️ Tentando Groq API...');
            const result = await callLLM(GROQ_API_URL, groqKey, GROQ_MODEL);
            if (result >= 0) {
                console.log(`☁️ Groq Match: [${result}] "${candidates[result].title.slice(0, 50)}..."`);
                return result;
            }
            console.log('☁️ Groq retornou -1, tentando fallback de keywords...');
        } catch (error: any) {
            if (error.response?.statusCode === 429 && retries > 0) {
                const waitTime = 5000 * (4 - retries);
                console.warn(`⚠️ Groq Rate limit. Aguardando ${waitTime / 1000}s... (${retries} tentativas restantes)`);
                await new Promise(resolve => setTimeout(resolve, waitTime));
                return selectBestMatch(candidates, query, retries - 1);
            }
            console.warn(`⚠️ Groq API falhou (${error.message}). Usando fallback de keywords...`);
        }
    } else if (!localUrl) {
        console.warn('⚠️ Nenhum LLM configurado (LOCAL_LLM_URL ou GROQ_API_KEY). Usando keywords.');
    }

    // 3. Fallback final: Keywords
    return keywordFallback();
}

