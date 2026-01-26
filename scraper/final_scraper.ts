import { chromium, Page, BrowserContext } from 'playwright';
import { createClient } from '@supabase/supabase-js';
import { selectBestMatch } from './ollama';
import dotenv from 'dotenv';
import path from 'path';

// ========== CONFIG ==========
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
// Prioritize Service Role Key for backend operations
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const HEADLESS = true; // Validated as necessary for stability
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

    // STRICT: Must have currency symbol to be considered a price in our context
    if (!/R\$|\$/.test(priceText)) return 0;

    // Basic sanity check: should have some numbers
    if (!/[\d]/.test(priceText)) return 0;

    // Brazilian price might be "R$ 123,45" or "123.45"
    const match = priceText.match(/[\d.,]+/);
    if (!match) return 0;

    let clean = match[0].replace(/\s/g, '');

    // If it has both dot and comma, common in R$ 1.234,56
    if (clean.includes('.') && clean.includes(',')) {
        return parseFloat(clean.replace(/\./g, '').replace(',', '.'));
    }

    // If it has only comma, assume decimal: 123,45
    if (clean.includes(',') && !clean.includes('.')) {
        return parseFloat(clean.replace(',', '.'));
    }

    return parseFloat(clean);
}

function pickRetailPrice(prices: number[], htmlContext: string): number {
    if (prices.length === 0) return 0;
    if (prices.length === 1) return prices[0];

    // If context implies a subscription lure, pick the HIGHER price (retail)
    const hasSubscriptionLabel = /assinante|assinatura|clube|amigo|socio|vip|prime/i.test(htmlContext);
    if (hasSubscriptionLabel) {
        return Math.max(...prices);
    }

    // Otherwise return the lowest promotional price
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

    const num1 = parseFloat(w1.match(/[\d.]+/)?.[0] || '0');
    const unit1 = w1.match(/[a-z]+/)?.[0] || '';
    const num2 = parseFloat(w2.match(/[\d.]+/)?.[0] || '0');
    const unit2 = w2.match(/[a-z]+/)?.[0] || '';

    const conversions: Record<string, number> = {
        'kg': 1000, 'g': 1, 'mg': 0.001,
        'l': 1000, 'ml': 1
    };

    const grams1 = num1 * (conversions[unit1] || 1);
    const grams2 = num2 * (conversions[unit2] || 1);

    return Math.abs(grams1 - grams2) < 0.01;
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
                // Reduced max height to 2000 (enough for top results)
                if (totalHeight >= scrollHeight || totalHeight >= 2000) {
                    clearInterval(timer);
                    resolve();
                }
            }, 50); // Faster interval
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

// ========== UTILS ==========
async function waitForPageLoad(page: Page, logger: Logger) {
    try {
        // Espera múltiplas condições
        await Promise.race([
            page.waitForLoadState('networkidle', { timeout: 15000 }),
            page.waitForTimeout(8000) // Fallback caso networkidle não funcione
        ]);

        // Espera adicional para JS executar
        await page.waitForTimeout(2000);

        // Verifica se a página tem conteúdo mínimo
        const bodyText = await page.textContent('body');
        if (!bodyText || bodyText.length < 100) {
            logger.warning('Página com pouco conteúdo, aguardando mais...');
            await page.waitForTimeout(3000);
        }
    } catch (e) {
        logger.warning('Timeout em networkidle, continuando...');
    }
}



// ========== STORE SCRAPERS ========== //

