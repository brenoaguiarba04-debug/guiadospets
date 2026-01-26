
import { chromium, Page } from 'playwright';
import { selectBestMatch } from './ollama';
import dotenv from 'dotenv';
import path from 'path';

// ========== CONFIG ==========
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

// ========== UTILS ==========
function simplifyQuery(term: string): string {
    const clean = term.replace(/[^\w\s\u00C0-\u00FF.]/g, ' ').replace(/\b\d+\s*x\b/gi, '').replace(/\s+/g, ' ').trim();
    return clean.split(' ').slice(0, 7).join(' ');
}

function normalizePrice(priceText: string | undefined): number {
    if (!priceText) return 0;
    if (!/R\$|\$/.test(priceText)) return 0;
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
    const hasSubscriptionLabel = /assinante|assinatura|clube|amigo|socio|vip|prime/i.test(htmlContext);
    return hasSubscriptionLabel ? Math.max(...prices) : Math.min(...prices);
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
    const num1 = parseFloat(w1.match(/[\d.]+/)?.[0] || '0');
    const unit1 = w1.match(/[a-z]+/)?.[0] || '';
    const num2 = parseFloat(w2.match(/[\d.]+/)?.[0] || '0');
    const unit2 = w2.match(/[a-z]+/)?.[0] || '';
    const conversions: Record<string, number> = { 'kg': 1000, 'g': 1, 'mg': 0.001, 'l': 1000, 'ml': 1 };
    const grams1 = num1 * (conversions[unit1] || 1);
    const grams2 = num2 * (conversions[unit2] || 1);
    return Math.abs(grams1 - grams2) < 0.01;
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
            }, 80);
        });
    });
}

class Logger {
    private context: string;
    constructor(context: string) { this.context = context; }
    info(msg: string) { console.log(`[${this.context}] ℹ️  ${msg}`); }
    success(msg: string) { console.log(`[${this.context}] ✅ ${msg}`); }
    warning(msg: string) { console.log(`[${this.context}] ⚠️  ${msg}`); }
    error(msg: string, error?: any) { console.error(`[${this.context}] ❌ ${msg}`, error || ''); }
}

async function waitForPageLoad(page: Page, logger: Logger) {
    try {
        await Promise.race([
            page.waitForLoadState('domcontentloaded', { timeout: 15000 }),
            page.waitForTimeout(5000)
        ]);
        await page.waitForTimeout(2000);
    } catch (e: any) { }
}

async function handleCardVariants(card: any, targetWeight: string, logger: Logger) {
    if (targetWeight === 'N/A') return;
    try {
        await card.hover().catch(() => { });
        await new Promise(r => setTimeout(r, 500));
        const options = await card.$$('button, span, div, a');
        for (const opt of options) {
            const text = (await opt.innerText()).trim();
            const foundWeight = extractWeightFromText(text);
            if (foundWeight && weightsMatch(targetWeight, foundWeight)) {
                // Check visibility
                if (await opt.isVisible()) {
                    logger.info(`Selecting variant: ${text}`);
                    await opt.click({ force: true }).catch(() => { });
                    await new Promise(r => setTimeout(r, 1500));
                    return;
                }
            }
        }
    } catch (e: any) {
        // logger.warning(`Failed to handle variants: ${e.message}`);
    }
}

// ========== STORE SCRAPERS ========== //

interface ScrapedResult {
    price: number;
    link: string;
    title: string;
    image?: string;
}

