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

const HEADLESS = false;
const BATCH_SIZE = 5;

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
    if (!/R\$|\$/.test(priceText)) return 0; // MUST HAVE CURRENCY SYMBOL
    if (!/[\d]/.test(priceText)) return 0;

    const match = priceText.match(/[\d.,]+/);
    if (!match) return 0;
    let clean = match[0].replace(/\s/g, '');
    if (clean.includes('.') && clean.includes(',')) return parseFloat(clean.replace(/\./g, '').replace(',', '.'));
    if (clean.includes(',') && !clean.includes('.')) return parseFloat(clean.replace(',', '.'));
    return parseFloat(clean);
}

function pickRetailPrice(prices: number[], htmlContext: string): number {
    if (prices.length === 0) return 0;
    if (prices.length === 1) return prices[0];
    if (prices.length === 0) return 0;
    if (prices.length === 1) return prices[0];

    // Improved Subscription Filter
    // If context implies subscription, try to pick the MAX (usually retail)
    // Subscription keywords: assinatura, assinante, programada, clube, fidelidade
    const hasSubscription = /assinante|assinatura|programada|clube|socio|vip|prime|fidelidade/i.test(htmlContext);

    if (hasSubscription) {
        return Math.max(...prices);
    }
    return Math.min(...prices);
}

function normalizeUrl(link: string, baseUrl: string): string {
    if (!link || link === 'NOT_FOUND') return baseUrl;
    try {
        const parsed = new URL(link, baseUrl);
        return parsed.href;
    } catch (e: any) {
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

function extractUnitsFromText(text: string): number | null {
    if (!text) return null;
    // Look for patterns like "3 comprimidos", "1 tablete", "20 unidades", "3 unidades"
    const match = text.match(/(\d+)\s*(comprimido|tablete|unidade|comp|un|tabletes|comprimidos|unidades)/i);
    return match ? parseInt(match[1]) : null;
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
            if (!parts) return { n: 0, u: '' };
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
            const distance = 400;
            const timer = setInterval(() => {
                const scrollHeight = document.body.scrollHeight;
                window.scrollBy(0, distance);
                totalHeight += distance;
                if (totalHeight >= scrollHeight || totalHeight >= 2000) { clearInterval(timer); resolve(); }
            }, 50);
        });
    });
}

class Logger {
    private context: string;
    constructor(context: string) { this.context = context; }
    info(msg: string) { console.log(`[${new Date().toISOString()}] [${this.context}] ℹ️  ${msg}`); }
    success(msg: string) { console.log(`[${new Date().toISOString()}] [${this.context}] ✅ ${msg}`); }
    warning(msg: string) { console.log(`[${new Date().toISOString()}] [${this.context}] ⚠️  ${msg}`); }
    error(msg: string, error?: any) { console.error(`[${new Date().toISOString()}] [${this.context}] ❌ ${msg}`, error || ''); }
}

async function waitForPageLoad(page: Page, logger: Logger) {
    try {
        await Promise.race([
            page.waitForLoadState('networkidle', { timeout: 15000 }),
            page.waitForTimeout(8000)
        ]);
        await page.waitForTimeout(2000);
        // Ensure some content is visible
        await page.waitForSelector('body', { timeout: 5000 });
    } catch (e: any) { }
}

async function handleCardVariants(page: Page, card: any, targetWeight: string, logger: Logger) {
    if (targetWeight === 'N/A') return;

    try {
        await card.hover().catch(() => { });

        // Expand variants if hidden (Cobasi/Petlove pattern)
        const expanders = await card.$$('button:has-text("opções"), button:has-text("mais"), [class*="plus"], [class*="more"]');
        for (const exp of expanders) {
            const txt = await exp.innerText().catch(() => '');
            if (/opções|mais|ver/i.test(txt)) {
                await exp.click({ force: true }).catch(() => { });
                await page.waitForTimeout(1000);
            }
        }

        const options = await card.$$('button, span, div, a, label, [class*="variant"], [class*="size"]');
        for (let i = 0; i < options.length; i++) {
            const opt = options[i];
            const text = (await opt.innerText().catch(() => '')).trim();
            const foundWeight = extractWeightFromText(text);

            if (foundWeight && weightsMatch(targetWeight, foundWeight)) {
                logger.info(`Selecting variant: ${text}`);

                // Try multiple click methods
                await opt.click({ force: true }).catch(() => { });
                await opt.dispatchEvent('click').catch(() => { });

                await page.waitForTimeout(3000); // Wait for price update/render
                return true; // Clicked successfully
            }
        }
    } catch (e: any) {
        logger.warning(`Failed to handle variants: ${e.message}`);
    }
    return false;
}

// ========== STORE SCRAPERS ========== //