// 1. PETZ (Verified)
async function extractHiddenPetzData(page: Page, logger: Logger): Promise<any[]> {
    try {
        const content = await page.content();

        // Helper to decode basic entities
        const decode = (str: string) => str.replace(/&quot;/g, '"').replace(/&amp;/g, '&');

        // Look for products array
        // We look for patterns like 'products': [...] or "products": [...]
        // But also handle &quot;products&quot;: ...

        // Simply looking for large JSON-like arrays
        const regex = /(?:["']?items["']?|["']?products["']?|&quot;items&quot;|&quot;products&quot;)\s*[:=]\s*\[([\s\S]*?)\]/g;
        let match;
        const candidates: any[] = [];

        while ((match = regex.exec(content)) !== null) {
            let listContent = match[1];
            // Decode content to make regex easier
            listContent = decode(listContent);

            // Now extract name, price, id
            // Petz analytics usually have: "name": "...", "price": 123.45, "id": "..."

            const nameMatches = [...listContent.matchAll(/"name"\s*:\s*"([^"]+)"/g)].map(m => m[1]);
            const priceMatches = [...listContent.matchAll(/"price"\s*:\s*([0-9.]+)/g)].map(m => parseFloat(m[1]));
            // Sometimes price is string "10.90"
            const priceMatchesStr = [...listContent.matchAll(/"price"\s*:\s*"([0-9.]+)"/g)].map(m => parseFloat(m[1]));

            const finalPrices = priceMatches.length > 0 ? priceMatches : priceMatchesStr;

            if (nameMatches.length > 0 && finalPrices.length > 0) {
                logger.info(`Extraction found ${nameMatches.length} names and ${finalPrices.length} prices.`);

                for (let i = 0; i < Math.min(nameMatches.length, finalPrices.length); i++) {
                    candidates.push({
                        title: nameMatches[i],
                        price: finalPrices[i],
                        link: `https://www.petz.com.br/busca?q=${encodeURIComponent(nameMatches[i])}`
                    });
                }
            }
        }

        // Fallback: finding "ProductList" JSON in specific script var (window.__INITIAL_STATE__)
        if (candidates.length === 0) {
            const stateMatch = content.match(/window\.__INITIAL_STATE__\s*=\s*(\{[\s\S]*?\});/);
            if (stateMatch) {
                const stateJson = decode(stateMatch[1]);
                const nameMatches = [...stateJson.matchAll(/"name"\s*:\s*"([^"]+)"/g)].map(m => m[1]);
                const priceMatches = [...stateJson.matchAll(/"price"\s*:\s*([0-9.]+)/g)].map(m => parseFloat(m[1]));

                if (nameMatches.length > 0) {
                    logger.info(`State extraction found ${nameMatches.length} items`);
                    for (let i = 0; i < Math.min(nameMatches.length, priceMatches.length); i++) {
                        candidates.push({
                            title: nameMatches[i],
                            price: priceMatches[i],
                            link: `https://www.petz.com.br/busca?q=${encodeURIComponent(nameMatches[i])}`
                        });
                    }
                }
            }
        }

        return candidates;
    } catch (e) {
        logger.warning('Hidden data extraction failed');
        return [];
    }
}

async function scrapePetz(page: Page, productQuery: string, targetWeight: string): Promise<ScrapedResult | null> {
    const logger = new Logger('Petz');
    const url = `https://www.petz.com.br/busca?q=${encodeURIComponent(simplifyQuery(productQuery))}`;

    // Modern Strategy: Network Interception
    const interceptedCandidates: any[] = [];

    // Listen for responses before navigating
    page.on('response', async response => {
        try {
            const rUrl = response.url();
            const status = response.status();

            // Look for search/catalog/api responses
            if (status === 200 && (rUrl.includes('/busca') || rUrl.includes('api') || rUrl.includes('catalog'))) {
                const contentType = response.headers()['content-type'] || '';
                if (contentType.includes('application/json')) {
                    const json = await response.json();
                    // Heuristic: check if this JSON has product-like fields
                    const jsonStr = JSON.stringify(json);
                    if (jsonStr.includes('"name"') && (jsonStr.includes('"price"') || jsonStr.includes('"promotional_price"'))) {
                        // Extract products from common structures
                        const items = json.products || json.items || (Array.isArray(json) ? json : []);
                        if (Array.isArray(items)) {
                            items.forEach((item: any) => {
                                if (item.name && (item.price || item.promotional_price)) {
                                    interceptedCandidates.push({
                                        title: item.name,
                                        price: parseFloat(item.promotional_price || item.price || '0'),
                                        link: item.url ? (item.url.startsWith('http') ? item.url : `https://www.petz.com.br${item.url}`) : ''
                                    });
                                }
                            });
                        }
                    }
                }
            }
        } catch (e) {
            // Ignore parse errors from non-json or unrelated responses
        }
    });

    try {
        await page.goto(url, { waitUntil: 'load', timeout: 90000 });
        await waitForPageLoad(page, logger);

        // Visual check for cards (Traditional Scrapping)
        await page.waitForSelector('.product-card-wrapper, .product-item, [class*="card-product"], li.li-product, body', {
            timeout: 10000
        }).catch(() => logger.warning('Seletor de cards não encontrado'));

        await autoScroll(page);
        await page.waitForTimeout(3000); // Give time for network calls to finish

        const visualCards = await page.$$('.product-card-wrapper, .product-item, [class*="card-product"], li.li-product');
        const candidates: any[] = [];

        // Add visual results
        for (let i = 0; i < Math.min(visualCards.length, 12); i++) {
            try {
                const card = visualCards[i];
                let title = '';
                let price = 0;
                let link = '';

                const jsonEl = await card.$('.jsonGa');
                if (jsonEl) {
                    const jsonText = await jsonEl.textContent();
                    const data = JSON.parse(jsonText || '{}');
                    title = data.name;
                    price = parseFloat(data.promotional_price || data.price || '0');
                }

                if (!title) {
                    title = await card.$eval('a.card-link-product, .product-name, h3', (el: any) => el.innerText).catch(() => '') || '';
                }

                if (price === 0) {
                    const containerText = await card.innerText();
                    const priceMatches = containerText.match(/R\$\s*[\d.,]+/g) || [];
                    const vals = priceMatches.map(p => normalizePrice(p)).filter(v => v > 5);
                    price = pickRetailPrice(vals, containerText);
                }

                link = await card.$eval('a', (el: any) => el.href).catch(() => '') || '';

                if (title && price > 0) {
                    candidates.push({ title, price, link: normalizeUrl(link, url) });
                }
            } catch (e) { }
        }

        // Merge with intercepted data
        interceptedCandidates.forEach(ic => {
            if (!candidates.find(c => c.title === ic.title)) {
                candidates.push(ic);
            }
        });

        if (candidates.length === 0) {
            logger.info('No data found, attempting hidden DOM extraction...');
            const hidden = await extractHiddenPetzData(page, logger);
            candidates.push(...hidden);
        }

        if (candidates.length > 0) {
            logger.info(`[Petz] Found ${candidates.length} candidates.`);
            try {
                const bestIndex = await selectBestMatch(candidates, productQuery);
                if (bestIndex !== -1) return candidates[bestIndex];
            } catch (err) {
                logger.warning('LLM Error, falling back to deterministic match');
            }

            const fallback = candidates.find(c => weightsMatch(targetWeight, extractWeightFromText(c.title)));
            if (fallback) return fallback;

            return candidates[0];
        }
    } catch (e) {
        logger.error('Error', e);
        await page.screenshot({ path: `debug_petz_${Date.now()}.png` }).catch(() => { });
    }
    return null;
}

// 2. PETLOVE (Verified Navigation)
async function scrapePetlove(page: Page, productQuery: string, targetWeight: string): Promise<ScrapedResult | null> {
    const logger = new Logger('Petlove');
    const url = `https://www.petlove.com.br/busca?q=${encodeURIComponent(simplifyQuery(productQuery))}`;

    try {
        await page.goto(url, { waitUntil: 'load', timeout: 60000 });
        await waitForPageLoad(page, logger);

        // STRATEGY: JSON-LD Structured Data
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
                } catch (e) { }
            }
            return [];
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
            } catch (err) {
                logger.warning('LLM Match Error');
            }

            if (!bestMatch) {
                bestMatch = candidates.find(c => weightsMatch(targetWeight, extractWeightFromText(c.title)));
            }

            if (!bestMatch) bestMatch = candidates[0];

            if (bestMatch && bestMatch.link) {
                const pdpUrl = normalizeUrl(bestMatch.link, url);
                logger.info(`Visiting PDP: ${pdpUrl}`);
                await page.goto(pdpUrl, { waitUntil: 'load', timeout: 60000 });
                await page.waitForTimeout(3000);

                const wText = targetWeight.replace(/\s/g, '').replace('.', ',');
                const variants = [wText, wText.replace(',', '.'), targetWeight];

                let clicked = false;
                for (const v of variants) {
                    const buttons = await page.$$(`button:has-text("${v}"), label:has-text("${v}")`);
                    for (const btn of buttons) {
                        const txt = await btn.innerText();
                        if (txt.toLowerCase().includes(v.toLowerCase())) {
                            await btn.click().catch(() => { });
                            await page.waitForTimeout(2000);
                            clicked = true;
                            break;
                        }
                    }
                    if (clicked) break;
                }

                const priceSelectors = [
                    '.price-current',
                    '[data-testid="price-current"]',
                    '.product-price',
                    '.new-price',
                    '.price-now',
                    'span[class*="price"]',
                    'div[class*="price"]'
                ];
                let detectedPrices: number[] = [];
                const bodyText = await page.innerText('body');

                for (const sel of priceSelectors) {
                    const elements = await page.$$(sel);
                    for (const el of elements) {
                        const txt = await el.innerText();
                        const p = normalizePrice(txt);
                        if (p > 5) detectedPrices.push(p);
                    }
                }

                // Metadata fallback
                const metaPrice = await page.$eval('meta[property="product:price:amount"]', (el: any) => el.content).catch(() => null);
                if (metaPrice) detectedPrices.push(normalizePrice(metaPrice));

                // Structured data fallback
                if (detectedPrices.length === 0 && bestMatch.price > 5) {
                    detectedPrices.push(bestMatch.price);
                }

                const finalPrice = pickRetailPrice([...new Set(detectedPrices)], bodyText);
                if (finalPrice > 5) return { price: finalPrice, link: pdpUrl, title: bestMatch.title };
            }
        }
    } catch (e) {
        logger.error('Error', e);
    }
    return null;
}

