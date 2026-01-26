
import { chromium, Browser, Page } from 'playwright';
import { processWithLocalLLM, selectBestMatch } from './ollama';
import dotenv from 'dotenv';
import path from 'path';

// ========== CONFIG ==========
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const CONFIG = {
    SCROLL_DISTANCE: 300,
    MAX_SCROLL_HEIGHT: 4000,
    SCROLL_DELAY: 150,
    PRICE_CACHE_HOURS: 0, // No cache
    CLICK_PRODUCT_DELAY: 1500,
    WEIGHT_SELECTOR_DELAY: 800,
};

// ========== STORE CONFIGURATIONS ==========
function simplifyQuery(term: string): string {
    const clean = term
        .replace(/[^\w\s\u00C0-\u00FF]/g, ' ')
        .replace(/\b\d+\s*x\b/gi, '')
        .replace(/\s+/g, ' ')
        .trim();
    return clean.split(' ').slice(0, 5).join(' ');
}

const STORES = {
    petz: (term: string) => `https://www.petz.com.br/busca?q=${encodeURIComponent(simplifyQuery(term))}`,
} as const;

const STORE_SELECTORS = {
    petz: {
        container: '.product-card-wrapper, .product-item, [class*="card-product"], li.li-product',
        title: 'a.card-link-product, .product-name, h3',
        price: 'a.card-link-product, .price, .new-price',
        link: 'a.card-link-product, a',
        image: 'img',
        weightSelector: 'select[name="weight"]',
        weightOptions: 'option',
        productPageWeightSelector: 'select.sku-selector, .product-variants select',
        productPageWeightOptions: 'option'
    }
};

