
import { chromium, Page, BrowserContext, Browser } from 'playwright';
import { createClient } from '@supabase/supabase-js';
import { selectBestMatch } from './ollama';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// ========== CONFIG ==========
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const HEADLESS = true;
const MAX_CONCURRENT_WORKERS = 2;

// ========== TYPES ==========
interface Product {
    id: number;
    nome: string;
}

// ========== UTILS ==========
function normalizePrice(priceText: string | undefined): number {
    if (!priceText) return 0;
    const match = priceText.match(/[\d.,]+/);
    if (!match) return 0;
    let clean = match[0].replace(/\s/g, '');
    if (clean.includes('.') && clean.includes(',')) return parseFloat(clean.replace(/\./g, '').replace(',', '.'));
    if (clean.includes(',') && !clean.includes('.')) return parseFloat(clean.replace(',', '.'));
    return parseFloat(clean);
}

function pickRetailPrice(prices: number[], htmlContext: string): number {
    if (prices.length === 0) return 0;
    const hasSubscription = /assinante|assinatura|programada|clube|socio|vip|prime|fidelidade/i.test(htmlContext);
    if (hasSubscription) return Math.max(...prices);
    return Math.min(...prices);
}

// ========== CORE SCRAPER FUNCTIONS ==========

async function scrapeStore(page: Page, store: string, product: Product): Promise<{ price: number, link: string } | null> {
    const logger = (m: string) => console.log(`[${store}] [${product.id}] ${m}`);

    const query = product.nome.split(' ').slice(0, 4).join(' ');

    const url = store === 'Petz' ? `https://www.petz.com.br/busca?q=${encodeURIComponent(query)}` :
        (store === 'Cobasi' ? `https://www.cobasi.com.br/pesquisa?terms=${encodeURIComponent(query)}` :
            `https://www.petlove.com.br/busca?q=${encodeURIComponent(query)}`);

    try {
        await page.setExtraHTTPHeaders({
            'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Cache-Control': 'max-age=0'
        });

        // Warm up with homepage for cookies if first time
        if (store === 'Petz' && Math.random() > 0.7) {
            await page.goto('https://www.petz.com.br/', { waitUntil: 'domcontentloaded', timeout: 30000 });
            await page.waitForTimeout(2000);
        }

        await page.goto(url, { waitUntil: 'load', timeout: 60000 }).catch(() => { });
        await page.waitForTimeout(6000);

        if (await page.title() === 'Access Denied') {
            logger(`BLOCK: Access Denied. retrying...`);
            await page.waitForTimeout(10000);
            await page.goto(url, { waitUntil: 'load', timeout: 60000 });
            await page.waitForTimeout(5000);
        }

        const selectors = [
            '.product-card-wrapper', '.product-item', '[class*="card-product"]',
            '[class*="ProductCard"]', 'article',
            '.product-card__content', 'article', '[data-testid="product-item"]', 'a[data-testid="product-item"]'
        ];

        let cards: any[] = [];
        for (const sel of selectors) {
            cards = await page.$$(sel);
            if (cards.length > 0) break;
        }

        const candidates: any[] = [];
        for (let i = 0; i < Math.min(cards.length, 12); i++) {
            const card = cards[i];
            const freshText = await card.innerText().catch(() => '');
            if (!freshText) continue;

            const priceMatches = freshText.match(/R\$\s*[\d.,]+/g) || [];
            if (priceMatches.length > 0) {
                const price = pickRetailPrice(priceMatches.map(normalizePrice).filter(v => v > 1), freshText);
                const title = freshText.split('\n')[0].trim();
                const link = await card.$eval('a', (el: any) => el.href).catch(() => page.url());
                candidates.push({ title, price, link, cardIndex: i });
            }
        }

        if (candidates.length === 0) return null;

        const bestIndex = await selectBestMatch(candidates, product.nome);
        if (bestIndex !== -1 && candidates[bestIndex]) {
            const best = candidates[bestIndex];
            logger(`🧠 AI Verified: "${best.title}" @ R$ ${best.price}`);
            return { price: best.price, link: best.link };
        }
    } catch (e) { }
    return null;
}

async function worker(id: number, products: Product[], browser: Browser) {
    console.log(`[Worker ${id}] Intelligent Mode Started.`);
    const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        viewport: { width: 1366, height: 768 }
    });

    for (const prod of products) {
        console.log(`[Worker ${id}] Analyzing: "${prod.nome}"`);
        const stores = ['Petlove', 'Cobasi', 'Petz']; // Shifted Petz to last to allow cookie buildup

        for (const storeName of stores) {
            const page = await context.newPage();
            try {
                await page.waitForTimeout(Math.random() * 3000 + 1000);
                const result = await scrapeStore(page, storeName, prod);

                if (result && result.price > 0) {
                    await supabase.from('precos').upsert({
                        produto_id: prod.id,
                        loja: storeName,
                        preco: result.price,
                        link_afiliado: result.link,
                        ultima_atualizacao: new Date().toISOString()
                    }, { onConflict: 'produto_id,loja' });

                    await supabase.from('historico_precos').insert({
                        produto_id: prod.id,
                        loja: storeName,
                        preco: result.price,
                        data_registro: new Date().toISOString()
                    });
                    console.log(`[Worker ${id}] ✅ ${storeName}: R$ ${result.price.toFixed(2)} [${prod.nome}]`);
                }
            } catch (err) { }
            await page.close();
        }
    }
    await context.close();
}

async function run() {
    const listPath = path.resolve(__dirname, 'mass_update_list.json');
    if (!fs.existsSync(listPath)) return;
    const products: Product[] = JSON.parse(fs.readFileSync(listPath, 'utf8'));
    console.log(`🧠 INTELLIGENT OVERNIGHT BATCH | 409 items | 2 Workers`);
    const browser = await chromium.launch({ headless: HEADLESS });
    const chunks: Product[][] = Array.from({ length: MAX_CONCURRENT_WORKERS }, () => []);
    products.forEach((p, i) => chunks[i % MAX_CONCURRENT_WORKERS].push(p));
    await Promise.all(chunks.map((chunk, i) => worker(i, chunk, browser)));
    await browser.close();
}
run();