// 3. COBASI (Verified Deterministic)
async function scrapeCobasi(page: Page, productQuery: string, targetWeight: string): Promise<ScrapedResult | null> {
    const logger = new Logger('Cobasi');
    const url = `https://www.cobasi.com.br/pesquisa?terms=${encodeURIComponent(simplifyQuery(productQuery))}`;

    try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 }); // Reduced timeout
        // Dynamic wait for card or timeout
        await Promise.race([
            page.waitForSelector('[class*="ProductCard"], [class*="product-card"], article', { timeout: 10000 }),
            page.waitForTimeout(2000)
        ]);

        await autoScroll(page);

        const cards = await page.$$('[class*="ProductCard"], [class*="product-card"], article, [data-testid*="product"]');
        const candidates: any[] = [];
        const keywords = productQuery.toLowerCase().split(' ').filter(w => w.length > 3);

        for (let i = 0; i < Math.min(cards.length, 12); i++) {
            const card = cards[i];
            let title = await card.$eval('img', (el: any) => el.getAttribute('alt')).catch(() => '') || '';
            if (!title) title = await card.innerText().catch(() => '') || '';

            const cardText = await card.innerText();
            const detectedWeight = extractWeightFromText(title) || extractWeightFromText(cardText);
            const matches = keywords.filter(k => title.toLowerCase().includes(k) || cardText.toLowerCase().includes(k));

            if (matches.length >= 2) {
                const priceMatches = cardText.match(/R\$\s*[\d.,]+/g) || [];
                const vals = priceMatches.map(p => normalizePrice(p)).filter(v => v > 5);
                let bestPrice = pickRetailPrice(vals, cardText);

                let link = await card.$eval('a', (el: any) => el.href).catch(() => '') || '';
                if (!link) link = await card.evaluate((el: any) => el.closest('a')?.href).catch(() => '') || '';

                if (title && bestPrice > 0) {
                    const fullTitle = detectedWeight && !title.includes(detectedWeight) ? `${title} ${detectedWeight}` : title;
                    candidates.push({ title: fullTitle, price: bestPrice, link: normalizeUrl(link, url) });
                }
            }
        }

        if (candidates.length > 0) {
            try {
                const bestIndex = await selectBestMatch(candidates, productQuery);
                if (bestIndex !== -1) return candidates[bestIndex];
            } catch (err) {
                logger.warning('LLM Error, falling back to deterministic match');
            }

            // Fallback
            const fallback = candidates.find(c => weightsMatch(targetWeight, extractWeightFromText(c.title)));
            if (fallback) return fallback;
        }
    } catch (e) { logger.error('Error', e); }
    return null;
}

