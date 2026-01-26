import { chromium, Page, BrowserContext } from 'playwright';
import { selectBestMatch } from './ollama';

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
        await Promise.race([page.waitForLoadState('networkidle', { timeout: 15000 }), page.waitForTimeout(8000)]);
        await page.waitForTimeout(2000);
        await page.waitForSelector('body', { timeout: 5000 });
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
                const isVisible = await opt.isVisible();
                if (isVisible) {
                    logger.info(`Selecting variant: ${text}`);
                    await opt.click({ force: true }).catch(() => { });
                    await new Promise(r => setTimeout(r, 1500));
                    return;
                }
            }
        }
    } catch (e: any) { logger.warning(`Failed to handle variants: ${e.message}`); }
}

// ========== STORE SCRAPERS ==========
async function scrapePetz(page: Page, productQuery: string, targetWeight: string) {
    const logger = new Logger('Petz');
    const url = `https://www.petz.com.br/busca?q=${encodeURIComponent(simplifyQuery(productQuery))}`;
    try {
        await page.setExtraHTTPHeaders({
            'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
            'sec-ch-ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
            'sec-ch-ua-mobile': '?0',
            'sec-ch-ua-platform': '"Windows"',
            'Upgrade-Insecure-Requests': '1'
        });
        await page.goto(url, { waitUntil: 'load', timeout: 90000 });
        if (await page.title() === 'Access Denied') {
            await page.waitForTimeout(5000);
            await page.goto(url, { waitUntil: 'load', timeout: 90000 });
        }
        await waitForPageLoad(page, logger);
        await autoScroll(page);
        const visualCards = await page.$$('.product-card-wrapper, .product-item, [class*="card-product"]');
        const candidates: any[] = [];
        for (let i = 0; i < Math.min(visualCards.length, 6); i++) {
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
        if (candidates.length > 0) {
            const bestIndex = await selectBestMatch(candidates, productQuery + " " + targetWeight);
            return bestIndex !== -1 ? candidates[bestIndex] : candidates[0];
        }
    } catch (e: any) { logger.error('Error', e); }
    return null;
}

async function scrapePetlove(page: Page, productQuery: string, targetWeight: string) {
    const logger = new Logger('Petlove');
    const url = `https://www.petlove.com.br/busca?q=${encodeURIComponent(simplifyQuery(productQuery))}`;
    try {
        await page.goto(url, { waitUntil: 'load', timeout: 60000 });
        await waitForPageLoad(page, logger);
        const candidates: any[] = [];
        const cards = await page.$$('.product-card__content, article');
        for (const card of cards) {
            const title = await card.innerText();
            const link = await card.evaluate(el => el.querySelector('a')?.getAttribute('href') || el.getAttribute('href') || '');
            if (title && link) candidates.push({ title, link, price: 0 });
        }
        if (candidates.length > 0) {
            const bestIndex = await selectBestMatch(candidates, productQuery + " " + targetWeight);
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

async function scrapeCobasi(page: Page, productQuery: string, targetWeight: string) {
    const logger = new Logger('Cobasi');
    const url = `https://www.cobasi.com.br/pesquisa?terms=${encodeURIComponent(simplifyQuery(productQuery))}`;
    try {
        await page.goto(url, { waitUntil: 'load', timeout: 60000 });
        await autoScroll(page);
        const cards = await page.$$('[class*="ProductCard"], article');
        const candidates: any[] = [];
        for (const card of cards) {
            await handleCardVariants(card, targetWeight, logger);
            const title = await card.innerText();
            const priceMatches = title.match(/R\$\s*[\d.,]+/g) || [];
            const price = pickRetailPrice(priceMatches.map(p => normalizePrice(p)).filter(v => v > 5), title);
            const link = await card.$eval('a', (el: any) => el.href).catch(() => '');
            if (title && price > 5) candidates.push({ title, price, link: normalizeUrl(link, url) });
        }
        if (candidates.length > 0) {
            const bestIndex = await selectBestMatch(candidates, productQuery + " " + targetWeight);
            return bestIndex !== -1 ? candidates[bestIndex] : candidates[0];
        }
    } catch (e: any) { logger.error('Error', e); }
    return null;
}

async function runChallenge() {
    console.log("=== STARTING CHALLENGE TEST ===");
    const browser = await chromium.launch({ headless: true });
    // Use a context that mimics a real user
    const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        viewport: { width: 1280, height: 800 }
    });

    const targets = [
        { weight: '3kg', name: 'Ração Golden Fórmula Cães Adultos Raças Pequenas Carne e Arroz' },
        { weight: '10kg', name: 'Ração Golden Fórmula Cães Adultos Raças Pequenas Carne e Arroz' },
        { weight: '15kg', name: 'Ração Golden Fórmula Cães Adultos Raças Pequenas Carne e Arroz' }
    ];

    const stores = [
        { name: 'Petz', fn: scrapePetz },
        { name: 'Petlove', fn: scrapePetlove },
        { name: 'Cobasi', fn: scrapeCobasi }
    ];

    console.table(targets);

    for (const target of targets) {
        console.log(`\n\n--- TARGET: ${target.weight} ---`);
        for (const store of stores) {
            try {
                const page = await context.newPage();
                const result = await store.fn(page, target.name, target.weight);
                if (result) {
                    console.log(`[${store.name}] ✅ FOUND: R$ ${result.price} | ${result.title.substring(0, 50)}...`);
                } else {
                    console.log(`[${store.name}] ❌ NOT FOUND`);
                }
                await page.close();
            } catch (err) {
                console.error(`[${store.name}] ERROR:`, err);
            }
        }
    }

    await browser.close();
}

runChallenge();
