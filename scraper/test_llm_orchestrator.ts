
import { chromium, Browser } from 'playwright';
import { createClient } from '@supabase/supabase-js';
import { selectBestMatch } from './ollama';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

async function test() {
    const products = [
        { id: 1001, nome: 'Areia Viva Verde Grãos Finos 4kg' },
        { id: 1002, nome: 'Ração Golden Special Cães Adultos Frango e Carne 15kg' },
        { id: 10, nome: 'NexGard Spectra Cães 7.6 a 15kg 1 Tablete' }
    ];

    console.log("Starting Intelligent Test...");
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();

    for (const p of products) {
        console.log(`Analyzing: ${p.nome}`);
        const page = await context.newPage();
        await page.goto(`https://www.petlove.com.br/busca?q=${encodeURIComponent(p.nome.split(' ').slice(0, 3).join(' '))}`);
        await page.waitForTimeout(5000);

        const cards = await page.$$('.product-card__content');
        const candidates = [];
        for (const card of cards) {
            const txt = await card.innerText();
            const price = txt.match(/R\$\s*[\d.,]+/)?.[0] || '0';
            candidates.push({ title: txt.split('\n')[0], price });
        }

        const picked = await selectBestMatch(candidates, p.nome);
        console.log(`LLM Picked: ${picked} -> ${picked !== -1 ? candidates[picked].title : 'NONE'}`);
        await page.close();
    }
    await browser.close();
}
test();
