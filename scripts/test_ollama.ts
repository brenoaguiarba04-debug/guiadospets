
const OLLAMA_URL = 'http://localhost:11434/api/generate';
const MODEL = 'qwen2.5';

async function testOllama() {
    console.log(`Testing Ollama connectivity with model: ${MODEL}...`);
    try {
        const response = await fetch(OLLAMA_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: MODEL,
                prompt: "Compare these two products and tell me if they are the same weight: 'Racao Golden 15kg' and 'Golden Special 15kg'. Answer with YES or NO only.",
                stream: false
            })
        });

        if (!response.ok) {
            console.error(`Ollama Error: ${response.status} ${response.statusText}`);
            return;
        }

        const data = await response.json();
        console.log("Ollama Response:", data.response);
        if (data.response.includes("YES")) {
            console.log("✅ Ollama is working correctly!");
        } else {
            console.log("❌ Ollama responded but logic check failed:", data.response);
        }
    } catch (err) {
        console.error("❌ Failed to connect to Ollama:", err.message);
        console.log("Hint: Make sure Ollama is running or check the OLLAMA_URL in scraper/ollama.ts");
    }
}

testOllama();
