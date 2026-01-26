import { createClient } from '@supabase/supabase-js';

interface OllamaResponse {
    model: string;
    created_at: string;
    response: string;
    done: boolean;
}

const OLLAMA_URL = 'http://localhost:11434/api/generate';
const MODEL = 'qwen2.5';

export async function processWithLocalLLM(rawText: string): Promise<any[]> {
    const prompt = `
    You are a data extraction assistant. Extract product details from the text below into a valid JSON Array.

    CRITICAL INSTRUCTIONS:
    - OUTPUT MUST BE A VALID JSON ARRAY: "[" ... "]".
    - DO NOT include Markdown code blocks (like \`\`\`json).
    - DO NOT write any introductory text ("Here is the list...").
    - DO NOT use markdown lists ("1. Item...").
    - IF NO PRODUCTS FOUND, return "[]".
    
    CONTEXT MATCHING RULES:
    - You are verifying if products found in a store match the user's search.
    - If the product is the SAME ITEM but has a slightly different title (e.g. "Ração Golden 15kg" vs "Golden Special Cães 15kg"), INCLUDE IT.
    - If the product is a DIFFERENT SIZE/WEIGHT (e.g. looking for 15kg but found 3kg), DO NOT INCLUDE IT.
    - If the product is a PACK (e.g. "Kit 3x"), ONLY include if the price seems to be for the whole kit, but note the name.

    Fields required:
    - nome (string): Full product name
    - preco (number): The TOTAL CASH PRICE (Preço à vista/Pix). 
      - IGNORE installments (e.g., if "12x R$ 10,00", the price is 120, not 10). 
      - Look for "R$", "BRL". 
      - If multiple prices exist, pick the main large bold one.
    - link (string or null): The relative URL (href) of the product link if found nearby.
    - imagem (string or null): The product image URL (src).
    - marca (string or null): Brand name if identified.
    - peso (string or null): Weight or volume (e.g., "15kg", "100ml").

    Text:
    ${rawText.slice(0, 8000)}
    `;

    try {
        console.log("Sending prompt to Ollama...");

        const response = await fetch(OLLAMA_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: MODEL,
                prompt: prompt,
                stream: false,
                options: {
                    temperature: 0.1 // Deterministic
                }
            })
        });

        if (!response.ok) {
            throw new Error(`Ollama API error: ${response.statusText}`);
        }

        const data = await response.json() as OllamaResponse;

        // Log raw for debugging (truncated)
        const raw = data.response;
        console.log("Raw Ollama Response (slice):", raw.slice(0, 200).replace(/\n/g, ' '));

        // Robust JSON extraction
        let cleanJson = raw.trim();

        // 1. Remove Markdown Wrappers if model ignored instruction
        const markdownMatch = cleanJson.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        if (markdownMatch) {
            cleanJson = markdownMatch[1];
        }

        // 2. Find Boundaries (Start with [ and End with ])
        const firstOpenBracket = cleanJson.indexOf('[');
        const lastCloseBracket = cleanJson.lastIndexOf(']');

        if (firstOpenBracket !== -1 && lastCloseBracket !== -1) {
            cleanJson = cleanJson.substring(firstOpenBracket, lastCloseBracket + 1);
        } else {
            // Model might have returned just one object without array brackets
            const firstOpenBrace = cleanJson.indexOf('{');
            const lastCloseBrace = cleanJson.lastIndexOf('}');
            if (firstOpenBrace !== -1 && lastCloseBrace !== -1) {
                cleanJson = `[${cleanJson.substring(firstOpenBrace, lastCloseBrace + 1)}]`;
            }
        }

        let parsed = JSON.parse(cleanJson);

        // Handle "Array of Strings" edge case (Model returns ["{...}"])
        if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === 'string') {
            try {
                parsed = parsed.map((item: string) => JSON.parse(item));
            } catch (e) {
                console.warn("Failed to parse inner JSON strings:", e);
            }
        }

        return Array.isArray(parsed) ? parsed : [parsed];
    } catch (e: any) {
        console.error('Ollama Processing Error:', e);
        return [];
    }
}

export async function selectBestMatch(candidates: any[], targetName: string): Promise<number> {
    const list = candidates.map((c, i) => `${i}. ${c.title || c.nome} - R$ ${c.price || c.preco}`).join('\n');

    const prompt = `
    TASK: Identify the best match for the target product from the list below.
    
    TARGET: "${targetName}"
    
    CANDIDATES:
    ${list}
    
    INSTRUCTIONS:
    - You must find the product that matches the BRAND, LINE, and WEIGHT/SIZE exactly.
    - If the target says "15kg", a "1kg" or "3kg" candidate is a FAILURE (-1).
    - If the target says "3 comprimidos", a "1 tablete" candidate is a FAILURE (-1).
    - If multiple matches exist, pick the one that is NOT a "Kit" or "Combo" unless specified.
    - Return ONLY the index number (0, 1, 2...).
    - Return -1 if NO product matches the weight/size requirement.
    - OUTPUT FORMAT: Just the integer number. No text or explanation.
    `;

    console.log(`[LLM] Selection for "${targetName}" among ${candidates.length} items...`);

    try {
        const response = await fetch(OLLAMA_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: MODEL,
                prompt: prompt,
                stream: false,
                options: { temperature: 0.1 }
            })
        });

        if (!response.ok) return -1;
        const data = await response.json() as OllamaResponse;
        const text = data.response.trim();
        const index = parseInt(text.match(/-?\d+/)?.[0] || '-1');
        return isNaN(index) ? -1 : index;
    } catch (e) {
        console.error('LLM Selection Error:', e);
        return -1;
    }
}
