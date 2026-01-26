import { chromium, Page } from 'playwright';
// import { selectBestMatch } from './ollama'; // Removed dependency for standalone test
import dotenv from 'dotenv';
import path from 'path';

// ========== CONFIG ==========
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

function normalizePrice(priceText: string | undefined): number {
    if (!priceText) return 0;
    const match = priceText.match(/[\d.,]+/);
    if (!match) return 0;
    return parseFloat(match[0].replace(/\./g, '').replace(',', '.'));
}

class Logger {
    private context: string;
    constructor(context: string) { this.context = context; }
    info(msg: string) { console.log(`[${new Date().toISOString()}] [${this.context}] ℹ️  ${msg}`); }
    success(msg: string) { console.log(`[${new Date().toISOString()}] [${this.context}] ✅ ${msg}`); }
    warning(msg: string) { console.log(`[${new Date().toISOString()}] [${this.context}] ⚠️  ${msg}`); }
    error(msg: string, error?: any) { console.error(`[${new Date().toISOString()}] [${this.context}] ❌ ${msg}`, error || ''); }
}

async function runScraper() {
    console.log("Starting raw playwright scraper for Petlove...");
    const browser = await chromium.launch({ headless: false }); // HEADLESS FALSE
    const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    });

    try {
        const page = await context.newPage();
        const contextLogger = new Logger('PetloveVivaVerde');
        const product = "Areia Viva Verde";
        const targetWeight = '4kg'; // Changed to 4kg for test as per product
        const url = `https://www.petlove.com.br/busca?q=${encodeURIComponent(product)}`;

        contextLogger.info(`Searching: ${product} at ${url}`);
        await page.goto(url, { waitUntil: 'load', timeout: 60000 });

        contextLogger.info('Waiting for networkidle...');
        await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => { });
        await page.waitForTimeout(4000);

        await page.screenshot({ path: 'debug_petlove_search.png', fullPage: true });

        const card = (await page.$$('.product-card__content, [data-testid="product-card"], article'))[0];
        if (!card) {
            contextLogger.error('No card found.');
            return;
        }

        const link = await card.$('a');
        if (!link) {
            contextLogger.error('No link found on card.');
            return;
        }

        const href = await link.getAttribute('href');
        const fullUrl = href?.startsWith('http') ? href : `https://www.petlove.com.br${href}`;
        contextLogger.info(`Navigating to product page: ${fullUrl}`);

        await page.goto(fullUrl!, { waitUntil: 'load', timeout: 60000 });
        await page.waitForTimeout(2000);

        // --- Details Page Logic ---
        contextLogger.info('Looking for weight options...');

        // Try to find buttons with weight text
        const wText = targetWeight.replace(/\s/g, '');
        const variants = [wText, wText.replace('kg', ' kg'), wText.replace('g', ' g')];

        let found = false;

        // Strategy 1: Look for buttons/labels with specific text
        for (const v of variants) {
            // Updated selector to match Petlove new layout
            const elements = await page.$$(`button:has-text("${v}"), label:has-text("${v}"), div:has-text("${v}"), span:has-text("${v}")`);
            for (const el of elements) {
                const text = await el.innerText();
                if (text.toLowerCase().includes(v)) {
                    contextLogger.info(`Clicking variant: ${text.replace(/\n/g, '')}`);
                    await el.click().catch(() => { });
                    await page.waitForTimeout(2000);
                    found = true;
                    break;
                }
            }
            if (found) break;
        }

        if (!found) {
            contextLogger.warning(`Exact weight variant '${targetWeight}' not found clickable. Checking text...`);
        }

        // Extract Price
        await page.waitForTimeout(1000);
        // Petlove specific price selectors
        const priceSelectors = ['.price-current', '[data-testid="price-current"]', '.product-price', 'h1', 'h2'];
        let price = 0;

        for (const sel of priceSelectors) {
            const el = await page.$(sel);
            if (el) {
                const txt = await el.innerText();
                const p = normalizePrice(txt);
                if (p > 5) {
                    price = p;
                    contextLogger.success(`Final Price Found: R$ ${price}`);
                    break;
                }
            }
        }

        if (price === 0) {
            contextLogger.error("Failed to extract price on product page.");
        }

        await page.screenshot({ path: 'debug_petlove_product.png' });

    } catch (e) {
        console.error("Scraper failed:", e);
    } finally {
        await browser.close();
    }
}

runScraper();
