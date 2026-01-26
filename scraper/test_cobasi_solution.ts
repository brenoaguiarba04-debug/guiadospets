
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
    return clean.split(' ').slice(0, 5).join(' '); // Keep comparable to successful test
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

// Helper for matching
function weightsMatch(weight1: string | null, weight2: string | null): boolean {
    if (!weight1 || !weight2) return false;
    const w1 = weight1.toLowerCase().replace(/\s+/g, '').replace(',', '.');
    const w2 = weight2.toLowerCase().replace(/\s+/g, '').replace(',', '.');
    if (w1 === w2) return true;

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

async function runScraper() {
    console.log("Starting Cobasi scraper (Golden Config)...");
    const browser = await chromium.launch({ headless: false }); // GOLDEN CONFIG
    const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    });

    const targets = [
        { id: '3kg', nome: 'Ração Golden Fórmula Cães Adultos Raças Pequenas Carne e Arroz', weight: '3kg' },
        { id: '10kg', nome: 'Ração Golden Fórmula Cães Adultos Raças Pequenas Carne e Arroz 10kg', weight: '10kg' },
        { id: '15kg', nome: 'Ração Golden Fórmula Cães Adultos Raças Pequenas Carne e Arroz', weight: '15kg' }
    ];

    for (const product of targets) {
        const page = await context.newPage();
        const contextLogger = new Logger(`Cobasi:${product.weight}`);

        try {
            const url = `https://www.cobasi.com.br/pesquisa?terms=${encodeURIComponent(simplifyQuery(product.nome))}`;
            contextLogger.info(`Searching: ${product.nome} at ${url}`);

            await page.goto(url, { waitUntil: 'load', timeout: 60000 }); // Strict load wait
            await page.waitForTimeout(4000);
            await autoScroll(page);

            const containerSelector = '[class*="ProductCard"], [class*="product-card"], article, [data-testid*="product"]';
            const cards = await page.$$(containerSelector);
            contextLogger.info(`Found ${cards.length} cards`);

            const candidates: any[] = [];
            for (let i = 0; i < Math.min(cards.length, 12); i++) {
                try {
                    const card = cards[i];
                    let title = await card.$eval('img', (el: any) => el.getAttribute('alt')).catch(() => '') || '';
                    if (!title) title = await card.innerText().catch(() => '') || '';

                    const cardText = await card.innerText();
                    const priceMatches = cardText.match(/R\$\s*[\d.,]+/g) || [];
                    let bestPrice = 0;
                    if (priceMatches.length > 0) {
                        const vals = priceMatches.map(p => normalizePrice(p)).filter(v => v > 0);
                        bestPrice = Math.min(...vals); // Retail price usually, ignore club for now to simplify
                    }

                    let link = await card.$eval('a', (el: any) => el.href).catch(() => '') || '';
                    if (!link) link = await card.evaluate((el: any) => el.closest('a')?.href).catch(() => '') || '';

                    if (bestPrice > 0) {
                        candidates.push({
                            index: i,
                            nome: title.trim(),
                            preco: bestPrice,
                            link: normalizeUrl(link, url)
                        });
                    }
                } catch (e) { }
            }

            if (candidates.length > 0) {
                // Match Logic
                const match = candidates.find(c => {
                    const w = extractWeightFromText(c.nome);
                    return weightsMatch(product.weight, w);
                });

                if (match) {
                    contextLogger.success(`Winner: ${match.nome} - R$ ${match.preco}`);
                } else {
                    contextLogger.warning('No weight match found among candidates.');
                    // Fallback to LLM if needed, but for verification print candidates
                    console.log("Candidates:", candidates.map(c => c.nome));
                }
            } else {
                contextLogger.warning('No candidates found.');
            }

        } catch (e) {
            contextLogger.error("Error", e);
        } finally {
            await page.close();
        }
    }

    await browser.close();
}

runScraper();
