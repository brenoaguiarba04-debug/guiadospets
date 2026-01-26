import { PlaywrightCrawler, Dataset } from 'crawlee';
import { selectBestMatch } from './ollama';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// ========== TYPES ==========
interface Product {
    id: string;
    nome: string;
}

interface ProcessedProduct {
    nome: string;
    preco: number;
    link: string;
    imagem: string;
    peso?: string;
}

interface Stats {
    total: number;
    success: number;
    failed: number;
    skipped: number;
    weightMismatch: number;
    byStore: Record<string, { success: number; failed: number }>;
    startTime: Date;
    endTime?: Date;
}

// ========== CONFIG ==========
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const CONFIG = {
    BATCH_SIZE: 10,
    MAX_CONCURRENT_STORES: 2,
    SCROLL_DISTANCE: 300,
    MAX_SCROLL_HEIGHT: 4000,
    SCROLL_DELAY: 150,
    PAGE_TIMEOUT: 2000,
    REQUEST_TIMEOUT: 180,
    MAX_RETRIES: 2,
    SHUTDOWN_DELAY: 60,
    PRICE_CACHE_HOURS: 6,
    CLICK_PRODUCT_DELAY: 1500,
    WEIGHT_SELECTOR_DELAY: 800,
};

// ========== SUPABASE CLIENT ==========
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ========== UTILITIES ==========
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
    cobasi: (term: string) => `https://www.cobasi.com.br/pesquisa?terms=${encodeURIComponent(simplifyQuery(term))}`,
    petlove: (term: string) => `https://www.petlove.com.br/busca?q=${encodeURIComponent(simplifyQuery(term))}`,
    mercadolivre: (term: string) => `https://lista.mercadolivre.com.br/${encodeURIComponent(term)}`,
    amazon: (term: string) => `https://www.amazon.com.br/s?k=${encodeURIComponent(term)}`
} as const;

const STORE_SELECTORS = {
    petz: {
        container: '.product-card-wrapper, .product-item, [class*="card-product"], li.li-product',
        title: 'a.card-link-product, .product-name, h3',
        price: '.price, .new-price, .p-card__price-retail',
        link: 'a.card-link-product, a',
        image: 'img',
        variantTrigger: '.p-card__variation-abreviation-item, .btn-weight',
        weightSelector: '.p-card__variation-abreviation-item',
        weightOptions: 'button',
        productPageWeightSelector: '.product-variation-list',
        productPageWeightOptions: 'button'
    },
    petlove: {
        container: '.product-card__content, [data-testid="product-card"], article',
        title: '[data-testid="product-name"], .product-name, h3',
        price: '[data-testid="product-price"], .product-price',
        link: 'a',
        image: 'img',
        variantTrigger: 'text="+opções", text="opções"',
        weightSelector: '.variant-selector',
        weightOptions: 'button',
        productPageWeightSelector: '[data-testid="product-weight-selector"]',
        productPageWeightOptions: 'button'
    },
    cobasi: {
        container: '[class*="ProductCard"], [class*="product-card"], article, [data-testid*="product"]',
        title: 'h2, h3, [class*="name"]',
        price: '[class*="price"], .valor',
        link: 'a',
        image: 'img',
        variantTrigger: 'button', // Placeholder
        weightSelector: '.weight-selector',
        weightOptions: 'button',
        productPageWeightSelector: '.weight-options',
        productPageWeightOptions: 'button'
    },
    mercadolivre: {
        container: '.ui-search-result__wrapper, .poly-card, li.ui-search-layout__item',
        title: '.ui-search-item__title, .poly-component__title, h2',
        price: '.price-tag-amount, .poly-price__current',
        link: 'a.ui-search-link, a.poly-component__title',
        image: 'img',
        variantTrigger: '',
        weightSelector: '',
        weightOptions: '',
        productPageWeightSelector: '',
        productPageWeightOptions: ''
    },
    amazon: {
        container: '[data-component-type="s-search-result"]',
        title: 'h2 span, .a-text-normal',
        price: '.a-price .a-offscreen',
        link: 'h2 a, a.a-link-normal',
        image: '.s-image',
        variantTrigger: '',
        weightSelector: '',
        weightOptions: '',
        productPageWeightSelector: '',
        productPageWeightOptions: ''
    }
} as const;

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

