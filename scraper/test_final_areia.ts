
import { chromium, Page } from 'playwright';
import { selectBestMatch } from './ollama';
import dotenv from 'dotenv';
import path from 'path';

// ========== CONFIG ==========
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const CONFIG = {
    SCROLL_DISTANCE: 400,
    MAX_SCROLL_HEIGHT: 5000,
    SCROLL_DELAY: 200,
};

function simplifyQuery(product: { nome: string, weight: string }): string {
    return `Viva Verde`;
}

function normalizePrice(priceText: string | undefined): number {
    if (!priceText) return 0;
    const match = priceText.match(/[\d.,]+/);
    if (!match) return 0;
    return parseFloat(match[0].replace(/\./g, '').replace(',', '.'));
}

function pickRetailPrice(prices: number[], htmlContext: string): number {
    if (prices.length === 0) return 0;
    if (prices.length === 1) return prices[0];
    const hasSubscription = /assinante|assinatura|programada|clube|socio|vip|prime|fidelidade/i.test(htmlContext);
    if (hasSubscription) return Math.max(...prices);
    return Math.min(...prices);
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
    if (unit1 === unit2 && Math.abs(num1 - num2) <= 0.2) return true;
    if (unit1 !== unit2 && Math.abs(grams1 - grams2) < 50) return true;
    return false;
}

function extractWeightFromText(text: string): string | null {
    const match = text.match(/(\d+(?:[\.,]\d+)?)\s?(kg|g|ml|l|mg)/i);
    return match ? match[0].toLowerCase().replace(/\s+/g, '') : null;
}

class Logger {
    private context: string;
    constructor(context: string) { this.context = context; }
    info(msg: string) { console.log(`[${this.context}] ℹ️  ${msg}`); }
    success(msg: string) { console.log(`[${this.context}] ✅ ${msg}`); }
    warning(msg: string) { console.log(`[${this.context}] ⚠️  ${msg}`); }
    error(msg: string, error?: any) { console.error(`[${this.context}] ❌ ${msg}`, error || ''); }
}

async function autoScroll(page: Page) {
    await page.evaluate(async (config) => {
        await new Promise<void>((resolve) => {
            let totalHeight = 0;
            const distance = config.SCROLL_DISTANCE;
            const timer = setInterval(() => {
                const scrollHeight = document.body.scrollHeight;
                window.scrollBy(0, distance);
                totalHeight += distance;
                if (totalHeight >= scrollHeight || totalHeight >= config.MAX_SCROLL_HEIGHT) {
                    clearInterval(timer);
                    resolve();
                }
            }, config.SCROLL_DELAY);
        });
    }, CONFIG);
}

