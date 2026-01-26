
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
}; // Slower scroll for better loading

function simplifyQuery(term: string): string {
    // Broadening the query: "Ração Quatree Life Gatos Castrados..." -> "Quatree Life Salmão"
    // This is safer for search engines.
    return "Quatree Life Salmão";
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

    // Allow 10kg matching 10.1kg (specific fix for Quatree)
    if (unit1 === unit2 && Math.abs(num1 - num2) <= 0.2) return true;

    if (unit1 !== unit2) return false;
    return Math.abs(num1 - num2) < 0.01;
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

// ========== STORE SCRAPERS ==========

async function scrapeGeneric(page: Page, storeName: string, homeUrl: string, searchUrlFn: (q: string) => string, product: { nome: string, weight: string }): Promise<string> {
    const logger = new Logger(`${storeName}:${product.weight}`);
    // Use the simplified query logic
    const query = simplifyQuery(product.nome);
    const url = searchUrlFn(query);

    try {
        logger.info(`Navigating to ${url}`);
        await page.goto(url, { waitUntil: 'load', timeout: 60000 });
        await page.waitForTimeout(4000);
        await autoScroll(page);

        // Generic selector list
        let containerSelector = '';
        if (storeName === 'Petz') containerSelector = '.product-card-wrapper, .product-item, [class*="card-product"]';
        else if (storeName === 'Cobasi') containerSelector = '[class*="ProductCard"], [class*="product-card"], article, [data-testid*="product"]';
        else if (storeName === 'Petlove') containerSelector = '.product-card__content, article';

        const cards = await page.$$(containerSelector);
        logger.info(`Found ${cards.length} cards`);

        const candidates: any[] = [];
        const debugList: string[] = [];

        for (const card of cards) {
            let title = await card.innerText().then(t => t.split('\n')[0]).catch(() => '') || '';
            // Refine title if possible
            const titleEl = await card.$('h3, h2, [class*="name"]').catch(() => null);
            if (titleEl) title = await titleEl.innerText().catch(() => title);

            const link = await card.$eval('a', (el: any) => el.href).catch(() => '') || '';
            const cardText = await card.innerText();
            const lowerText = cardText.toLowerCase();

            // Broad "Out of Stock" detection based on Portuguese terms
            const isOutOfStock = /indispon|esgotado|avise-me|sem estoque|que pena|produto sem estoque/i.test(lowerText);

            // Price Logic (Exclude Subscription)
            let price = 0;
            if (!isOutOfStock) {
                // Heuristic: If text contains "assinatura", "programada", "assinante", likely the lower price is subscription.
                const hasSubscription = /assinatura|assinante|programada|clube|fidelidade/i.test(lowerText);
                const priceMatches = cardText.match(/R\$\s*[\d.,]+/g) || [];

                if (priceMatches.length > 0) {
                    let vals = priceMatches.map(p => normalizePrice(p)).filter(v => v > 0);
                    // If multiple prices and subscription detected, pick the highest (usually retail)
                    // If no subscription text, pick min (usually retail/promo)
                    if (hasSubscription && vals.length >= 2) {
                        price = Math.max(...vals);
                    } else {
                        // Some cards might show "De R$ 50 por R$ 40", we want R$ 40.
                        // But if "R$ 40 (Assinatura) R$ 50 (Normal)", we want R$ 50.
                        // This is tricky without strict selector separation.
                        // Let's rely on the heuristic: if "assinatura" present, take MAX. Else MIN.
                        price = Math.min(...vals);
                    }
                }
            }

            // Variant Matches in Title
            const w = extractWeightFromText(title);

            // Debug info
            debugList.push(`[${title.slice(0, 30)}... | W:${w} | Stock:${!isOutOfStock} | Price:${price}]`);

            // 1. Direct match on Card Title
            if (weightsMatch(product.weight, w)) {
                if (isOutOfStock) return "FORA DE ESTOQUE (Detectado no Card)";
                if (price > 0) return `R$ ${price.toFixed(2)}`;
            }

            // 2. Button Variant Check (If title excludes weight, looking at buttons)
            // If the card title *contains* "Quatree" but maybe implies multiple weights
            if (title.toLowerCase().includes('quatree')) {
                // Check if there are buttons with the target weight
                // This covers the case where the product card is generic "Ração Quatree" and has buttons "1kg", "3kg" etc.
                const options = await card.$$('button, span, div, a, label');
                for (const opt of options) {
                    const optText = await opt.innerText().catch(() => '');
                    const optWeight = extractWeightFromText(optText);
                    if (weightsMatch(product.weight, optWeight)) {
                        // found the button for 3kg/10kg
                        // Check if this specific option implies out of stock (e.g. disabled, class crossed)
                        const isDisabled = await opt.evaluate((el: any) => el.hasAttribute('disabled') || el.classList.contains('disabled') || el.style.opacity === '0.5');

                        // Re-check card text context if this option is selected/present
                        if (isDisabled || isOutOfStock) return "FORA DE ESTOQUE (Variante Desabilitada)";
                        if (price > 0) return `R$ ${price.toFixed(2)}`; // Assuming the claimed price applies
                    }
                }
            }

            candidates.push({ title, price, isOutOfStock, link });
        }

        // logger.info("Debug Candidates: " + debugList.join(', '));

        // If no strict regex match, try LLM Fallback
        if (candidates.length > 0) {
            logger.info(`Strict match failed. Trying LLM analysis for "${product.nome} ${product.weight}" on ${candidates.length} candidates...`);

            // Prepare candidates for LLM (include some context like buttons/variants if possible to stringify)
            const llmCandidates = candidates.map((c, i) => ({
                index: i,
                title: c.title,
                price: c.price,
                link: c.link,
                // Add a "matches_weight" hint if possible, but simplest is relying on title + query
            }));

            // We augment the query with the specific weight to help LLM pick the right one
            const targetQuery = `${product.nome} ${product.weight}`;
            const bestIndex = await selectBestMatch(llmCandidates, targetQuery);

            if (bestIndex !== -1) {
                const winner = candidates[bestIndex];
                logger.success(`LLM Selected: ${winner.title}`);

                // Final check on the winner's properties
                if (winner.isOutOfStock) return "FORA DE ESTOQUE (LLM Detectou)";
                if (winner.price > 0) return `R$ ${winner.price.toFixed(2)} (LLM)`;

                return "Produto encontrado (LLM), mas sem preço detectado";
            } else {
                logger.warning("LLM could not confidently select a match.");
            }
        }

        if (candidates.length === 0) return "Nenhum card encontrado";

    } catch (e) {
        logger.error("Error", e);
        return "Erro exceção";
    }

    return "Produto visível mas variante específica não encontrada";
}

// ========== SPECIALIZED SCRAPERS (To handle specific store quirks if generic fails) ==========

// We will use a unified runner for simplicity, injecting the store-specifics.

async function runTest() {
    console.log("=== FINAL VERIFICATION REFINED: QUATREE LIFE SALMÃO CASTRADOS ===");
    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    });

    const products = [
        { nome: 'Ração Quatree Life Gatos Castrados Salmão e Arroz', weight: '3kg' },
        { nome: 'Ração Quatree Life Gatos Castrados Salmão e Arroz', weight: '10kg' }
    ];

    const stores = [
        {
            name: 'Petz',
            urlFn: (q: string) => `https://www.petz.com.br/busca?q=${encodeURIComponent(q)}`
        },
        {
            name: 'Cobasi',
            urlFn: (q: string) => `https://www.cobasi.com.br/pesquisa?terms=${encodeURIComponent(q)}`
        },
        {
            name: 'Petlove',
            urlFn: (q: string) => `https://www.petlove.com.br/busca?q=${encodeURIComponent(q)}`
        }
    ];

    const results: any[] = [];

    // Run only once for searching, iterating products internally would be more efficient in real app but test is per-item
    for (const product of products) {
        for (const store of stores) {
            const page = await context.newPage();
            // Stealth headers
            await page.setExtraHTTPHeaders({
                'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
                'Upgrade-Insecure-Requests': '1'
            });

            const result = await scrapeGeneric(page, store.name, '', store.urlFn, product);
            console.log(`[${store.name}] ${product.weight}: ${result}`);

            results.push({
                store: store.name,
                weight: product.weight,
                result: result
            });

            await page.close();
        }
    }

    await browser.close();
    console.table(results);
}

runTest();
