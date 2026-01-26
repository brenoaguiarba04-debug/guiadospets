import { PlaywrightCrawler } from 'crawlee';
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
    CLICK_PRODUCT_DELAY: 1500,
    WEIGHT_SELECTOR_DELAY: 800,
};

// ========== UTILITIES ==========
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

function removeAccents(str: string): string {
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

class Logger {
    private context: string;
    constructor(context: string) { this.context = context; }
    info(msg: string) { console.log(`[${new Date().toISOString()}] [${this.context}] ℹ️  ${msg}`); }
    success(msg: string) { console.log(`[${new Date().toISOString()}] [${this.context}] ✅ ${msg}`); }
    warning(msg: string) { console.log(`[${new Date().toISOString()}] [${this.context}] ⚠️  ${msg}`); }
    error(msg: string, error?: any) { console.error(`[${new Date().toISOString()}] [${this.context}] ❌ ${msg}`, error || ''); }
}

async function autoScroll(page: any): Promise<void> {
    await page.evaluate(async (config: typeof CONFIG) => {
        await new Promise<void>((resolve) => {
            let totalHeight = 0;
            const timer = setInterval(() => {
                const scrollHeight = document.body.scrollHeight;
                window.scrollBy(0, config.SCROLL_DISTANCE);
                totalHeight += config.SCROLL_DISTANCE;
                if (totalHeight >= scrollHeight || totalHeight >= config.MAX_SCROLL_HEIGHT) {
                    clearInterval(timer);
                    resolve();
                }
            }, config.SCROLL_DELAY);
        });
    }, CONFIG);
}

// ========== PETLOVE LOGIC ==========
const PETLOVE = {
    url: (term: string) => `https://www.petlove.com.br/busca?q=${encodeURIComponent(simplifyQuery(term))}`,
    selectors: {
        container: '.product-card__content, [data-testid="product-card"], article',
        title: '[data-testid="product-name"], h2, h3, .product-name',
        price: '[data-testid="product-price"], .price, [class*="product-price"]',
        link: 'a',
        image: 'img'
    }
};

async function createCrawler() {
    return new PlaywrightCrawler({
        headless: false,
        requestHandler: async ({ page, request }) => {
            const contextLogger = new Logger('Petlove');
            const targetName = request.userData.targetName;

            contextLogger.info(`Searching: ${targetName}`);
            await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => { });
            await page.waitForTimeout(3000);
            await autoScroll(page);

            const cards = await page.$$(PETLOVE.selectors.container);
            contextLogger.info(`Found ${cards.length} cards`);

            const candidates = [];
            for (let i = 0; i < Math.min(cards.length, 12); i++) {
                try {
                    const card = cards[i];

                    // Strategy 1: Title from Image Alt
                    let title = await card.$eval('img', (el: any) => el.getAttribute('alt')).catch(() => '') || '';
                    if (!title) title = await card.$eval('h2, h3, [class*="name"]', (el: any) => el.innerText).catch(() => '') || '';

                    // Strategy 2: Price - FIND RETAIL PRICE (Ignore "Clube/Assinante")
                    const cardText = await card.innerText();
                    const priceMatches = cardText.match(/R\$\s*[\d.,]+/g) || [];
                    let bestPrice = 0;

                    if (priceMatches.length > 0) {
                        const parsedValues = priceMatches.map(p => normalizePrice(p)).filter(v => v > 0);

                        // Rule: If there are multiple prices and "Clube" or "Assinante" is mentioned...
                        const hasSubscriberLure = /clube|assinante|assinatura/i.test(cardText);

                        if (hasSubscriberLure && parsedValues.length >= 2) {
                            // In Petlove, the Retail price is usually the first one (top) or the second one if the first is "De" (strikethrough).
                            // But usually, Subscriber price is the ABSOLUTE MINIMUM.
                            // So if we pick the HIGHER of the two, we get the retail price.
                            // If there are 3 (De 100 Por 80 Clube 72), we want 80.

                            // Let's filter out the absolute minimum if keywords favor it.
                            const sorted = [...new Set(parsedValues)].sort((a, b) => b - a); // Higher first

                            if (sorted.length >= 2) {
                                // We take the 2nd one if there's a "De" (Original price). 
                                // How to know if there's a "De"? Look for the text "De".
                                const hasOriginalPrice = /De\s*R\$/i.test(cardText);
                                if (hasOriginalPrice) {
                                    bestPrice = sorted[1]; // The "Por" (Promo) price
                                } else {
                                    bestPrice = sorted[0]; // The "Preço Normal" vs "Clube"
                                }
                            } else {
                                bestPrice = sorted[0];
                            }
                        } else {
                            // Just pick the lowest if no subscriber lure (regular promotion)
                            bestPrice = Math.min(...parsedValues);
                        }
                    }

                    // Strategy 3: Link
                    let link = await card.$eval('a', (el: any) => el.href).catch(() => '') || '';
                    if (!link) {
                        link = await card.getAttribute('href').catch(() => '') || '';
                    }
                    if (!link) {
                        link = await card.evaluate((el: any) => el.closest('a')?.href).catch(() => '') || '';
                    }

                    if (title && link && bestPrice > 0) {
                        contextLogger.success(`[DEBUG] Candidate ${i}: "${title}" - R$ ${bestPrice} (Excluded sub price)`);
                        candidates.push({
                            index: i,
                            nome: title.trim(),
                            preco: bestPrice,
                            link: normalizeUrl(link, request.url)
                        });
                    }
                } catch (e: any) {
                    contextLogger.error(`Card ${i} error`, e.message);
                }
            }

            if (candidates.length > 0) {
                contextLogger.info(`Candidates found: ${candidates.length}`);
                const bestIndex = await selectBestMatch(candidates, targetName);
                if (bestIndex !== -1) {
                    const winner = candidates[bestIndex];
                    contextLogger.success(`Winner: ${winner.nome} - R$ ${winner.preco}`);
                } else {
                    contextLogger.warning('No LLM match');
                }
            } else {
                contextLogger.warning('No candidates extracted from cards.');
            }
        }
    });
}

(async () => {
    const crawler = await createCrawler();
    const product = "Areia Viva Verde Grãos Finos 4kg";
    await crawler.run([{
        url: PETLOVE.url(product),
        userData: { targetName: product }
    }]);
})();