const stats: Stats = {
    total: 0,
    success: 0,
    failed: 0,
    skipped: 0,
    weightMismatch: 0,
    byStore: {},
    startTime: new Date()
};

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

function extractKeywords(productName: string): string[] {
    const ignoredWords = ['para', 'com', 'cao', 'caes', 'gato', 'gatos', 'adulto', 'adultos', 'areia', 'higienica', 'higiênica', 'filhote', 'filhotes', 'pet', 'pets', 'animal', 'animais', 'racao', 'ração'];
    return removeAccents(productName.toLowerCase()).split(/\s+/).filter(w => w.length > 2 && !w.match(/^\d+$/) && !ignoredWords.includes(w));
}

async function shouldSkipProduct(productId: string, store: string): Promise<boolean> {
    const cacheHours = CONFIG.PRICE_CACHE_HOURS;
    const cutoffTime = new Date(Date.now() - cacheHours * 60 * 60 * 1000).toISOString();
    const { data } = await supabase.from('precos').select('ultima_atualizacao').eq('produto_id', productId).eq('loja', store).gte('ultima_atualizacao', cutoffTime).single();
    return !!data;
}

async function logError(productId: string, store: string, error: string): Promise<void> {
    try {
        await supabase.from('scraper_errors').insert({ produto_id: productId, loja: store, erro: error, timestamp: new Date().toISOString() });
    } catch (err) { console.error('Failed to log error to database:', err); }
}

async function saveProductMatch(productId: string, store: string, match: ProcessedProduct, requestUrl: string): Promise<void> {
    const finalLink = normalizeUrl(match.link, requestUrl);
    await supabase.from('precos').insert({ produto_id: productId, preco: match.preco, loja: store, link_afiliado: finalLink, ultima_atualizacao: new Date().toISOString() });
    if (match.imagem && match.imagem.startsWith('http')) {
        await supabase.from('produtos').update({ imagem_url: match.imagem }).eq('id', productId);
    }
}

