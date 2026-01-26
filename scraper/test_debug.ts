import { PlaywrightCrawler, Dataset } from 'crawlee';
import { processWithLocalLLM, selectBestMatch } from './ollama';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// ========== CONFIG ==========
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

console.log("Hello debug world with ALL imports and dotenv");
console.log("Hello debug world with crawlee");

(async () => {
    try {
        console.log("Checking Ollama...");
        const response = await fetch('http://localhost:11434/api/generate', {
            method: 'POST',
            body: JSON.stringify({ model: 'qwen2.5', prompt: 'hi', stream: false })
        });
        console.log("Ollama status:", response.status);

        console.log("Instantiating Crawler...");
        const crawler = new PlaywrightCrawler({
            headless: true,
            maxConcurrency: 1,
            requestHandler: async ({ page }) => { console.log("Handler"); }
        });
        console.log("Crawler instantiated.");

        console.log("Running crawler...");
        await crawler.run(['http://example.com']);
        console.log("Crawler finished.");

    } catch (e) {
        console.error("Debug failed:", e);
    }
})();
