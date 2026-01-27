
import { chromium, Page, BrowserContext } from 'playwright';
import { createClient } from '@supabase/supabase-js';
import { selectBestMatch } from './ollama';
import dotenv from 'dotenv';
import path from 'path';

// ========== CONFIG ==========
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const HEADLESS = false; // Using false to ensure Petz scraping works

// ========== TYPES ==========
interface Product {
    id: string;
    nome: string;
    imagem_url?: string;
}

interface ScrapedResult {
    price: number;
    link: string;
    title: string;
    image?: string;
}

// ========== UTILS ==========
function simplifyQuery(term: string): string {
    const clean = term.replace(/[^\w\s\u00C0-\u00FF.]/g, ' ').replace(/\b\d+\s*x\b/gi, '').replace(/\s+/g, ' ').trim();
    return clean.split(' ').slice(0, 7).join(' ');
}

function normalizePrice(priceText: string | undefined): number {
    if (!priceText) return 0;
    if (!/R\$|\$/.test(priceText) && !/[\d]/.test(priceText)) return 0;

    const match = priceText.match(/[\d.,]+/);
    if (!match) return 0;

    let clean = match[0].replace(/\s/g, '');

    if (clean.includes('.') && clean.includes(',')) {
        return parseFloat(clean.replace(/\./g, '').replace(',', '.'));
    }
    if (clean.includes(',') && !clean.includes('.')) {
        return parseFloat(clean.replace(',', '.'));
    }
    return parseFloat(clean);
}

function pickRetailPrice(prices: number[], htmlContext: string): number {
    if (prices.length === 0) return 0;
    if (prices.length === 1) return prices[0];
    const hasSubscriptionLabel = /assinante|assinatura|clube|amigo|socio|vip|prime/i.test(htmlContext);
    if (hasSubscriptionLabel) return Math.max(...prices);
    return Math.min(...prices);
}

function normalizeUrl(link: string, baseUrl: string): string {
    if (!link || link === 'NOT_FOUND') return baseUrl;
    try {
        return new URL(link, baseUrl).href;
    } catch (e) {
        if (link.startsWith('//')) return `https:${link}`;
        if (link.startsWith('/')) {
            const parsed = new URL(baseUrl);
            return `${parsed.origin}${link}`;
        }
        return link;
    }
}

function extractWeightFromText(text: string): string | null {
    // Check for range first: "2 a 4 kg", "2-4kg", "10 a 20 kg"
    const rangeMatch = text.match(/(\d+(?:[\.,]\d+)?)\s*(?:a|-|à)\s*(\d+(?:[\.,]\d+)?)\s?(kg|g|ml|l|mg)/i);
    if (rangeMatch) {
        const u = rangeMatch[3].toLowerCase();
        return `${rangeMatch[1]}-${rangeMatch[2]}${u}`;
    }
    const match = text.match(/(\d+(?:[\.,]\d+)?)\s?(kg|g|ml|l|mg)/i);
    return match ? match[0].toLowerCase().replace(/\s+/g, '') : null;
}

function normalizeWeight(weight: string): string {
    const clean = weight.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return clean.replace(/\s+/g, '').replace(',', '.');
}

function weightsMatch(weight1: string | null, weight2: string | null): boolean {
    if (!weight1 || !weight2) return false;
    const w1 = normalizeWeight(weight1);
    const w2 = normalizeWeight(weight2);
    if (w1 === w2) return true;

    // Helper to parse value/unit
    const parseW = (w: string) => {
        if (w.includes('-')) {
            const parts = w.match(/([\d.]+)-([\d.]+)([a-z]+)/);
            if (!parts) return { n: 0, u: '' }; // Should not happen if normalized
            return { min: parseFloat(parts[1]), max: parseFloat(parts[2]), u: parts[3], isRange: true };
        }
        return { n: parseFloat(w.match(/[\d.]+/)?.[0] || '0'), u: w.match(/[a-z]+/)?.[0] || '', isRange: false };
    };

    const p1: any = parseW(w1);
    const p2: any = parseW(w2);

    // Unit check must match
    if (p1.u !== p2.u) return false;

    if (p1.isRange && p2.isRange) {
        return (Math.abs(p1.min - p2.min) < 0.1 && Math.abs(p1.max - p2.max) < 0.1);
    }

    if (p1.isRange && !p2.isRange) return false;
    if (!p1.isRange && p2.isRange) return false;

    // Normal comparison
    return Math.abs(p1.n - p2.n) < 0.01;
}