// 4. AMAZON (Ported)
async function scrapeAmazon(page: Page, productQuery: string, targetWeight: string): Promise<ScrapedResult | null> {
    const logger = new Logger('Amazon');
    const url = `https://www.amazon.com.br/s?k=${encodeURIComponent(productQuery)}`;

    try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForTimeout(2000);

        const cards = await page.$$('[data-component-type="s-search-result"]');
        const candidates: any[] = [];

        for (let i = 0; i < Math.min(cards.length, 12); i++) {
            const card = cards[i];
            const asin = await card.getAttribute('data-asin');
            if (!asin) continue;

            const title = await card.$eval('h2', el => (el as HTMLElement).innerText).catch(() => '') || '';
            const priceText = await card.$eval('.a-price .a-offscreen', (el: any) => el.innerText).catch(() => '');
            const price = normalizePrice(priceText);
            const image = await card.$eval('img.s-image', (el: any) => el.src).catch(() => '');

            if (title && price > 0) {
                candidates.push({
                    title,
                    price,
                    link: `https://www.amazon.com.br/dp/${asin}`,
                    image
                });
            }
        }

        if (candidates.length > 0) {
            try {
                const bestIndex = await selectBestMatch(candidates, productQuery);
                if (bestIndex !== -1) return candidates[bestIndex];
            } catch (err) {
                logger.warning('LLM Error, falling back to deterministic match');
            }

            // Fallback: Exact Weight Match
            const fallback = candidates.find(c => weightsMatch(targetWeight, extractWeightFromText(c.title)));
            if (fallback) return fallback;
        }
    } catch (e) { logger.error('Error', e); }
    return null;
}

