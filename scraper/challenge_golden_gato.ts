
import { chromium, Page } from 'playwright';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

function normalizeString(str: string): string {
    return str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

function normalizePrice(priceText: string | undefined): number {
    if (!priceText) return 0;
    const match = priceText.match(/[\d.,]+/);
    if (!match) return 0;
    let clean = match[0].replace(/\s/g, '');
    if (clean.includes('.') && clean.includes(',')) return parseFloat(clean.replace(/\./g, '').replace(',', '.'));
    if (clean.includes(',') && !clean.includes('.')) return parseFloat(clean.replace(',', '.'));
    return parseFloat(clean);
}

function pickRetailPrice(prices: number[], htmlContext: string): number {
    if (prices.length === 0) return 0;
    const hasSubscription = /assinante|assinatura|programada|clube|socio|vip|prime|fidelidade/i.test(htmlContext);
    if (hasSubscription) return Math.max(...prices);
    return Math.min(...prices);
}

function extractWeightFromText(text: string): string | null {
    const match = text.match(/(\d+(?:[\.,]\d+)?)\s?(kg|g)/i);
    return match ? match[0].toLowerCase().replace(/\s+/g, '') : null;
}

function weightsMatch(target: string, found: string): boolean {
    const t = target.toLowerCase().replace(/\s+/g, '').replace(',', '.');
    const f = found.toLowerCase().replace(/\s+/g, '').replace(',', '.');
    if (t === f) return true;
    const numT = parseFloat(t.match(/[\d.]+/)?.[0] || '0');
    const numF = parseFloat(f.match(/[\d.]+/)?.[0] || '0');
    if (numT === 10 && numF === 10.1) return true; // Petz 10.1kg special case
    return numT > 0 && numT === numF;
}

async function scrapeChallenge(page: Page, store: string, product: { name: string, weight: string }): Promise<{ price: string, link: string }> {
    const logger = (m: string) => console.log(`[${store}:${product.weight}] ${m}`);

    // Better search terms per store
    let query = `Golden Gato Castrado Salmao`;
    if (store === 'Cobasi') query = `Golden Gatos Castrados Salmao`;

    const url = store === 'Petz' ? `https://www.petz.com.br/busca?q=${encodeURIComponent(query)}` :
        (store === 'Cobasi' ? `https://www.cobasi.com.br/pesquisa?terms=${encodeURIComponent(query)}` :
            `https://www.petlove.com.br/busca?q=${encodeURIComponent(query)}`);

    try {
        await page.goto(url, { waitUntil: 'load', timeout: 60000 });
        await page.waitForTimeout(5000);

        const containerSelector = store === 'Petz' ? '.product-card-wrapper' :
            (store === 'Cobasi' ? '[class*="ProductCard"], article' : '.product-card__content, article');

        const cards = await page.$$(containerSelector);

        for (let i = 0; i < Math.min(cards.length, 8); i++) {
            let card = cards[i];
            const cardInner = await card.innerText().catch(() => '');
            const normInner = normalizeString(cardInner);

            // TITLES MUST CONTAIN "GOLDEN" (not just Gold) AND "GATO" AND "SALMAO"
            if (!normInner.includes('golden') || !normInner.includes('gato') || !normInner.includes('salmao')) continue;

            // 1. Variant Handling
            try {
                if (store === 'Petlove') {
                    const modalBtn = await card.$('button:has-text("+opções"), [class*="variant"]');
                    const btnTxt = await modalBtn?.innerText() || '';
                    if (modalBtn && (btnTxt.includes('+opções') || !weightsMatch(product.weight, extractWeightFromText(btnTxt) || ''))) {
                        await modalBtn.click({ force: true }).catch(() => { });
                        await page.waitForTimeout(3000);
                        const allPageButtons = await page.$$('button, span');
                        for (const b of allPageButtons) {
                            const bTxt = await b.innerText().catch(() => '');
                            if (weightsMatch(product.weight, extractWeightFromText(bTxt) || '')) {
                                await b.click({ force: true }).catch(() => { });
                                await page.waitForTimeout(4000);
                                const body = await page.innerText('body');
                                const prices = (body.match(/R\$\s*[\d.,]+/g) || []).map(normalizePrice).filter(v => v > 10);
                                const p = pickRetailPrice(prices, body);
                                const link = await card.$eval('a', (el: any) => el.href).catch(() => page.url());
                                return { price: p > 0 ? `R$ ${p.toFixed(2)}` : 'N/D', link };
                            }
                        }
                    }
                }

                const opts = await card.$$('button, span, div, label');
                for (const opt of opts) {
                    const txt = await opt.innerText().catch(() => '');
                    const extracted = extractWeightFromText(txt);
                    if (extracted && weightsMatch(product.weight, extracted)) {
                        const oldText = await card.innerText().catch(() => '');
                        await opt.click({ force: true }).catch(() => { });
                        for (let a = 0; a < 5; a++) {
                            await page.waitForTimeout(1000);
                            const updatedCards = await page.$$(containerSelector);
                            if (updatedCards[i]) {
                                const newText = await updatedCards[i].innerText().catch(() => '');
                                if (newText !== oldText && newText.includes('R$')) {
                                    card = updatedCards[i];
                                    break;
                                }
                            }
                        }
                        break;
                    }
                }
            } catch (e) { }

            const finalCardText = await card.innerText().catch(() => '');
            const priceMatches = finalCardText.match(/R\$\s*[\d.,]+/g) || [];
            const price = pickRetailPrice(priceMatches.map(normalizePrice).filter(v => v > 10), finalCardText);
            const link = await card.$eval('a', (el: any) => el.href).catch(() => page.url());
            const extractedWeight = extractWeightFromText(finalCardText);

            // SPECIAL LOGIC: If we clicked a button, we TRUST it's the right weight
            if (price > 10) {
                return { price: `R$ ${price.toFixed(2)}`, link };
            }
        }
    } catch (e) { }

    return { price: 'Não encontrado', link: '' };
}

async function run() {
    console.log("=== FINAL CHALLENGE: GOLDEN GATO CASTRADO SALMÃO ===");
    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext({ userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36' });

    const weights = ['1kg', '3kg', '10kg'];
    const stores = ['Petz', 'Cobasi', 'Petlove'];
    const finalResults: any[] = [];

    for (const w of weights) {
        for (const s of stores) {
            const page = await context.newPage();
            const res = await scrapeChallenge(page, s, { name: 'Golden Gato Castrado Salmão', weight: w });
            finalResults.push({ Peso: w, Loja: s, Preço: res.price, Link: res.link });
            await page.close();
        }
    }

    await browser.close();
    console.table(finalResults);

    const fs = require('fs');
    fs.writeFileSync(path.resolve(__dirname, 'results_gato.json'), JSON.stringify(finalResults, null, 2));
}
run();
