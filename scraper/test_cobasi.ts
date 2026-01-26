import { chromium, Page } from 'playwright';
import { selectBestMatch } from './ollama';
import dotenv from 'dotenv';
import path from 'path';

// ========== CONFIG ==========
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const CONFIG = {
    SCROLL_DISTANCE: 300,
    MAX_SCROLL_HEIGHT: 4000,
    SCROLL_DELAY: 150,
};

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

function normalizeUrl(link: string, baseUrl: string): string {
    if (!link) return baseUrl;
    if (link.startsWith('http')) return link;
    const parsedUrl = new URL(baseUrl);
    return parsedUrl.origin + (link.startsWith('/') ? '' : '/') + link;
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
    await page.evaluate(async (config) => {
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
            }, 150);
        });
    }, CONFIG);
}

async function runScraper() {
    console.log("Starting raw playwright scraper for Cobasi...");
    const browser = await chromium.launch({ headless: false }); // HEADLESS FALSE for debugging
    const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    });

    try {
        const page = await context.newPage();
        const contextLogger = new Logger('Cobasi');
        const product = "Areia Viva Verde Grãos Finos 4kg";
        // Try a simpler query first to ensure we get results
        const url = `https://www.cobasi.com.br/pesquisa?terms=${encodeURIComponent("Areia Viva Verde")}`;

        contextLogger.info(`Searching: ${product} at ${url}`);

        await page.goto(url, { waitUntil: 'load', timeout: 60000 });
        await page.waitForTimeout(4000);
        await autoScroll(page);

        await page.screenshot({ path: 'debug_cobasi.png', fullPage: true });
        contextLogger.info('Screenshot saved to debug_cobasi.png');

        // Cobasi selectors
        const containerSelector = '[class*="ProductCard"], [class*="product-card"], article, [data-testid*="product"]';
        const cards = await page.$$(containerSelector);
        contextLogger.info(`Found ${cards.length} cards`);

        if (cards.length > 0) {
            const firstHtml = await cards[0].innerHTML();
            contextLogger.info(`[DEBUG] First Card HTML: ${firstHtml.slice(0, 1000)}`); // Reduced log size
            const firstText = await cards[0].innerText();
            contextLogger.info(`[DEBUG] First Card Text: ${firstText.replace(/\n/g, ' ')}`);
        }

        const candidates: any[] = [];
        for (let i = 0; i < Math.min(cards.length, 12); i++) {
            try {
                const card = cards[i];

                contextLogger.info(`--- Card ${i} Debug ---`);

                // Title Debug
                let title = await card.$eval('img', (el: any) => el.getAttribute('alt')).catch(() => '') || '';
                contextLogger.info(`Strategy 1 (Img Alt) Title: "${title}"`);

                if (!title) {
                    title = await card.$eval('h2, h3, [class*="name"]', (el: any) => el.innerText).catch(() => '') || '';
                    contextLogger.info(`Strategy 2 (Header) Title: "${title}"`);
                }

                if (!title) {
                    title = await card.innerText().catch(() => '') || '';
                    contextLogger.info(`Strategy 3 (Full Text Fallback): "${title.slice(0, 50)}..."`);
                }

                // Price Debug
                const cardText = await card.innerText();
                const priceMatches = cardText.match(/R\$\s*[\d.,]+/g) || [];
                contextLogger.info(`Price Matches found: ${priceMatches.join(', ')}`);

                let bestPrice = 0;
                if (priceMatches.length > 0) {
                    const vals = priceMatches.map(p => normalizePrice(p)).filter(v => v > 0);
                    const hasSubLure = /assinante|assinatura|amigo/i.test(cardText);
                    if (hasSubLure && vals.length >= 2) {
                        bestPrice = Math.max(...vals);
                    } else {
                        bestPrice = Math.min(...vals);
                    }
                }
                contextLogger.info(`Best Price Calculated: ${bestPrice}`);

                // Link Debug
                let link = await card.$eval('a', (el: any) => el.href).catch(() => '') || '';
                if (!link) {
                    link = await card.evaluate((el: any) => el.closest('a')?.href).catch(() => '') || '';
                }
                contextLogger.info(`Link Found: "${link}"`);

                if (title && bestPrice > 0) { // Removed link check for now to see if we can at least get title/price
                    candidates.push({
                        index: i,
                        nome: title.trim(),
                        preco: bestPrice,
                        link: normalizeUrl(link, url)
                    });
                    contextLogger.success(`Candidate VALID.`);
                } else {
                    contextLogger.warning(`Candidate INVALID (Missing: ${!title ? 'Title' : ''} ${!bestPrice ? 'Price' : ''})`);
                }
            } catch (e) {
                contextLogger.error(`Card ${i} Error:`, e);
            }
        }

        // Helper for matching
        function weightsMatch(weight1: string | null, weight2: string | null): boolean {
            if (!weight1 || !weight2) return false;
            const w1 = weight1.toLowerCase().replace(/\s+/g, '').replace(',', '.');
            const w2 = weight2.toLowerCase().replace(/\s+/g, '').replace(',', '.');
            if (w1 === w2) return true;

            // Fuzzy float match
            const num1 = parseFloat(w1.match(/[\d.]+/)?.[0] || '0');
            const unit1 = w1.match(/[a-z]+/)?.[0] || '';
            const num2 = parseFloat(w2.match(/[\d.]+/)?.[0] || '0');
            const unit2 = w2.match(/[a-z]+/)?.[0] || '';

            if (unit1 !== unit2) return false;
            return Math.abs(num1 - num2) < 0.01;
        }

        function extractWeightFromText(text: string): string | null {
            const match = text.match(/(\d+(?:[\.,]\d+)?)\s?(kg|g|ml|l|mg)/i);
            return match ? match[0].toLowerCase().replace(/\s+/g, '') : null;
        }

        if (candidates.length > 0) {
            contextLogger.info(`Comparing ${candidates.length} candidates with target: "${product}"`);

            // Deterministic Match
            const targetW = extractWeightFromText(product);
            const match = candidates.find(c => {
                const w = extractWeightFromText(c.nome);
                return weightsMatch(targetW, w);
            });

            if (match) {
                contextLogger.success(`Winner (Deterministic): ${match.nome} - R$ ${match.preco}`);
            } else {
                contextLogger.warning('No deterministic match found. Checking fuzzy...');
                // Fallback: just return the first one that has "Viva Verde"
                const fuzzy = candidates.find(c => c.nome.toLowerCase().includes("viva verde") && c.nome.toLowerCase().includes("finos"));
                if (fuzzy) {
                    contextLogger.success(`Winner (Fuzzy): ${fuzzy.nome} - R$ ${fuzzy.preco}`);
                } else {
                    contextLogger.warning('No suitable match found.');
                }
            }
        } else {
            contextLogger.warning('No candidates extracted');
        }

    } catch (e) {
        console.error("Scraper failed:", e);
    } finally {
        await browser.close();
    }
}

runScraper();