async function scrapePetz(page: Page, productQuery: string, targetWeight: string): Promise<ScrapedResult | null> {
    const logger = new Logger('Petz');
    const candidates: any[] = [];

    // 1️⃣ Intercepta APIs
    page.on('response', async response => {
        try {
            const url = response.url();
            const ct = response.headers()['content-type'] || '';

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
                for (const baseItem of rawItems) {
                    const variations = baseItem.variations || [baseItem];
                    for (const item of variations) {
                        let title = item.name || baseItem.name || item.productName || '';
                        const baseName = baseItem.name || baseItem.productName || '';

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

                        // Fake positive filter
                        if (price > 0 && price < 25 && productQuery.toLowerCase().includes('viva verde')) continue;

                        const link = item.url || item.link || baseItem.url || baseItem.link || '';
                        if (title && price > 0) {
                            candidates.push({
                                title: title.trim(),
                                price,
                                link: link.startsWith('http') ? link : `https://www.petz.com.br${link}`,
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
        await page.goto('https://www.petz.com.br/', { waitUntil: 'load', timeout: 30000 });

        // Simulação humana: Dispara evento de busca via JS
        await page.evaluate((query) => {
            window.dispatchEvent(new CustomEvent('search', { detail: query }));
        }, simplifyQuery(productQuery));

        // Fallback: Tenta digitar se nada acontecer por 5s
        await page.waitForTimeout(5000);
        if (candidates.length === 0) {
            const input = await page.$('#headerSearch, input[type="search"]');
            if (input) {
                await input.fill(simplifyQuery(productQuery));
                await input.press('Enter');
            }
        }

        await page.waitForTimeout(10000);

        if (candidates.length > 0) {
            try {
                const bestIndex = await selectBestMatch(candidates, productQuery);
                if (bestIndex !== -1) return candidates[bestIndex];
            } catch { }

            const fallback = candidates.find(c => weightsMatch(targetWeight, extractWeightFromText(c.title)));
            return fallback || candidates[0];
        }
    } catch (e) {
        logger.warning('Petz Timeout/Abort');
    }
    return null;
}

async function scrapePetlove(page: Page, productQuery: string, targetWeight: string): Promise<ScrapedResult | null> {
    const logger = new Logger('Petlove');
    const url = `https://www.petlove.com.br/busca?q=${encodeURIComponent(simplifyQuery(productQuery))}`;
    try {
        await page.goto(url, { waitUntil: 'load', timeout: 60000 });
        await waitForPageLoad(page, logger);
        const candidates: any[] = await page.evaluate(() => {
            const scripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));
            for (const script of scripts) {
                try {
                    const json = JSON.parse(script.textContent || '{}');
                    if (json['@type'] === 'ItemList' && json.itemListElement) {
                        return json.itemListElement.map((item: any) => ({
                            title: item.item?.name || item.name,
                            link: item.item?.url || item.url,
                            price: item.item?.offers?.lowPrice || item.offers?.lowPrice || 0
                        }));
                    }
                } catch (e: any) { }
            }
            return [];
        });
        if (candidates.length === 0) {
            const cards = await page.$$('.product-card__content, article');
            for (const card of cards) {
                const title = await card.innerText();
                const link = await card.evaluate(el => el.querySelector('a')?.getAttribute('href') || el.getAttribute('href') || '');
                if (title && link) candidates.push({ title, link, price: 0 });
            }
        }
        if (candidates.length > 0) {
            const bestIndex = await selectBestMatch(candidates, productQuery);
            const best = bestIndex !== -1 ? candidates[bestIndex] : candidates[0];
            const pdpUrl = normalizeUrl(best.link, url);
            await page.goto(pdpUrl, { waitUntil: 'load' });
            await page.waitForTimeout(3000);

            const priceSelectors = ['.price-current', '[data-testid="price-current"]', '.product-price', '.price-now', 'span[class*="price"]', 'div[class*="price"]'];
            let detectedPrices: number[] = [];

            for (const sel of priceSelectors) {
                const els = await page.$$(sel);
                for (const el of els) {
                    const txt = await el.innerText();
                    const p = normalizePrice(txt);
                    if (p > 5) detectedPrices.push(p);
                }
            }
            const bodyText = await page.innerText('body');
            const finalPrice = pickRetailPrice([...new Set(detectedPrices)], bodyText);
            if (finalPrice > 5) return { price: finalPrice, link: pdpUrl, title: best.title };
        }
    } catch (e: any) { logger.error('Error', e); }
    return null;
}

async function scrapeCobasi(page: Page, productQuery: string, targetWeight: string): Promise<ScrapedResult | null> {
    const logger = new Logger('Cobasi');
    const url = `https://www.cobasi.com.br/pesquisa?terms=${encodeURIComponent(simplifyQuery(productQuery))}`;
    try {
        await page.goto(url, { waitUntil: 'load', timeout: 60000 });
        await autoScroll(page);
        const cards = await page.$$('[class*="ProductCard"], article');
        const candidates: any[] = [];
        for (let i = 0; i < cards.length; i++) {
            let card = cards[i];

            // Try to match variant before scraping price
            const clicked = await handleCardVariants(page, card, targetWeight, logger);
            if (clicked) {
                const refetched = await page.$$('[class*="ProductCard"], article');
                if (refetched[i]) card = refetched[i];
            }

            const title = await card.innerText().catch(() => '');
            const priceMatches = title.match(/R\$\s*[\d.,]+/g) || [];
            const price = pickRetailPrice(priceMatches.map(p => normalizePrice(p)).filter(v => v > 5), title);
            const link = await card.$eval('a', (el: any) => el.href).catch(() => '');
            if (title && price > 5) candidates.push({ title, price, link: normalizeUrl(link, url) });
        }
        if (candidates.length > 0) {
            const bestIndex = await selectBestMatch(candidates, productQuery);
            return bestIndex !== -1 ? candidates[bestIndex] : candidates[0];
        }
    } catch (e: any) { logger.error('Error', e); }
    return null;
}

async function scrapeAmazon(page: Page, productQuery: string, targetWeight: string): Promise<ScrapedResult | null> {
    const logger = new Logger('Amazon');
    // Amazon is excluded from variant logic as requested
    const url = `https://www.amazon.com.br/s?k=${encodeURIComponent(productQuery)}`;
    try {
        await page.goto(url, { waitUntil: 'load', timeout: 30000 });
        const cards = await page.$$('[data-component-type="s-search-result"]');
        const candidates: any[] = [];
        for (const card of cards) {
            const title = await card.$eval('h2', el => (el as HTMLElement).innerText).catch(() => '');
            const priceText = await card.$eval('.a-price', (el: any) => el.innerText).catch(() => '');
            const price = normalizePrice(priceText);
            const asin = await card.getAttribute('data-asin');
            if (title && price > 5 && asin) candidates.push({ title, price, link: `https://www.amazon.com.br/dp/${asin}` });
        }
        if (candidates.length > 0) {
            const bestIndex = await selectBestMatch(candidates, productQuery);
            return bestIndex !== -1 ? candidates[bestIndex] : candidates[0];
        }
    } catch (e) { logger.error('Error', e); }
    return null;
}

// ========== ENGINE ==========

async function processProduct(context: BrowserContext, product: Product) {
    const logger = new Logger(`Item:${product.nome.slice(0, 30)}`);
    const targetWeight = extractWeightFromText(product.nome);
    const targetUnits = extractUnitsFromText(product.nome);

    const stores = [
        { name: 'petz', fn: scrapePetz },
        { name: 'petlove', fn: scrapePetlove },
        { name: 'cobasi', fn: scrapeCobasi },
        // Amazon disabled for this cycle as per instruction to focus on others or enabled if desired but without variant logic
        { name: 'amazon', fn: scrapeAmazon }
    ];

    for (const store of stores) {
        let page: Page | null = null;
        try {
            page = await context.newPage();
            // Set standard headers
            await page.setExtraHTTPHeaders({
                'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
                'Upgrade-Insecure-Requests': '1'
            });

            logger.info(`Scraping ${store.name}...`);
            const result = await store.fn(page, product.nome, targetWeight || 'N/A');

            if (result) {
                const foundWeight = extractWeightFromText(result.title);
                const foundUnits = extractUnitsFromText(result.title);

                // STRICT VALIDATION
                // Only reject if we found a weight and it EXPLICITLY mismatches.
                // If foundWeight is null (generic title), we trust the LLM's selection based on the query.
                if (targetWeight && foundWeight && !weightsMatch(targetWeight, foundWeight)) {
                    logger.warning(`${store.name} Weight Mismatch: ${targetWeight} vs ${foundWeight}`);
                    await page.close(); continue;
                }

                // UNIT COUNT VALIDATION (Crucial for Pax of 1 vs 3)
                if (targetUnits && foundUnits && targetUnits !== foundUnits) {
                    logger.warning(`${store.name} Units Mismatch: ${targetUnits} vs ${foundUnits}`);
                    await page.close(); continue;
                }

                logger.success(`${store.name} Found R$ ${result.price}`);

                await supabase.from('precos').insert({
                    produto_id: product.id,
                    preco: result.price,
                    loja: store.name,
                    link_afiliado: result.link,
                    ultima_atualizacao: new Date().toISOString()
                });

                if (result.image) {
                    await supabase.from('produtos').update({ imagem_url: result.image }).eq('id', product.id);
                }
            } else {
                logger.warning(`${store.name} No Match`);
            }
        } catch (e) {
            logger.error(`Error ${store.name}`, e);
        } finally {
            if (page) await page.close().catch(() => { });
        }
    }
}

async function runMain() {
    console.log("=== STARTING REFINED PRODUCTION SCRAPER (V2) ===");
    const { data: products } = await supabase.from('produtos').select('*');
    if (!products) return;

    const browser = await chromium.launch({ headless: HEADLESS });
    const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        viewport: { width: 1280, height: 720 },
    });

    for (let i = 0; i < products.length; i += BATCH_SIZE) {
        const batch = products.slice(i, i + BATCH_SIZE);
        console.log(`\n--- Processing Batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(products.length / BATCH_SIZE)} ---`);
        await Promise.all(batch.map(p => processProduct(context, p)));
    }

    await browser.close();
    console.log("\n=== FULL CATALOG UPDATED (V2) ===");
}

runMain();