// --- PETZ (STEALTH MODE) ---
async function scrapePetz(page: Page, productQuery: string, targetWeight: string): Promise<ScrapedResult | null> {
    const logger = new Logger('Petz');
    const url = `https://www.petz.com.br/busca?q=${encodeURIComponent(simplifyQuery(productQuery))}`;

    // Interception adapted from Finder/Final
    const interceptedCandidates: any[] = [];
    page.on('response', async response => {
        try {
            const rUrl = response.url();
            if (response.status() === 200 && (rUrl.includes('/busca') || rUrl.includes('api') || rUrl.includes('catalog'))) {
                const contentType = response.headers()['content-type'] || '';
                if (contentType.includes('application/json')) {
                    const json = await response.json();
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
        } catch (e) { }
    });

    try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
        await waitForPageLoad(page, logger);
        await autoScroll(page);

        const candidates: any[] = [];
        const visualCards = await page.$$('.product-card-wrapper, .product-item, [class*="card-product"]');

        for (let i = 0; i < Math.min(visualCards.length, 12); i++) {
            const card = visualCards[i];
            await handleCardVariants(card, targetWeight, logger);
            const title = await card.$eval('h3, .product-name, a.card-link-product', (el: any) => el.innerText).catch(() => '');
            const cardText = await card.innerText();
            const priceMatches = cardText.match(/R\$\s*[\d.,]+/g) || [];
            const vals = priceMatches.map(p => normalizePrice(p)).filter(v => v > 5);
            const price = pickRetailPrice(vals, cardText);
            const link = await card.$eval('a', (el: any) => el.href).catch(() => '');
            if (title && price > 5) candidates.push({ title, price, link: normalizeUrl(link, url) });
        }

        // Merge intercepted
        for (const ic of interceptedCandidates) {
            if (!candidates.find(c => c.title === ic.title)) candidates.push(ic);
        }

        if (candidates.length > 0) {
            const bestIndex = await selectBestMatch(candidates, productQuery);
            return bestIndex !== -1 ? candidates[bestIndex] : candidates[0];
        }
    } catch (e: any) {
        logger.error('Error', e);
        await page.screenshot({ path: 'stealth_petz_fail.png' });
    }
    return null;
}

// --- COBASI (STEALTH MODE) ---
async function scrapeCobasi(page: Page, productQuery: string, targetWeight: string): Promise<ScrapedResult | null> {
    const logger = new Logger('Cobasi');
    const url = `https://www.cobasi.com.br/pesquisa?terms=${encodeURIComponent(simplifyQuery(productQuery))}`;
    try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
        await Promise.race([
            page.waitForSelector('[class*="ProductCard"], article', { timeout: 15000 }),
            page.waitForTimeout(3000)
        ]);
        await autoScroll(page);

        const cards = await page.$$('[class*="ProductCard"], article, [class*="product-card"]');
        const candidates: any[] = [];

        for (const card of cards) {
            await handleCardVariants(card, targetWeight, logger);
            const title = await card.innerText(); // Catch-all text
            const priceMatches = title.match(/R\$\s*[\d.,]+/g) || [];
            const price = pickRetailPrice(priceMatches.map(p => normalizePrice(p)).filter(v => v > 5), title);
            const link = await card.$eval('a', (el: any) => el.href).catch(() => '');

            // Heuristic title extraction
            const cleanTitle = title.split('\n')[0] || title;

            if (price > 5) candidates.push({ title: cleanTitle, price, link: normalizeUrl(link, url) });
        }
        if (candidates.length > 0) {
            const bestIndex = await selectBestMatch(candidates, productQuery);
            return bestIndex !== -1 ? candidates[bestIndex] : candidates[0];
        } else {
            logger.warning("No candidates found via DOM.");
            await page.screenshot({ path: 'stealth_cobasi_empty.png' });
        }
    } catch (e: any) {
        logger.error('Error', e);
        await page.screenshot({ path: 'stealth_cobasi_fail.png' });
    }
    return null;
}

// ========== TEST RUNNER ==========

async function runTest() {
    console.log("=== STEALTH VARIANTS TEST (Args from finder.ts) ===");

    const targets = [
        { weight: '3kg', name: 'Ração Golden Fórmula Cães Adultos Raças Pequenas Carne e Arroz' },
        { weight: '10kg', name: 'Ração Golden Fórmula Cães Adultos Raças Pequenas Carne e Arroz 10kg' },
        { weight: '15kg', name: 'Ração Golden Fórmula Cães Adultos Raças Pequenas Carne e Arroz' }
    ];

    const stores = [
        { name: 'Cobasi', fn: scrapeCobasi },
        { name: 'Petz', fn: scrapePetz }
    ];

    // LAUNCH ARGS FROM FINDER.TS
    const browser = await chromium.launch({
        headless: false
    });

    const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        viewport: { width: 1366, height: 768 },
        locale: 'pt-BR',
        timezoneId: 'America/Sao_Paulo'
    });

    // Mask webdriver property
    await context.addInitScript(() => {
        Object.defineProperty(navigator, 'webdriver', {
            get: () => undefined,
        });
    });

    const results: any[] = [];

    for (const target of targets) {
        console.log(`\n>>> TESTING TARGET: ${target.name} (${target.weight}) <<<`);

        for (const store of stores) {
            console.log(`\n-- Store: ${store.name} --`);
            const page = await context.newPage();
            try {
                const result = await store.fn(page, target.name, target.weight);
                const status = result ? "FOUND" : "NOT FOUND";
                const price = result ? result.price : 0;

                console.log(`RESULT: ${status} | Price: R$ ${price}`);
                results.push({ target: target.weight, store: store.name, status, price });
            } catch (e) {
                console.error(`Exec error ${store.name}:`, e);
            } finally {
                await page.close();
            }
        }
    }

    await browser.close();
    console.table(results);
}

runTest();