async function autoScroll(page: Page) {
    await page.evaluate(async () => {
        await new Promise<void>((resolve) => {
            let totalHeight = 0;
            const distance = 400; // Increased distance
            const timer = setInterval(() => {
                const scrollHeight = document.body.scrollHeight;
                window.scrollBy(0, distance);
                totalHeight += distance;
                if (totalHeight >= scrollHeight || totalHeight >= 2500) {
                    clearInterval(timer);
                    resolve();
                }
            }, 50);
        });
    });
}

import fs from 'fs';

class Logger {
    private context: string;
    private logFile: string;

    constructor(context: string) {
        this.context = context;
        this.logFile = path.resolve(__dirname, 'verify_log.txt');
    }

    private write(level: string, msg: string, error?: any) {
        const entry = `[${new Date().toISOString()}] [${this.context}] ${level} ${msg} ${error ? JSON.stringify(error) : ''}\n`;
        console.log(entry.trim());
        try {
            fs.appendFileSync(this.logFile, entry);
        } catch (e) {
            console.error('Failed to write log', e);
        }
    }

    info(msg: string) { this.write('ℹ️ ', msg); }
    success(msg: string) { this.write('✅', msg); }
    warning(msg: string) { this.write('⚠️ ', msg); }
    error(msg: string, error?: any) { this.write('❌', msg, error); }
    debug(msg: string) { this.write('🐛', msg); }
}

async function waitForPageLoad(page: Page, logger: Logger) {
    try {
        await Promise.race([
            page.waitForLoadState('networkidle', { timeout: 15000 }),
            page.waitForTimeout(5000)
        ]);
        await page.waitForTimeout(2000);
    } catch (e) {
        logger.warning('Timeout em networkidle, continuando...');
    }
}

// ========== ROBUST STORE SCRAPERS ========== //

// 1. PETZ (Robust - with Visual Mode Support)
async function scrapePetz(
    page: Page,
    productQuery: string,
    targetWeight: string
): Promise<ScrapedResult | null> {

    const logger = new Logger('Petz');
    const candidates: any[] = [];

    // 1️⃣ Intercepta APIs ANTES de tudo
    page.on('response', async response => {
        try {
            const url = response.url();
            const ct = response.headers()['content-type'] || '';

            if (url.includes('petz')) {
                logger.debug(`[Petz API Debug] Intercepted: ${url} (${ct})`);
            }

            if (
                ct.includes('application/json') &&
                (
                    url.includes('search') ||
                    url.includes('catalog') ||
                    url.includes('bff') ||
                    url.includes('graphql') ||
                    url.includes('busca') ||
                    url.includes('recommendations')
                )
            ) {
                logger.debug(`[Petz API Debug] Intercepted JSON API: ${url}`);
                const json = await response.json();

                const findItems = (obj: any): any[] => {
                    if (!obj) return [];
                    if (Array.isArray(obj)) return obj;
                    if (obj.products) return obj.products;
                    if (obj.items) return obj.items;
                    if (obj.productList) return obj.productList;
                    if (obj.result?.showcases) {
                        return obj.result.showcases.flatMap((s: any) => s.productList || []);
                    }
                    if (obj.data?.products) return obj.data.products;
                    if (obj.data?.search?.products) return obj.data.search.products;
                    return [];
                };

                const rawItems = findItems(json);
                logger.debug(`[Petz API Debug] Found ${rawItems.length} potential base items`);

                for (const baseItem of rawItems) {
                    const variations = baseItem.variations || [baseItem];
                    for (const item of variations) {
                        let title = item.name || baseItem.name || item.productName || '';
                        const baseName = baseItem.name || baseItem.productName || '';

                        // Garante que o título tenha o contexto do nome base se for muito curto (ex: "4kg")
                        if (title.length < 10 && baseName && !title.toLowerCase().includes(baseName.toLowerCase())) {
                            title = `${baseName} ${title}`;
                        }

                        const price = Number(
                            item.sellingPrice ??
                            item.price ??
                            baseItem.sellingPrice ??
                            baseItem.price ??
                            0
                        );

                        // Filtro de segurança para preços absurdamente baixos que não batem com o produto
                        if (price > 0 && price < 25 && productQuery.toLowerCase().includes('viva verde')) {
                            // Se for Viva Verde e estiver muito barato, ignorar candidado suspeito (provavelmente brinde ou item errado)
                            continue;
                        }

                        const link = item.url || item.link || baseItem.url || baseItem.link || '';

                        if (title && price > 0) {
                            candidates.push({
                                title: title.trim(),
                                price,
                                link: link.startsWith('http') ? link : `https://www.petz.com.br${link}`,
                                store: 'petz',
                                weight: extractWeightFromText(title),
                                image: item.thumbnail || item.image || baseItem.image || ''
                            });
                        }
                    }
                }
            }
        } catch { }
    });

    try {
        // 1️⃣ Abre a home SEM esperar render
        await page.goto('https://www.petz.com.br/', {
            waitUntil: 'domcontentloaded',
            timeout: 45000
        });

        // 2️⃣ Dá um pequeno delay humano
        await page.waitForTimeout(2000);

        // 3️⃣ Injeta busca via JS (SEM DOM)
        await page.evaluate((query) => {
            // User's hint
            const ev = new CustomEvent('search', { detail: query });
            window.dispatchEvent(ev);

            // fallback SPA + Form Submission
            const input = document.querySelector('#headerSearch, input[type="search"]') as HTMLInputElement;
            if (input) {
                input.value = query;
                input.dispatchEvent(new Event('input', { bubbles: true }));
                input.dispatchEvent(new Event('change', { bubbles: true }));

                const form = input.closest('form');
                if (form) {
                    const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
                    form.dispatchEvent(submitEvent);
                } else {
                    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', bubbles: true }));
                }
            }
        }, simplifyQuery(productQuery));

        // 4️⃣ Aguarda SOMENTE API
        const maxWait = 12000;
        const start = Date.now();

        while (candidates.length === 0 && Date.now() - start < maxWait) {
            await page.waitForTimeout(500);
        }

        if (candidates.length === 0) {
            logger.warning('No API results from Petz');
            return null;
        }

        logger.success(`Petz API results: ${candidates.length}`);

        // 6️⃣ Escolha do melhor
        try {
            const bestIndex = await selectBestMatch(candidates, productQuery);
            if (bestIndex !== -1) return candidates[bestIndex];
        } catch {
            logger.warning('LLM failed, fallback');
        }

        const fallback = candidates.find(c =>
            weightsMatch(targetWeight, extractWeightFromText(c.title))
        );

        return fallback || candidates[0];

    } catch (e) {
        logger.warning('Petz aborted (timeout or soft-block)');
        return null;
    }
}