// 5. MERCADO LIVRE (Ported)
async function scrapeMercadoLivre(page: Page, productQuery: string, targetWeight: string): Promise<ScrapedResult | null> {
    const logger = new Logger('MercadoLivre');
    // Reverting to standard search to get more relevant "Best Seller" results first
    const url = `https://lista.mercadolivre.com.br/${encodeURIComponent(productQuery)}`;

    try {
        // Use a generic search URL to reduce bot signals
        await page.goto(url, { waitUntil: 'load', timeout: 60000 }).catch(async (err) => {
            logger.warning(`Initial goto failed: ${err.message}. Retrying...`);
            await page.waitForTimeout(2000);
            return page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        });

        await page.waitForTimeout(2000 + Math.random() * 3000); // Increased Jitter

        // Check for Login Wall or "Access Denied"
        const pageTitle = await page.title();
        if (page.url().includes('mercadolivre.com.br/gz/login') ||
            await page.$('input[name="user_id"]') ||
            pageTitle.includes('Acceso restringido') ||
            pageTitle.includes('Login')) {
            logger.error('Anti-bot triggered: Mercado Livre is asking for login or restricted access.');
            return null;
        }

        // Wait for results to appear
        const contentSelector = '.ui-search-result__wrapper, .poly-card, .ui-search-layout, [class*="product-card"]';
        await page.waitForSelector(contentSelector, { timeout: 10000 }).catch(() => {
            logger.warning('Results selector not found within 10s.');
        });

        await autoScroll(page);
        await page.waitForTimeout(1000);

        const cards = await page.$$('.ui-search-result__wrapper, .poly-card, li.ui-search-layout__item, .poly-component, .ui-search-item');
        logger.info(`Found ${cards.length} cards on the page.`);
        const candidates: any[] = [];

        for (let i = 0; i < Math.min(cards.length, 30); i++) {
            const card = cards[i];
            const title = await card.$eval('.ui-search-item__title, .poly-component__title, h2, .ui-search-item__group__element', (el: any) => el.innerText).catch(() => '') || '';
            const cardText = await card.innerText();

            const detectedWeight = extractWeightFromText(title) || extractWeightFromText(cardText);

            // DEBUG
            // console.log(`[ML DEBUG] Card ${i}: Title="${title}" Weight="${detectedWeight}" TextLen=${cardText.length}`);

            if (weightsMatch(targetWeight, detectedWeight)) {
                const priceMatches = cardText.match(/R\$\s*[\d.,]+/g) || [];
                const vals = priceMatches.map(p => normalizePrice(p)).filter(v => v > 10);
                const price = pickRetailPrice(vals, cardText);
                const link = await card.$eval('a', (el: any) => el.href).catch(() => '') || '';
                const isBestSeller = cardText.toLowerCase().includes('mais vendido') || cardText.toLowerCase().includes('best seller');

                // Price Floor for Areia 4kg: R$ 50 (to avoid 1kg or accessories)
                if (price > 50) {
                    candidates.push({ price, link: normalizeUrl(link, url), title, isBestSeller });
                }
            }
        }

        if (candidates.length === 0 && cards.length > 0) {
            logger.warning(`Found ${cards.length} cards but 0 candidates matched weight ${targetWeight}`);
            await page.screenshot({ path: `debug_ml_fail.png` });
        }

        if (candidates.length > 0) {
            try {
                // Use LLM to pick the absolute best among candidates
                const bestIndex = await selectBestMatch(candidates, productQuery);
                if (bestIndex !== -1) return candidates[bestIndex];
            } catch (err) {
                logger.warning('LLM Error, falling back to deterministic priority');
            }

            // Fallback Priority: Cheapest among Best Sellers, OR just Cheapest if none are Best Sellers
            const bestSellers = candidates.filter(c => c.isBestSeller);
            if (bestSellers.length > 0) {
                bestSellers.sort((a, b) => a.price - b.price);
                return bestSellers[0];
            }
            candidates.sort((a, b) => a.price - b.price);
            return candidates[0];
        }
    } catch (e) { logger.error('Error', e); }
    return null;
}


