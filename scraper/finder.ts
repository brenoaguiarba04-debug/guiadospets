import { PlaywrightCrawler, Dataset } from 'crawlee';
import { processWithLocalLLM, selectBestMatch } from './ollama';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { exec } from 'child_process';
import pLimit from 'p-limit';

// ========== TYPES ==========
interface Product {
    id: string;
    nome: string;
}

interface CrawledProduct {
    title: string;
    priceText: string;
    link: string;
    image: string;
    availableWeights?: string[];
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

// ========== STORE CONFIGURATIONS ==========
// ========== UTILITIES ==========
function simplifyQuery(term: string): string {
    // Strategy: Clean special chars, keep first 5 significant words
    // Filters out "3 x", "2 un" roughly by taking core words.
    const clean = term
        .replace(/[^\w\s\u00C0-\u00FF]/g, ' ') // Remove non-word chars (keep accents)
        .replace(/\b\d+\s*x\b/gi, '') // Remove "3 x" pattern
        .replace(/\s+/g, ' ')
        .trim();

    // Take first 5 words - usually Brand + Line + Animal + Type
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
        variantTrigger: '.p-card__variation-abreviation-item, .btn-weight'
    },
    petlove: {
        container: '.product-card__content, [data-testid="product-card"], article',
        title: '[data-testid="product-name"], .product-name, h3',
        price: '[data-testid="product-price"], .product-price',
        link: 'a',
        image: 'img',
        variantTrigger: 'text="+opções", text="opções"'
    },
    cobasi: {
        container: '[class*="ProductCard"], [class*="product-card"], article, [data-testid*="product"]',
        title: 'h2, h3, [class*="name"]',
        price: '[class*="price"], .valor',
        link: 'a',
        image: 'img'
    },
    mercadolivre: {
        container: '.ui-search-result__wrapper, .poly-card, li.ui-search-layout__item',
        title: '.ui-search-item__title, .poly-component__title, h2',
        price: '.price-tag-amount, .poly-price__current',
        link: 'a.ui-search-link, a.poly-component__title',
        image: 'img'
    },
    amazon: {
        container: '[data-component-type="s-search-result"]',
        title: 'h2 span, .a-text-normal',
        price: '.a-price .a-offscreen',
        link: 'h2 a, a.a-link-normal',
        image: '.s-image'
    }
} as const;