async function trySelectWeightInProductPage(page: any, productUrl: string, targetWeight: string, selectors: any, logger: Logger): Promise<{ price: number; image: string } | null> {
    try {
        logger.info(`Deep Check: Navigating to ${productUrl}`);
        const newPage = await page.context().newPage();
        await newPage.goto(productUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await newPage.waitForTimeout(CONFIG.CLICK_PRODUCT_DELAY);

        // Strategy A: Selectors
        const weightSelector = await newPage.$(selectors.productPageWeightSelector);
        if (weightSelector) {
            const options = await weightSelector.$$(selectors.productPageWeightOptions);
            for (const option of options) {
                const text = await option.textContent();
                const weight = extractWeightFromText(text || '') || text || '';
                if (weightsMatch(targetWeight, weight)) {
                    await option.click();
                    await newPage.waitForTimeout(CONFIG.WEIGHT_SELECTOR_DELAY);
                    break;
                }
            }
        } else {
            // Strategy B: Text match
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
        await newPage.close();
        return { price, image };
    } catch (error) {
        return null;
    }
}

async function createCrawler() {
    return new PlaywrightCrawler({
        headless: false,
        browserPoolOptions: { useFingerprints: true, fingerprintOptions: { fingerprintGeneratorOptions: { browsers: ['chrome'], devices: ['desktop'], locales: ['pt-BR'] } } },
        launchContext: {
            userDataDir: path.resolve(__dirname, 'browser_session'),
            launchOptions: { args: ['--disable-blink-features=AutomationControlled', '--disable-web-security', '--no-sandbox', '--disable-setuid-sandbox'] }
        },
        minConcurrency: 1,
        maxConcurrency: CONFIG.MAX_CONCURRENT_STORES,
        maxRequestRetries: CONFIG.MAX_RETRIES,
        requestHandlerTimeoutSecs: CONFIG.REQUEST_TIMEOUT,
        requestHandler: async ({ page, request, log }) => {
            const { store, targetName, productId } = request.userData;
            const contextLogger = new Logger(`${store}:${productId}`);
            try {
                // SKIP CACHE CHECK FOR TEST MODE
                // if (await shouldSkipProduct(productId, store)) { ... }

                contextLogger.info(`Searching: ${targetName}`);
                if (store === 'amazon' || store === 'mercadolivre') {
                    await page.waitForLoadState('domcontentloaded');
                } else {
                    await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => { });
                    await page.waitForTimeout(4000);
                }
                await autoScroll(page);
                await page.waitForTimeout(CONFIG.PAGE_TIMEOUT);

                const selectors = STORE_SELECTORS[store as keyof typeof STORE_SELECTORS];
                const targetWeight = extractWeightFromText(targetName);
                const targetKeywords = extractKeywords(targetName);
                const productCards = await page.$$(selectors.container);
                contextLogger.info(`Found ${productCards.length} product cards`);

                let bestMatch: ProcessedProduct | null = null;
                // ... (Truncated logic for brevity, assuming standard finder logic here)
                // Simplified matching for this test script to ensure validity without excessive lines

                if (store === 'amazon' || store === 'mercadolivre') {
                    for (let i = 0; i < Math.min(productCards.length, 8); i++) {
                        const card = productCards[i];
                        const title = await card.$eval(selectors.title, (el: any) => el.textContent?.trim()).catch(() => '');
                        if (!title) continue;
                        const titleKeywords = extractKeywords(title);
                        const keywordsMatched = targetKeywords.filter(k => titleKeywords.includes(k));
                        // Loose match for test
                        if (keywordsMatched.length < 1) continue;
                        const link = await card.$eval(selectors.link, (el: any) => el.href).catch(() => '');
                        if (!link) continue;
                        const fullLink = normalizeUrl(link, request.url);
                        const cardWeight = extractWeightFromText(title);
                        if (targetWeight && weightsMatch(targetWeight, cardWeight)) {
                            const priceText = await card.$eval(selectors.price, (el: any) => el.textContent).catch(() => '');
                            const price = normalizePrice(priceText);
                            if (price > 0) {
                                bestMatch = { nome: title, preco: price, link: fullLink, imagem: '', peso: targetWeight };
                                break;
                            }
                        }
                    }
                } else {
                    // LLM CANDIDATES COLLECTION
                    const candidates: any[] = [];
                    for (let i = 0; i < Math.min(productCards.length, 12); i++) {
                        try {
                            const card = productCards[i];
                            let title = await card.$eval(selectors.title, (el: any) => el.innerText).catch(() => '') || '';
                            let link = await card.$eval('a', (el: any) => el.href).catch(() => '') || '';
                            // Price extraction
                            let price = 0;
                            const params = await card.innerText();
                            const priceMatches = params.match(/R\$\s*[\d.,]+/g) || [];
                            if (priceMatches.length > 0) price = normalizePrice(priceMatches[0]);

                            if (title && link) {
                                candidates.push({ index: i, nome: title, preco: price, link: normalizeUrl(link, request.url) });
                            }
                        } catch (e) { }
                    }

                    if (candidates.length > 0) {
                        const bestIndex = await selectBestMatch(candidates, targetName);
                        if (bestIndex !== -1) {
                            const c = candidates[bestIndex];
                            bestMatch = { nome: c.nome, preco: c.preco, link: c.link, imagem: '', peso: targetWeight || undefined };
                        }
                    }
                }

                if (bestMatch) {
                    await saveProductMatch(productId, store, bestMatch, request.url);
                    contextLogger.success(`Match found: ${bestMatch.nome} - R$ ${bestMatch.preco}`);
                } else {
                    contextLogger.warning('No match');
                }

            } catch (error) {
                contextLogger.error('Error', error);
                await logError(productId, store, String(error));
            }
        }
    });
}

async function runFinderTest() {
    console.log('=== STARTING VOLUME TEST (LIMIT 3) ===');
    // Limit to 3 items
    const { data: products, error } = await supabase.from('produtos').select('id, nome').limit(3).order('nome');

    if (error || !products) {
        console.error('Database error', error);
        return;
    }

    console.log(`Testing with ${products.length} products:`);
    products.forEach(p => console.log(`- ${p.nome}`));

    const crawler = await createCrawler();
    const requests = products.flatMap(p =>
        Object.entries(STORES).map(([s, urlFn]) => ({
            url: urlFn(p.nome),
            userData: { store: s, targetName: p.nome, productId: p.id }
        }))
    );

    await crawler.addRequests(requests);
    await crawler.run();
    console.log('=== TEST COMPLETE ===');
}

runFinderTest();