// ========== ENGINE ==========
async function processProduct(context: BrowserContext, product: Product) {
    const contextLogger = new Logger(`Product:${product.nome}`);
    const weight = extractWeightFromText(product.nome);

    if (!weight) {
        contextLogger.warning('No weight detected in product name, skipping exact match check.');
        // We could implement fuzzy search here, but for now skip or warn
    }

    const w = weight || 'N/A';
    contextLogger.info(`Processing weight: ${w}`);

    // Standard headers for all pages
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
        { name: 'cobasi', fn: scrapeCobasi },
        { name: 'amazon', fn: scrapeAmazon }
    ];

    for (const store of stores) {
        try {
            const page = await context.newPage();
            // Set extra headers per page since persistent context headers are set at launch
            await page.setExtraHTTPHeaders(extraHeaders);

            contextLogger.info(`Scraping ${store.name}...`);
            const result = await store.fn(page, product.nome, w);

            if (result) {
                // STRICT FINAL WEIGHT CHECK
                const foundWeight = extractWeightFromText(result.title);
                if (weight) {
                    if (!foundWeight || !weightsMatch(weight, foundWeight)) {
                        contextLogger.warning(`${store.name} Weight Mismatch/Missing: Expected ${weight}, Found ${foundWeight || 'None'}. Skipping.`);
                        await page.close();
                        continue;
                    }
                }

                contextLogger.success(`${store.name} Found: R$ ${result.price}`);
                // Save to DB
                const { error: insertError } = await supabase.from('precos').insert({
                    produto_id: product.id,
                    preco: result.price,
                    loja: store.name,
                    link_afiliado: result.link,
                    ultima_atualizacao: new Date().toISOString()
                });

                if (insertError) {
                    contextLogger.error(`DB Error: ${insertError.message}`);
                }
            } else {
                contextLogger.warning(`${store.name} No match.`);
            }
            await page.close();
        } catch (e) {
            contextLogger.error(`Error processing ${store.name}`, e);
        }
    }
}

