import { chromium, Page } from 'playwright';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

// ========== UTILS ==========
function simplifyQuery(term: string): string {
    const clean = term.replace(/[^\w\s\u00C0-\u00FF]/g, ' ').replace(/\b\d+\s*x\b/gi, '').replace(/\s+/g, ' ').trim();
    return clean.split(' ').slice(0, 5).join(' ');
}

function normalizePrice(priceText: string | undefined): number {
    if (!priceText) return 0;
    const match = priceText.match(/[\d.,]+/);
    if (!match) return 0;
    return parseFloat(match[0].replace(/\./g, '').replace(',', '.'));
}

function extractWeightFromText(text: string): string | null {
    const match = text.match(/(\d+(?:[\.,]\d+)?)\s?(kg|g|ml|l|mg)/i);
    return match ? match[0].toLowerCase().replace(/\s+/g, '') : null;
}

function removeAccents(str: string): string {
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function normalizeWeight(weight: string): string {
    return removeAccents(weight.toLowerCase()).replace(/\s+/g, '').replace(',', '.');
}

function weightsMatch(weight1: string | null, weight2: string | null): boolean {
    if (!weight1 || !weight2) return false;
    const w1 = normalizeWeight(weight1);
    const w2 = normalizeWeight(weight2);
    if (w1 === w2) return true;

    // Fuzzy float match
    const num1 = parseFloat(w1.match(/[\d.]+/)?.[0] || '0');
    const unit1 = w1.match(/[a-z]+/)?.[0] || '';
    const num2 = parseFloat(w2.match(/[\d.]+/)?.[0] || '0');
    const unit2 = w2.match(/[a-z]+/)?.[0] || '';

    if (unit1 !== unit2) return false; // Simple check for now
    return Math.abs(num1 - num2) < 0.01;
}

class Logger {
    private context: string;
    constructor(context: string) { this.context = context; }
    info(msg: string) { console.log(`[${new Date().toISOString()}] [${this.context}] ℹ️  ${msg}`); }
    success(msg: string) { console.log(`[${new Date().toISOString()}] [${this.context}] ✅ ${msg}`); }
    warning(msg: string) { console.log(`[${new Date().toISOString()}] [${this.context}] ⚠️  ${msg}`); }
    error(msg: string, error?: any) { console.error(`[${new Date().toISOString()}] [${this.context}] ❌ ${msg}`, error || ''); }
}

async function autoScroll(page: Page) {
    await page.evaluate(async () => {
        await new Promise<void>((resolve) => {
            let totalHeight = 0;
            const distance = 300;
            const timer = setInterval(() => {
                const scrollHeight = document.body.scrollHeight;
                window.scrollBy(0, distance);
                totalHeight += distance;
                if (totalHeight >= scrollHeight || totalHeight >= 4000) {
                    clearInterval(timer);
                    resolve();
                }
            }, 100);
        });
    });
}

// ========== PETZ LOGIC ==========
async function runPetz(page: Page, product: string, targetWeight: string, logger: Logger) {
    const url = `https://www.petz.com.br/busca?q=${encodeURIComponent(simplifyQuery(product))}`;
    logger.info(`Searching: ${url}`);

    await page.goto(url, { waitUntil: 'load', timeout: 60000 });
    await page.waitForTimeout(4000);
    await autoScroll(page);

    const cards = await page.$$('.product-card-wrapper, .product-item, [class*="card-product"], li.li-product');
    logger.info(`Found ${cards.length} cards`);

    let bestPrice = 0;

    // Scan first few cards for best match
    for (let i = 0; i < Math.min(cards.length, 5); i++) {
        const card = cards[i];
        let title = '';
        let price = 0;

        // Try JSON first
        try {
            const jsonEl = await card.$('.jsonGa');
            if (jsonEl) {
                const jsonText = await jsonEl.textContent();
                const data = JSON.parse(jsonText || '{}');
                title = data.name;
                price = parseFloat(data.priceForSubs || data.promotional_price || data.price);
            }
        } catch (e) { }

        if (!title) {
            title = await card.$eval('a.card-link-product, .product-name, h3', (el: any) => el.innerText).catch(() => '') || '';
        }

        const w = extractWeightFromText(title);
        if (weightsMatch(targetWeight, w)) {
            logger.success(`Match found: ${title}`);
            if (price === 0) {
                const priceText = await card.$eval('.price, .new-price', (el: any) => el.innerText).catch(() => '');
                price = normalizePrice(priceText);
            }
            bestPrice = price;
            break;
        }
    }

    return bestPrice;
}

// ========== PETLOVE LOGIC ==========
async function runPetlove(page: Page, product: string, targetWeight: string, logger: Logger) {
    const url = `https://www.petlove.com.br/busca?q=${encodeURIComponent(simplifyQuery(product))}`;
    logger.info(`Searching: ${url}`);

    await page.goto(url, { waitUntil: 'load', timeout: 60000 });
    await page.waitForTimeout(4000); // Wait for results

    const card = (await page.$$('.product-card__content, [data-testid="product-card"]'))[0];
    if (!card) {
        logger.warning('No card found');
        return 0;
    }

    const link = await card.$('a');
    if (!link) {
        logger.warning('No link on card');
        return 0;
    }

    const href = await link.getAttribute('href');
    const fullUrl = href?.startsWith('http') ? href : `https://www.petlove.com.br${href}`;

    logger.info(`Navigating to details: ${fullUrl}`);
    await page.goto(fullUrl!, { waitUntil: 'load', timeout: 60000 });
    await page.waitForTimeout(3000);

    // Try finding variant
    const wText = targetWeight.replace(/\s/g, '');
    const variants = [wText, wText.replace('kg', ' kg'), wText.replace('g', ' g')];
    let found = false;

    for (const v of variants) {
        const elements = await page.$$(`button:has-text("${v}"), label:has-text("${v}"), div:has-text("${v}")`);
        for (const el of elements) {
            const text = await el.innerText();
            if (text.toLowerCase().includes(v)) {
                logger.info(`Clicking variant: ${text.replace(/\n/g, '')}`);
                await el.click().catch(() => { });
                await page.waitForTimeout(2000);
                found = true;
                break;
            }
        }
        if (found) break;
    }

    // Extract price
    const priceSelectors = ['.price-current', '[data-testid="price-current"]', '.product-price', 'h2'];
    for (const sel of priceSelectors) {
        const el = await page.$(sel);
        if (el) {
            const txt = await el.innerText();
            const p = normalizePrice(txt);
            if (p > 0) return p;
        }
    }
    return 0;
}

// ========== COBASI LOGIC (Basic) ==========
async function runCobasi(page: Page, product: string, targetWeight: string, logger: Logger) {
    const url = `https://www.cobasi.com.br/pesquisa?terms=${encodeURIComponent(simplifyQuery(product))}`;
    logger.info(`Searching: ${url}`);

    await page.goto(url, { waitUntil: 'load', timeout: 60000 });
    await page.waitForTimeout(4000);

    const cards = await page.$$('[class*="ProductCard"], article');
    logger.info(`Found ${cards.length} cards`);

    for (let i = 0; i < Math.min(cards.length, 5); i++) {
        const card = cards[i];
        const title = await card.innerText().catch(() => '');

        if (weightsMatch(targetWeight, extractWeightFromText(title))) {
            logger.success(`Match found in card text`);
            const priceMatches = title.match(/R\$\s*[\d.,]+/g) || [];
            if (priceMatches.length > 0) {
                const vals = priceMatches.map(p => normalizePrice(p)).filter(v => v > 0);
                // Assume lowest is subscription/best price
                return Math.min(...vals);
            }
        }
    }
    return 0;
}

// ========== MAIN ==========
(async () => {
    const product = "Areia Viva Verde";
    const weight = "4kg";

    console.log(`\n=== UNIFIED CRAWLER TEST: ${product} (${weight}) ===\n`);

    const browser = await chromium.launch({ headless: false }); // Try Headless FALSE again
    // Use headless: false for Cobasi if it blocks? Let's try true first.

    const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    });

    const results: Record<string, number> = {};

    try {
        const page = await context.newPage();

        // PETZ
        try {
            results['Petz'] = await runPetz(page, product, weight, new Logger('Petz'));
        } catch (e) { console.error("Petz Error:", e); }

        // PETLOVE
        try {
            results['Petlove'] = await runPetlove(page, product, weight, new Logger('Petlove'));
        } catch (e) { console.error("Petlove Error:", e); }

        // COBASI
        try {
            results['Cobasi'] = await runCobasi(page, product, weight, new Logger('Cobasi'));
        } catch (e) { console.error("Cobasi Error:", e); }

    } catch (e) {
        console.error("Global Error:", e);
    } finally {
        await browser.close();
    }

    console.log("\n=== FINAL RESULTS ===");
    console.table(results);

    // Output JSON for easy parsing if needed
    console.log(`JSON_RESULT:${JSON.stringify(results)}`);
})();