// 2. PETLOVE (Robust - JSON-LD)
async function scrapePetlove(page: Page, productQuery: string, targetWeight: string): Promise<ScrapedResult | null> {
    const logger = new Logger('Petlove');
    const url = `https://www.petlove.com.br/busca?q=${encodeURIComponent(simplifyQuery(productQuery))}`;

    try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
        await page.waitForTimeout(3000);

        // STRATEGY: JSON-LD Structured Data
        const candidates: any[] = await page.evaluate(() => {
            const scripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));
            const results: any[] = [];

            for (const script of scripts) {
                try {
                    const json = JSON.parse(script.textContent || '{}');

                    if (json['@type'] === 'ItemList' && json.itemListElement) {
                        json.itemListElement.forEach((item: any) => {
                            results.push({
                                title: item.name || item.item?.name,
                                link: item.url || item.item?.url,
                                price: item.offers?.lowPrice || item.offers?.price || item.item?.offers?.lowPrice || 0
                            });
                        });
                    }
                    else if (json['@type'] === 'Product') {
                        results.push({
                            title: json.name,
                            link: json.url,
                            price: json.offers?.lowPrice || json.offers?.price || 0
                        });
                    }
                } catch (e) { }
            }
            return results;
        });

        if (candidates.length === 0) {
            logger.info('No JSON-LD found, picking from DOM');
            const cards = await page.$$('.product-card__content, [data-testid="product-card"], article');
            for (const card of cards) {
                const title = await card.innerText();
                const link = await card.evaluate(el => el.querySelector('a')?.getAttribute('href') || el.getAttribute('href') || '');
                if (title && link) candidates.push({ title, link, price: 0 });
            }
        }

        if (candidates.length > 0) {
            logger.info(`Found ${candidates.length} candidates.`);
            let bestMatch = null;
            try {
                const bestIndex = await selectBestMatch(candidates, productQuery);
                if (bestIndex !== -1) bestMatch = candidates[bestIndex];
            } catch (err) { logger.warning('LLM Match Error'); }

            if (!bestMatch) {
                bestMatch = candidates.find(c => weightsMatch(targetWeight, extractWeightFromText(c.title)));
            }

            if (!bestMatch) bestMatch = candidates[0];

            if (bestMatch && bestMatch.link && bestMatch.price > 5) {
                return { price: bestMatch.price, link: normalizeUrl(bestMatch.link, url), title: bestMatch.title };
            }
        }
    } catch (e) {
        logger.error('Error', e);
    }
    return null;
}