// ========== UTILITIES ==========
function removeAccents(str: string): string {
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
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

function extractWeightFromText(text: string): string | null {
    const match = text.match(/(\d+(?:[\.,]\d+)?)\s?(kg|g|ml|l|mg)/i);
    return match ? match[0].toLowerCase().replace(/\s+/g, '') : null;
}

function normalizeWeight(weight: string): string {
    return removeAccents(weight.toLowerCase()).replace(/\s+/g, '').replace(',', '.');
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

class Logger {
    private context: string;
    constructor(context: string) { this.context = context; }
    info(msg: string) { console.log(`[${new Date().toISOString()}] [${this.context}] ℹ️  ${msg}`); }
    success(msg: string) { console.log(`[${new Date().toISOString()}] [${this.context}] ✅ ${msg}`); }
    warning(msg: string) { console.log(`[${new Date().toISOString()}] [${this.context}] ⚠️  ${msg}`); }
    error(msg: string, error?: any) { console.error(`[${new Date().toISOString()}] [${this.context}] ❌ ${msg}`, error || ''); }
}

// ========== CORE FUNCTIONS ==========
async function autoScroll(page: Page): Promise<void> {
    await page.evaluate(async (config) => {
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

async function trySelectWeightInProductPage(context: any, productUrl: string, targetWeight: string, selectors: any, logger: Logger): Promise<{ price: number; image: string } | null> {
    let newPage: Page | null = null;
    try {
        logger.info(`Deep Check: Navigating to ${productUrl}`);
        newPage = await context.newPage();
        if (!newPage) throw new Error("Failed to create page"); // Should not happen

        await newPage.goto(productUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await newPage.waitForTimeout(CONFIG.CLICK_PRODUCT_DELAY);

        const weightSelector = await newPage.$(selectors.productPageWeightSelector);
        if (weightSelector) {
            const options = await weightSelector.$$(selectors.productPageWeightOptions);
            for (const option of options) {
                const text = await option.textContent();
                const weight = extractWeightFromText(text || '') || text || '';
                if (weightsMatch(targetWeight, weight)) {
                    logger.success(`Selecting weight on page: ${text}`);
                    // Use selectOption if it's a select element, otherwise click
                    const tagName = await weightSelector.evaluate((el: any) => el.tagName.toLowerCase());
                    if (tagName === 'select') {
                        const val = await option.evaluate((el: any) => el.value);
                        await weightSelector.selectOption(val);
                    } else {
                        await option.click();
                    }
                    await newPage.waitForTimeout(CONFIG.WEIGHT_SELECTOR_DELAY);
                    break;
                }
            }
        } else {
            const wText = targetWeight.replace(/\s/g, '');
            const variants = [wText, wText.replace('kg', ' kg'), wText.replace('g', ' g')];
            for (const v of variants) {
                try {
                    const el = await newPage.$(`text="${v}"`);
                    if (el) {
                        await el.click();
                        await newPage.waitForTimeout(CONFIG.WEIGHT_SELECTOR_DELAY);
                        break;
                    }
                } catch (e) { }
            }
        }

        await newPage.waitForTimeout(1000);
        const priceText = await newPage.$eval(selectors.price + ', .price, [data-testid="product-price"], .sales-price', (el: any) => el.textContent).catch(() => null);
        const price = normalizePrice(priceText || '');
        const image = await newPage.$eval(selectors.image + ', .product-image img', (el: any) => el.src).catch(() => '');

        return { price, image };
    } catch (error) {
        logger.error('Failed deep check', error);
        return null;
    } finally {
        if (newPage) await newPage.close();
    }
}

// ========== MAIN LOGIC ==========
async function runScraper() {
    console.log("Starting raw playwright scraper...");
    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    });

    const targets = [
        { id: '3kg', nome: 'Ração Golden Fórmula Cães Adultos Raças Pequenas Carne e Arroz', weight: '3kg' },
        { id: '10kg', nome: 'Ração Golden Fórmula Cães Adultos Raças Pequenas Carne e Arroz 10kg', weight: '10kg' },
        { id: '15kg', nome: 'Ração Golden Fórmula Cães Adultos Raças Pequenas Carne e Arroz', weight: '15kg' }
    ];

    for (const product of targets) {
        const contextLogger = new Logger(`petz:${product.id}`);

        try {
            const page = await context.newPage();
            const url = STORES.petz(product.nome);
            contextLogger.info(`Searching: ${product.nome} at ${url}`);

            await page.goto(url, { waitUntil: 'load', timeout: 60000 });
            contextLogger.info('Page loaded, waiting for SPA...');

            await page.waitForTimeout(4000);
            await autoScroll(page);
            await page.waitForTimeout(2000);

            const selectors = STORE_SELECTORS.petz;
            const targetWeight = extractWeightFromText(product.weight); // Use explicit target weight
            const productCards = await page.$$(selectors.container);
            contextLogger.info(`Found ${productCards.length} product cards`);

            const candidates: any[] = [];

            for (let i = 0; i < Math.min(productCards.length, 12); i++) {
                try {
                    const card = productCards[i];
                    let title = '';
                    let price = 0;
                    let link = '';
                    let source = 'html';

                    // Strategy 1: Hidden JSON
                    try {
                        const jsonEl = await card.$('.jsonGa');
                        if (jsonEl) {
                            const jsonText = await jsonEl.textContent();
                            if (jsonText) {
                                try {
                                    const data = JSON.parse(jsonText);
                                    title = data.name;
                                    price = parseFloat(data.priceForSubs || data.promotional_price || data.price);
                                    source = 'json';
                                } catch (err) { }
                            }
                        }
                    } catch (e) { }

                    // Strategy 2: Attributes/Text
                    if (!title) {
                        try {
                            title = await card.$eval(selectors.title, (el: any) => el.textContent).catch(() => '') || '';
                            if (!title) title = await card.$eval(selectors.title, (el: any) => el.getAttribute('data-nomeproduto')).catch(() => '') || '';
                        } catch (e) { }
                    }

                    if (price === 0) {
                        try {
                            let priceText = await card.$eval(selectors.price, (el: any) => el.textContent).catch(() => '') || '';
                            if (!priceText) priceText = await card.$eval(selectors.price, (el: any) => el.getAttribute('data-precoproduto')).catch(() => '') || '';
                            price = normalizePrice(priceText);
                        } catch (e) { }
                    }

                    link = await card.$eval(selectors.link, (el: any) => el.href).catch(() => '');
                    title = title ? title.trim() : '';

                    if (title && link) {
                        candidates.push({
                            index: i,
                            nome: title,
                            preco: price,
                            link: normalizeUrl(link, url),
                            source: source
                        });
                    }
                } catch (e) { }
            }

            const finalCandidates = candidates;
            contextLogger.info(`Extracted ${finalCandidates.length} candidates`);

            if (finalCandidates.length > 0) {
                const bestIndex = await selectBestMatch(finalCandidates, product.nome);

                if (bestIndex !== -1) {
                    const candidate = finalCandidates[bestIndex];
                    contextLogger.success(`LLM selected: "${candidate.nome}" - R$ ${candidate.preco}`);

                    const cardWeight = extractWeightFromText(candidate.nome);
                    if (targetWeight && !weightsMatch(targetWeight, cardWeight)) {
                        contextLogger.info(`Weight mismatch (${targetWeight} vs ${cardWeight}), deep checking...`);
                        const deepData = await trySelectWeightInProductPage(context, candidate.link, targetWeight, selectors, contextLogger);
                        if (deepData) {
                            contextLogger.success(`FINAL PRICE: R$ ${deepData.price} (Image: ${deepData.image})`);
                        } else {
                            contextLogger.warning('Deep check returned no data.');
                        }
                    } else {
                        contextLogger.success(`FINAL PRICE: R$ ${candidate.preco}`);
                    }
                } else {
                    contextLogger.warning('LLM Match Failed');
                }
            }
            await page.close();

        } catch (e) {
            contextLogger.error("Scraper failed", e);
        }
    }
    await browser.close();
}

runScraper();