async function runMain() {
    console.log("=== STARTING FINAL SCRAPER (Full Run) ===");

    const { data: rawProducts, error } = await supabase.from('produtos').select('*');
    const products = rawProducts || [];
    console.log(`Processing ${products.length} products.`);

    // const userDataDir = path.resolve(__dirname, 'browser_session_final');
    // console.log(`Using browser session from: ${userDataDir}`);

    // SWITCHING TO EPHEMERAL CONTEXT (Like test_cobasi.ts) to avoid persistent state issues
    const browser = await chromium.launch({
        headless: HEADLESS,
        args: ['--no-sandbox', '--disable-setuid-sandbox'] // Standard safety args
    });

    const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        viewport: { width: 1920, height: 1080 },
        bypassCSP: true,
        javaScriptEnabled: true,
    });

    // Optimized: Parallelize Store Scraping
    const stores = [
        { name: 'petz', fn: scrapePetz },
        { name: 'petlove', fn: scrapePetlove },
        { name: 'cobasi', fn: scrapeCobasi },
        { name: 'amazon', fn: scrapeAmazon }
        // Mercado Livre REMOVED for performance
    ];

    const allResults: any[] = [];

    for (const p of products) {
        // Parallelize stores for this product
        const storePromises = stores.map(async (store) => {
            let page: Page | null = null;
            try {
                page = await context.newPage();
                await page.setExtraHTTPHeaders({
                    'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
                    'sec-ch-ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
                    'sec-ch-ua-mobile': '?0',
                    'sec-ch-ua-platform': '"Windows"',
                    'Upgrade-Insecure-Requests': '1'
                });

                console.log(`[${p.nome}] Scraping ${store.name}...`);
                const result = await store.fn(page, p.nome, extractWeightFromText(p.nome) || 'N/A');

                if (result) {
                    console.log(`[${p.nome}] ✅ ${store.name} Found: R$ ${result.price}`);

                    try {
                        const { error: priceError } = await supabase.from('precos').insert({
                            produto_id: p.id,
                            preco: result.price,
                            loja: store.name,
                            link_afiliado: result.link,
                            ultima_atualizacao: new Date().toISOString()
                        });

                        if (priceError) {
                            console.error(`[DB Error] Failed to save price: ${priceError.message}`);
                        }

                        // Update product image if found
                        if (result.image) {
                            await supabase.from('produtos')
                                .update({ imagem_url: result.image })
                                .eq('id', p.id);
                        }
                    } catch (dbErr) {
                        console.error(`[Unexpected Error] DB operation failed`, dbErr);
                    }
                    return { store: store.name, ...result };
                } else {
                    console.log(`[${p.nome}] ⚠️ ${store.name} No match`);
                }
            } catch (e) {
                console.error(`Error ${store.name}`, e);
            } finally {
                if (page) await page.close().catch(() => { });
            }
            return null;
        });

        const results = await Promise.all(storePromises);
        const validResults = results.filter(r => r !== null);

        allResults.push({ product: p.nome, prices: validResults });

        // Small delay between products
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log("=== FINAL REPORT ===");
    console.log(JSON.stringify(allResults, null, 2));
    await context.close();
    await browser.close();
    console.log("=== DONE ===");
}

runMain();