async function scrapeGeneric(page: Page, storeName: string, searchUrlFn: (q: string) => string, product: { nome: string, weight: string }): Promise<string> {
    const logger = new Logger(`${storeName}`);
    const query = simplifyQuery(product);
    const url = searchUrlFn(query);

    try {
        logger.info(`Navigating to ${url}`);
        await page.goto(url, { waitUntil: 'load', timeout: 60000 });
        await page.waitForTimeout(4000);
        await autoScroll(page);

        let containerSelector = '';
        if (storeName === 'Petz') containerSelector = '.product-card-wrapper, .product-item, [class*="card-product"]';
        else if (storeName === 'Cobasi') containerSelector = '[class*="ProductCard"], article, [data-testid*="product"]';
        else if (storeName === 'Petlove') containerSelector = '.product-card__content, article';

        const cards = await page.$$(containerSelector);
        logger.info(`Found ${cards.length} cards`);

        const candidates: any[] = [];

        for (const card of cards) {
            const cardText = await card.innerText();
            if (cardText.toLowerCase().includes('viva verde')) {
                // EXPLICIT SEARCH FOR THE 10KG BUTTON
                const variantButtons = await card.$$('button, span, div, label');
                for (const btn of variantButtons) {
                    const btnText = await btn.innerText().catch(() => '');
                    if (btnText.includes('10 kg') || btnText.includes('10kg')) {
                        logger.info(`Found 10kg button on card! Clicking...`);
                        await btn.click({ force: true }).catch(() => { });
                        await page.waitForTimeout(3000);
                        const updatedText = await card.innerText();
                        const pMatches = updatedText.match(/R\$\s*[\d.,]+/g) || [];
                        const pFinal = pickRetailPrice(pMatches.map(p => normalizePrice(p)).filter(v => v > 50), updatedText);
                        if (pFinal > 50) return `R$ ${pFinal.toFixed(2)} (Button Clicked)`;
                    }
                }
            }

            let title = await card.innerText().then(t => t.split('\n')[0]).catch(() => '') || '';
            const link = await card.$eval('a', (el: any) => el.href).catch(() => '') || '';
            const priceMatches = cardText.match(/R\$\s*[\d.,]+/g) || [];
            let price = 0;
            if (priceMatches.length > 0) {
                const vals = priceMatches.map(p => normalizePrice(p)).filter(v => v > 10);
                price = pickRetailPrice(vals, cardText);
            }
            candidates.push({ title, price, link });
        }

        if (candidates.length > 0) {
            // PETZ PDP Fallback pattern
            const bestIndex = await selectBestMatch(candidates, `${product.nome} ${product.weight}`);
            if (bestIndex !== -1) {
                const winner = candidates[bestIndex];

                // If it's Petz, always try PDP because search results are tricky for variants
                if (storeName === 'Petz' || winner.price === 0) {
                    logger.info(`Visiting PDP (Verified Fallback): ${winner.link}`);
                    await page.goto(winner.link, { waitUntil: 'load', timeout: 60000 });
                    await page.waitForTimeout(5000);

                    const pdpOptions = await page.$$('button, span, div, label, [class*="variant"], li, a');
                    for (const opt of pdpOptions) {
                        const txt = await opt.innerText().catch(() => '');
                        const ow = extractWeightFromText(txt);
                        logger.info(`Checking PDP option: "${txt}" (Extracted: ${ow})`);
                        if (ow && weightsMatch(product.weight, ow)) {
                            logger.info(`SUCCESS: Clicking 10kg variant on PDP!`);
                            await opt.click({ force: true }).catch(() => { });
                            await page.waitForTimeout(5000); // Wait for price update
                            break;
                        }
                    }

                    const bodyText = await page.innerText('body');
                    const priceMatchesPDP = bodyText.match(/R\$\s*[\d.,]+/g) || [];
                    const finalPrice = pickRetailPrice(priceMatchesPDP.map(p => normalizePrice(p)).filter(v => v > 10), bodyText);
                    if (finalPrice > 10) return `R$ ${finalPrice.toFixed(2)}`;
                }

                if (winner.price > 10) return `R$ ${winner.price.toFixed(2)}`;
            }
        }

    } catch (e) {
        logger.error("Error", e);
        return "Erro exceção";
    }

    return "Não encontrado";
}

async function runTest() {
    console.log("=== FINAL VERIFICATION: AREIA VIVA VERDE 10KG ===");
    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    });

    const product = { nome: 'Areia Viva Verde', weight: '10kg' };

    const stores = [
        { name: 'Petz', urlFn: (q: string) => `https://www.petz.com.br/busca?q=${encodeURIComponent(q)}` },
        { name: 'Cobasi', urlFn: (q: string) => `https://www.cobasi.com.br/pesquisa?terms=${encodeURIComponent(q)}` },
        { name: 'Petlove', urlFn: (q: string) => `https://www.petlove.com.br/busca?q=${encodeURIComponent(q)}` }
    ];

    const results: any[] = [];

    for (const store of stores) {
        const page = await context.newPage();
        const result = await scrapeGeneric(page, store.name, store.urlFn, product);
        results.push({ Loja: store.name, Preço: result });
        await page.close();
    }

    await browser.close();
    console.table(results);
}

runTest();
