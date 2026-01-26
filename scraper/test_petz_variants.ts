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

function normalizeWeight(weight: string): string {
    return weight.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '').replace(',', '.');
}

function weightsMatch(weight1: string | null, weight2: string | null): boolean {
    if (!weight1 || !weight2) return false;
    return normalizeWeight(weight1) === normalizeWeight(weight2);
}

function normalizeUrl(link: string, baseUrl: string): string {
    if (!link) return baseUrl;
    if (link.startsWith('http')) return link;
    const parsedUrl = new URL(baseUrl);
    return parsedUrl.origin + (link.startsWith('/') ? '' : '/') + link;
}

function extractWeightFromText(text: string): string | null {
    const match = text.match(/(\d+(?:[\.,]\d+)?)\s?(kg|g|ml|l|mg)/i);
    return match ? match[0].toLowerCase().replace(/\s+/g, '') : null;
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

// ========== MAIN CRAWLER ==========
async function createCrawler() {
    return new PlaywrightCrawler({
        headless: false,
        requestHandler: async ({ page, request }) => {
            const contextLogger = new Logger('PetzVariants');
            const targetName = request.userData.targetName;
            const targetWeight = request.userData.targetWeight;

            contextLogger.info(`Searching: ${targetName} | Target: ${targetWeight}`);
            await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => { });
            await page.waitForTimeout(4000);
            await autoScroll(page);

            const cards = await page.$$('.product-card-wrapper, .product-item, [class*="card-product"]');
            contextLogger.info(`Found ${cards.length} cards`);

            const candidates = [];
            for (let i = 0; i < Math.min(cards.length, 5); i++) {
                try {
                    const card = cards[i];

                    // 1. Log BEFORE Price
                    const textBefore = await card.innerText();
                    const pricesBefore = (textBefore.match(/R\$\s*[\d.,]+/g) || []);
                    contextLogger.info(`Card ${i} Visual Price BEFORE: ${pricesBefore.join(', ')}`);

                    // 2. Click Variant
                    const weightButtons = await card.$$('.p-card__variation-abreviation-item, .weight-item, button');
                    if (targetWeight && weightButtons.length > 0) {
                        for (const btn of weightButtons) {
                            const btnText = await btn.innerText();
                            const btnWeight = extractWeightFromText(btnText);

                            if (weightsMatch(targetWeight, btnWeight)) {
                                contextLogger.info(`Found variant [${btnText}]. Clicking via JS...`);
                                await btn.evaluate(node => {
                                    (node as HTMLElement).click();
                                    node.dispatchEvent(new Event('change', { bubbles: true }));
                                });
                                break;
                            }
                        }
                    }

                    // 3. Wait and Log AFTER Price
                    await page.waitForTimeout(3000); // 3s for update
                    const textAfter = await card.innerText();
                    const pricesAfter = (textAfter.match(/R\$\s*[\d.,]+/g) || []);
                    contextLogger.info(`Card ${i} Visual Price AFTER:  ${pricesAfter.join(', ')}`);

                    if (pricesBefore[0] !== pricesAfter[0]) {
                        contextLogger.success(`PRICE UPDATED! Change: ${pricesBefore[0]} -> ${pricesAfter[0]}`);
                    } else {
                        contextLogger.warning(`Price stayed at ${pricesBefore[0]}. Maybe in-card selection is passive for this UI element.`);
                    }

                    // Check JSON too
                    const jsonEl = await card.$('.jsonGa');
                    if (jsonEl) {
                        const data = JSON.parse(await jsonEl.textContent() || '{}');
                        contextLogger.info(`Card ${i} JSON Price: R$ ${data.price}`);
                    }

                    const link = await card.$eval('a', (el: any) => el.href).catch(() => '');
                    if (pricesAfter.length > 0) {
                        candidates.push({ nome: targetName, preco: normalizePrice(pricesAfter[0]), link: normalizeUrl(link, request.url) });
                    }
                } catch (e) { }
            }
        }
    });
}

(async () => {
    const crawler = await createCrawler();
    const productBase = "Fórmula Natural Fresh Meat Sensitive Cão Adulto Mini";
    await crawler.run([{
        url: `https://www.petz.com.br/busca?q=${encodeURIComponent(productBase)}`,
        userData: { targetName: productBase, targetWeight: '10,1 kg' }
    }]);
})();