// ========== UTILITIES ==========
function removeAccents(str: string): string {
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

class Logger {
    private context: string;

    constructor(context: string) {
        this.context = context;
    }

    info(msg: string) {
        console.log(`[${new Date().toISOString()}] [${this.context}] ℹ️  ${msg}`);
    }

    success(msg: string) {
        console.log(`[${new Date().toISOString()}] [${this.context}] ✅ ${msg}`);
    }

    warning(msg: string) {
        console.log(`[${new Date().toISOString()}] [${this.context}] ⚠️  ${msg}`);
    }

    error(msg: string, error?: any) {
        console.error(`[${new Date().toISOString()}] [${this.context}] ❌ ${msg}`, error || '');
    }
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

// ========== CORE FUNCTIONS ==========
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
    // Tenta pegar kg, g, ml, l, mg
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

    const conversions: Record<string, number> = {
        'kg': 1000, 'g': 1, 'mg': 0.001,
        'l': 1000, 'ml': 1
    };

    const grams1 = num1 * (conversions[unit1] || 1);
    const grams2 = num2 * (conversions[unit2] || 1);

    // Margem de erro pequena
    return Math.abs(grams1 - grams2) < 0.01;
}

function extractKeywords(productName: string): string[] {
    const ignoredWords = [
        'para', 'com', 'cao', 'caes', 'gato', 'gatos',
        'adulto', 'adultos', 'areia', 'higienica', 'higiênica',
        'filhote', 'filhotes', 'pet', 'pets', 'animal', 'animais',
        'racao', 'ração'
    ];

    return removeAccents(productName.toLowerCase())
        .split(/\s+/)
        .filter(w => w.length > 2 && !w.match(/^\d+$/) && !ignoredWords.includes(w));
}

async function shouldSkipProduct(productId: string, store: string): Promise<boolean> {
    const cacheHours = CONFIG.PRICE_CACHE_HOURS;
    const cutoffTime = new Date(Date.now() - cacheHours * 60 * 60 * 1000).toISOString();

    const { data } = await supabase
        .from('precos')
        .select('ultima_atualizacao')
        .eq('produto_id', productId)
        .eq('loja', store)
        .gte('ultima_atualizacao', cutoffTime)
        .single();

    return !!data;
}

async function logError(productId: string, store: string, error: string): Promise<void> {
    try {
        await supabase.from('scraper_errors').insert({
            produto_id: productId,
            loja: store,
            erro: error,
            timestamp: new Date().toISOString()
        });
    } catch (err) {
        console.error('Failed to log error to database:', err);
    }
}

async function saveProductMatch(
    productId: string,
    store: string,
    match: ProcessedProduct,
    requestUrl: string
): Promise<void> {
    const finalLink = normalizeUrl(match.link, requestUrl);

    await supabase.from('precos').insert({
        produto_id: productId,
        preco: match.preco,
        loja: store,
        link_afiliado: finalLink,
        ultima_atualizacao: new Date().toISOString()
    });

    if (match.imagem && match.imagem.startsWith('http')) {
        await supabase
            .from('produtos')
            .update({ imagem_url: match.imagem })
            .eq('id', productId);
    }
}

// ========== STRATEGIES ==========
async function trySelectWeightInCard(
    page: any,
    cardElement: any,
    targetWeight: string,
    selectors: any,
    logger: Logger
): Promise<boolean> {
    try {
        const weightSelector = await cardElement.$(selectors.weightSelector);
        if (!weightSelector) return false;

        const options = await weightSelector.$$(selectors.weightOptions);

        for (const option of options) {
            const optionText = await option.textContent();
            const optionWeight = extractWeightFromText(optionText || '');

            if (weightsMatch(targetWeight, optionWeight)) {
                logger.info(`Found matching weight in card: ${optionText}`);
                await option.click();
                await page.waitForTimeout(CONFIG.WEIGHT_SELECTOR_DELAY);
                return true;
            }
        }
        return false;
    } catch (error) {
        return false;
    }
}

async function trySelectWeightInProductPage(
    page: any,
    productUrl: string,
    targetWeight: string,
    selectors: any,
    logger: Logger
): Promise<{ price: number; image: string } | null> {
    try {
        logger.info(`Deep Check: Navigating to ${productUrl}`);

        const newPage = await page.context().newPage();
        await newPage.goto(productUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await newPage.waitForTimeout(CONFIG.CLICK_PRODUCT_DELAY);

        // Click weight strategy
        // 1. Selector defined in config
        const weightSelector = await newPage.$(selectors.productPageWeightSelector);
        if (weightSelector) {
            const options = await weightSelector.$$(selectors.productPageWeightOptions);
            for (const option of options) {
                const text = await option.textContent();
                const weight = extractWeightFromText(text || '') || text || '';
                if (weightsMatch(targetWeight, weight)) {
                    logger.success(`Selecting weight on page: ${text}`);
                    await option.click();
                    await newPage.waitForTimeout(CONFIG.WEIGHT_SELECTOR_DELAY);
                    break;
                }
            }
        }
        // 2. Fallback: Search for any clickable element with weight text
        else {
            // Basic text match click
            const wText = targetWeight.replace(/\s/g, ''); // "15kg"
            // Try "15kg", "15 kg", "15 Kg"
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

        // Extract Price
        await newPage.waitForTimeout(1000);
        const priceText = await newPage.$eval(
            selectors.price + ', .price, [data-testid="product-price"], .sales-price',
            (el: any) => el.textContent
        ).catch(() => null);

        const price = normalizePrice(priceText || '');
        const image = await newPage.$eval(
            selectors.image + ', .product-image img',
            (el: any) => el.src
        ).catch(() => '');

        await newPage.close();
        return { price, image };

    } catch (error) {
        logger.error('Failed deep check', error);
        return null;
    }
}

async function getAllProductVariants(
    page: any,
    productUrl: string,
    selectors: any,
    logger: Logger
): Promise<Array<{ weight: string; price: number; image: string }>> {
    try {
        const newPage = await page.context().newPage();
        await newPage.goto(productUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await newPage.waitForTimeout(CONFIG.CLICK_PRODUCT_DELAY);
        const variants: Array<{ weight: string; price: number; image: string }> = [];

        // Simplified variant scraping for brevity/stability
        // ... (can be expanded if needed)

        await newPage.close();
        return variants;
    } catch (e) {
        return [];
    }
}

// ========== MAIN CRAWLER LOGIC ==========
async function createCrawler() {
    const logger = new Logger('Crawler');

    return new PlaywrightCrawler({
        headless: false,
        browserPoolOptions: {
            useFingerprints: true,
            fingerprintOptions: {
                fingerprintGeneratorOptions: {
                    browsers: ['chrome'],
                    devices: ['desktop'],
                    locales: ['pt-BR']
                }
            }
        },
        launchContext: {
            userDataDir: path.resolve(__dirname, 'browser_session'),
            launchOptions: {
                args: [
                    '--disable-blink-features=AutomationControlled',
                    '--disable-web-security',
                    '--no-sandbox',
                    '--disable-setuid-sandbox'
                ]
            }
        },
        minConcurrency: 1,
        maxConcurrency: CONFIG.MAX_CONCURRENT_STORES,
        maxRequestRetries: CONFIG.MAX_RETRIES,
        requestHandlerTimeoutSecs: CONFIG.REQUEST_TIMEOUT,

        requestHandler: async ({ page, request, log }) => {
            const { store, targetName, productId } = request.userData;
            const contextLogger = new Logger(`${store}:${productId}`);

            try {
                if (await shouldSkipProduct(productId, store)) {
                    contextLogger.info(`Skipping - cached`);
                    stats.skipped++;
                    return;
                }

                contextLogger.info(`Searching: ${targetName}`);

                // Store-specific specific wait strategies
                if (store === 'amazon' || store === 'mercadolivre') {
                    // Fast path for working stores
                    await page.waitForLoadState('domcontentloaded');
                } else {
                    // Slow path for SPAs (Petz, Cobasi, Petlove)
                    contextLogger.info('Waiting for heavy SPA to load...');
                    await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {
                        contextLogger.warning('Network idle timeout, proceeding anyway...');
                    });
                    await page.waitForTimeout(4000); // Extra safety delay
                }

                await autoScroll(page);
                await page.waitForTimeout(CONFIG.PAGE_TIMEOUT);

                const selectors = STORE_SELECTORS[store as keyof typeof STORE_SELECTORS];
                const targetWeight = extractWeightFromText(targetName);
                const targetKeywords = extractKeywords(targetName);

                const productCards = await page.$$(selectors.container);
                contextLogger.info(`Found ${productCards.length} product cards`);

                // DEBUG: Dump first card HTML to understand structure
                if (productCards.length > 0 && store !== 'amazon' && store !== 'mercadolivre') {
                    try {
                        const firstCardHtml = await productCards[0].innerHTML();
                        contextLogger.info(`[DEBUG] First Card HTML (${store}): ${firstCardHtml.slice(0, 600)}...`);
                    } catch (e) {
                        contextLogger.warning('[DEBUG] Failed to dump card HTML');
                    }
                }

                let bestMatch: ProcessedProduct | null = null;

                // --- MATCHING STRATEGY ---
                if (store === 'amazon' || store === 'mercadolivre') {
                    // Fast Heuristic (unchanged)
                    for (let i = 0; i < Math.min(productCards.length, 8); i++) {
                        // ... existing heuristic logic ...
                        const card = productCards[i];
                        const title = await card.$eval(selectors.title, (el: any) => el.textContent?.trim()).catch(() => '');
                        if (!title) continue;

                        const titleKeywords = extractKeywords(title);
                        const keywordsMatched = targetKeywords.filter(k => titleKeywords.includes(k));
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
                                contextLogger.success(`Fast Match: R$ ${price.toFixed(2)}`);
                                break;
                            }
                        }
                    }
                } else {
                    // LLM + Deep Check Strategy (Petz, Cobasi, Petlove)
                    contextLogger.info('Collecting candidates for LLM...');
                    const candidates: any[] = [];

                    for (let i = 0; i < Math.min(productCards.length, 12); i++) {
                        try {
                            const card = productCards[i];
                            let title = '';
                            let price = 0;
                            let link = '';
                            let source = 'html';
                            let reactiveSelected = false;

                            // --- Strategy A: Reactive Variant selection (Petz & Petlove) ---
                            if ((store === 'petz' || store === 'petlove') && targetWeight) {
                                try {
                                    // 1. Initial Check: If weight matches, don't click
                                    const initialText = await card.innerText();
                                    if (!weightsMatch(targetWeight, extractWeightFromText(initialText))) {
                                        // 2. Find Trigger
                                        const variantTrigger = (selectors as any).variantTrigger;
                                        const triggers = await card.$$(variantTrigger || '.p-card__variation-abreviation-item, button, span');
                                        for (const btn of triggers) {
                                            const btnText = await btn.innerText();
                                            if (weightsMatch(targetWeight, extractWeightFromText(btnText)) || btnText.includes('opções')) {
                                                contextLogger.info(`Triggering variant logic: ${btnText}`);
                                                await btn.evaluate(node => (node as HTMLElement).click());
                                                await page.waitForTimeout(1500);

                                                // Petlove Recursion: Check for second level in modal
                                                if (store === 'petlove') {
                                                    const modal = await page.$('.modal, .overlay, [class*="modal"], [class*="overlay"]');
                                                    if (modal) {
                                                        const nestedTrigger = await modal.$('text="Ver mais opções", text="+opções"');
                                                        if (nestedTrigger) {
                                                            await nestedTrigger.click();
                                                            await page.waitForTimeout(1500);
                                                        }
                                                        // Find targets in modal
                                                        const options = await page.$$('span, p, b, button');
                                                        for (const opt of options) {
                                                            if (weightsMatch(targetWeight, extractWeightFromText(await opt.innerText()))) {
                                                                await opt.click();
                                                                await page.waitForTimeout(1500);
                                                                reactiveSelected = true;
                                                                break;
                                                            }
                                                        }
                                                    }
                                                } else {
                                                    reactiveSelected = true;
                                                }
                                                break;
                                            }
                                        }
                                    }
                                } catch (e) { }
                            }

                            // --- Strategy B: Multi-Source Extraction ---
                            // Check JSON (Petz)
                            if (store === 'petz' && !reactiveSelected) {
                                try {
                                    const jsonEl = await card.$('.jsonGa');
                                    if (jsonEl) {
                                        const data = JSON.parse(await jsonEl.textContent() || '{}');
                                        title = data.name;
                                        price = parseFloat(data.price);
                                        source = 'json';
                                    }
                                } catch (e) { }
                            }

                            // DOM Extraction (Fallback / Reactive / Other Stores)
                            if (!title || reactiveSelected) {
                                // Scoping extraction to the active modal if it exists (Petlove)
                                const activeContainer = store === 'petlove' ? (await page.$('.modal, .overlay, [class*="modal"]') || card) : card;

                                title = await activeContainer.$eval('img', (el: any) => el.getAttribute('alt')).catch(() => '') || '';
                                if (!title) title = await activeContainer.$eval(selectors.title, (el: any) => el.innerText).catch(() => '') || '';

                                // Price Scanner (Retail Priority)
                                const containerText = await activeContainer.innerText();
                                const priceMatches = containerText.match(/R\$\s*[\d.,]+/g) || [];
                                if (priceMatches.length > 0) {
                                    const vals = priceMatches.map(p => normalizePrice(p)).filter(v => v > 0);
                                    const hasClub = /clube|assinante|assinatura|amigo/i.test(containerText);
                                    price = (hasClub && vals.length >= 2) ? Math.max(...vals) : Math.min(...vals);
                                }
                                source = reactiveSelected ? 'reactive' : 'dom';
                            }

                            link = await card.$eval('a', (el: any) => el.href).catch(() => '') || '';

                            if (title && link) {
                                candidates.push({
                                    index: i,
                                    nome: title.trim(),
                                    preco: price,
                                    link: normalizeUrl(link, request.url),
                                    source
                                });
                            }
                        } catch (e) { }
                    }

                    // LLM Selection
                    if (candidates.length > 0) {
                        const bestIndex = await selectBestMatch(candidates, targetName);
                        if (bestIndex !== -1 && candidates[bestIndex]) {
                            const candidate = candidates[bestIndex];
                            contextLogger.success(`LLM selected: "${candidate.nome}" - R$ ${candidate.preco}`);

                            const cardWeight = extractWeightFromText(candidate.nome);
                            if (targetWeight && weightsMatch(targetWeight, cardWeight) && candidate.preco > 0) {
                                bestMatch = {
                                    nome: candidate.nome,
                                    preco: candidate.preco,
                                    link: candidate.link,
                                    imagem: '',
                                    peso: targetWeight
                                };
                            } else if (targetWeight) {
                                contextLogger.info(`Weight mismatch or deep check needed...`);
                                const productData = await trySelectWeightInProductPage(
                                    page, candidate.link, targetWeight, STORE_SELECTORS[store as keyof typeof STORE_SELECTORS], contextLogger
                                );
                                if (productData && productData.price > 0) {
                                    bestMatch = {
                                        nome: candidate.nome,
                                        preco: productData.price,
                                        link: candidate.link,
                                        imagem: productData.image,
                                        peso: targetWeight
                                    };
                                }
                            }
                        }
                    }
                }

                if (bestMatch) {
                    await saveProductMatch(productId, store, bestMatch, request.url);
                    stats.success++;
                    if (!stats.byStore[store]) stats.byStore[store] = { success: 0, failed: 0 };
                    stats.byStore[store].success++;
                } else {
                    contextLogger.warning('No valid match found');
                    stats.failed++;
                }

            } catch (error) {
                contextLogger.error('Error', error);
                await logError(productId, store, String(error));
                stats.failed++;
            }
        }
    });
}

// ========== MAIN ==========
async function runFinder() {
    const mainLogger = new Logger('Main');
    mainLogger.info('Starting Product Finder v3 (Robust)...');

    const { data: products, error } = await supabase.from('produtos').select('id, nome').order('nome');
    if (error || !products) return;

    mainLogger.info(`Processing ${products.length} products`);
    const crawler = await createCrawler();

    const requests = products.flatMap(p =>
        Object.entries(STORES).map(([s, urlFn]) => ({
            url: urlFn(p.nome),
            userData: { store: s, targetName: p.nome, productId: p.id }
        }))
    );

    await crawler.addRequests(requests);
    await crawler.run();
    mainLogger.success('Done!');
}

runFinder();