// 3. COBASI (Robust - HTML Attributes)
async function scrapeCobasi(page: Page, productQuery: string, targetWeight: string): Promise<ScrapedResult | null> {
    const logger = new Logger('Cobasi');
    const url = `https://www.cobasi.com.br/pesquisa?terms=${encodeURIComponent(simplifyQuery(productQuery))}`;

    try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });

        try {
            await page.waitForSelector('[data-testid="product-item-v4"], [class*="ProductCard"]', { timeout: 15000 });
        } catch (e) { }

        await autoScroll(page);

        const cards = await page.$$('[data-testid="product-item-v4"], [class*="ProductCard"], article');
        const candidates: any[] = [];

        for (let i = 0; i < Math.min(cards.length, 12); i++) {
            const card = cards[i];
            let title = '';

            title = await card.$eval('h3', el => el.textContent?.trim()).catch(() => '') || '';
            if (!title) title = await card.$eval('img', el => el.getAttribute('alt')).catch(() => '') || '';
            if (!title) title = await card.innerText().catch(() => '') || '';

            const cardText = await card.innerText();
            const priceEl = await card.$('.card-price');
            let price = 0;

            if (priceEl) {
                const pText = await priceEl.innerText();
                price = normalizePrice(pText);
            } else {
                const priceMatches = cardText.match(/R\$\s*[\d.,]+/g) || [];
                const vals = priceMatches.map(p => normalizePrice(p)).filter(v => v > 5);
                price = pickRetailPrice(vals, cardText);
            }

            let link = await card.getAttribute('href') || await card.$eval('a', el => el.getAttribute('href')).catch(() => '') || '';

            if (title && price > 0) {
                // Weight Enrichment for Cobasi
                const tWeight = extractWeightFromText(title);
                if (!tWeight) {
                    const extraWeight = extractWeightFromText(cardText);
                    if (extraWeight) title = `${title} - ${extraWeight}`;
                }
                candidates.push({ title, price, link: normalizeUrl(link, url) });
            }
        }

        if (candidates.length > 0) {
            try {
                const bestIndex = await selectBestMatch(candidates, productQuery);
                if (bestIndex !== -1) return candidates[bestIndex];
            } catch (err) { logger.warning('LLM Error, falling back'); }

            const fallback = candidates.find(c => weightsMatch(targetWeight, extractWeightFromText(c.title)));
            if (fallback) return fallback;
            return candidates[0];
        }
    } catch (e) { logger.error('Error', e); }
    return null;
}

// ========== ENGINE ==========
async function processProduct(context: BrowserContext, product: Product) {
    const contextLogger = new Logger(`Product:${product.nome}`);
    const weight = extractWeightFromText(product.nome);
    const w = weight || 'N/A';
    contextLogger.info(`Processing weight: ${w}`);

    const extraHeaders = {
        'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
        'sec-ch-ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"Windows"',
        'Upgrade-Insecure-Requests': '1'
    };

    const stores = [
        { name: 'petz', fn: scrapePetz },
        { name: 'petlove', fn: scrapePetlove },
        { name: 'cobasi', fn: scrapeCobasi }
    ];

    for (const store of stores) {
        try {
            const page = await context.newPage();
            await page.setExtraHTTPHeaders(extraHeaders);

            contextLogger.info(`Scraping ${store.name}...`);
            const result = await store.fn(page, product.nome, w);

            if (result) {
                const foundWeight = extractWeightFromText(result.title);
                if (weight) {
                    if (!foundWeight || !weightsMatch(weight, foundWeight)) {
                        contextLogger.warning(`${store.name} Weight Mismatch/Missing: Expected ${weight}, Found ${foundWeight || 'None'}. Skipping.`);
                        await page.close();
                        continue;
                    }
                }

                contextLogger.success(`${store.name} Found: R$ ${result.price} | ${result.title}`);
            } else {
                contextLogger.warning(`${store.name} No match.`);
            }
            await page.close();
        } catch (e) {
            contextLogger.error(`Error processing ${store.name}`, e);
        }
    }
}

async function verifyMain() {
    console.log("=== VERIFICATION: VIVA VERDE 4KG ===");
    console.log("Initializing simplified verification run (NO DATABASE INSERT)...");

    const browser = await chromium.launch({
        headless: HEADLESS,
        args: ['--start-maximized', '--disable-blink-features=AutomationControlled'],
        ignoreDefaultArgs: ['--enable-automation']
    });

    const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        viewport: { width: 1366, height: 768 },
        bypassCSP: true,
        javaScriptEnabled: true,
    });

    const testProduct = { id: 'test', nome: 'Areia Viva Verde 4kg' };
    await processProduct(context, testProduct);

    await browser.close();
    console.log("=== VERIFICATION COMPLETE ===");
}

verifyMain();
