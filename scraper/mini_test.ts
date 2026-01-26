import { chromium, Page } from 'playwright';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { selectBestMatch } from './ollama';

// Reuse functions from final_scraper if possible, but here I'll just copy the critical ones for a quick test
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

// Copying simplified logic from final_scraper to test here
function extractWeightFromText(text: string): string | null {
    const match = text.match(/(\d+(?:[\.,]\d+)?)\s?(kg|g|ml|l|mg)/i);
    return match ? match[0].toLowerCase().replace(/\s+/g, '') : null;
}

async function test() {
    console.log("=== MINI TEST SCRAPER ===");

    // Testing NexGard (Decimal weight)
    const product = { id: 'test-1', nome: "NexGard Spectra Cães 3.6 a 7.5kg 1 Tablete" };
    const weight = extractWeightFromText(product.nome) || 'N/A';

    console.log(`Product: ${product.nome}`);
    console.log(`Detected weight: ${weight}`);

    // Test simplifyQuery
    const query = product.nome.replace(/[^\w\s\u00C0-\u00FF.]/g, ' ').replace(/\b\d+\s*x\b/gi, '').replace(/\s+/g, ' ').trim().split(' ').slice(0, 7).join(' ');
    console.log(`Simplified Query: ${query}`);

    // If weight is 3.6kg, searching for "NexGard Spectra Cães 3.6 7.5kg" should work.
}

test();
