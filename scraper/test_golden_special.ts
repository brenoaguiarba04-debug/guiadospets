import { PlaywrightCrawler } from 'crawlee';
import { selectBestMatch } from './ollama';
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

async function runTest(store: 'petz' | 'petlove', product: string, targetWeight: string) {
    const logger = new Logger(store.toUpperCase());
    const crawler = new PlaywrightCrawler({
        headless: false,
        requestHandler: async ({ page }) => {
            logger.info(`Searching for: ${product} | Target Weight: ${targetWeight}`);
            await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => { });
            await page.waitForTimeout(4000);

            if (store === 'petz') {
                const card = (await page.$$('.product-card-wrapper, .product-item'))[0];
                if (card) {
                    const weightButtons = await card.$$('.p-card__variation-abreviation-item, .btn-weight');
                    for (const btn of weightButtons) {
                        const txt = await btn.innerText();
                        if (extractWeightFromText(txt) === targetWeight.toLowerCase()) {
                            logger.success(`Clicking ${txt} in Petz card...`);
                            await btn.click();
                            await page.waitForTimeout(2000);
                            break;
                        }
                    }
                    const finalPrice = normalizePrice((await card.innerText()).match(/R\$\s*[\d.,]+/g)?.[0]);
                    logger.success(`Final Petz Price: R$ ${finalPrice}`);
                }
            } else {
                const card = (await page.$$('.product-card__content, [data-testid="product-card"]'))[0];
                if (card) {
                    const trigger = await card.$('text="+opções", text="opções"');
                    if (trigger) {
                        await trigger.click();
                        await page.waitForTimeout(2500);
                        const secondTrigger = await page.$('text="Ver mais opções", text="+opções"');
                        if (secondTrigger) await secondTrigger.click();
                        await page.waitForTimeout(2500);

                        const options = await page.$$('span, p, button');
                        for (const opt of options) {
                            const txt = await opt.innerText();
                            if (extractWeightFromText(txt) === targetWeight.toLowerCase()) {
                                logger.success(`Selecting ${txt} in Petlove modal...`);
                                await opt.click();
                                await page.waitForTimeout(2000);
                                break;
                            }
                        }
                    }
                    const prices = (await page.innerText('body')).match(/R\$\s*[\d.,]+/g) || [];
                    const maxPrice = Math.max(...prices.map(p => normalizePrice(p)));
                    logger.success(`Final Petlove Price: R$ ${maxPrice}`);
                }
            }
        }
    });

    const url = store === 'petz'
        ? `https://www.petz.com.br/busca?q=${encodeURIComponent(product)}`
        : `https://www.petlove.com.br/busca?q=${encodeURIComponent(product)}`;

    await crawler.run([url]);
}

(async () => {
    const product = "Golden Special Cães Adultos Frango e Carne";
    const weight = "20kg"; // Standard for Golden Special
    await runTest('petlove', product, weight);
    await runTest('petz', product, weight);
})();
