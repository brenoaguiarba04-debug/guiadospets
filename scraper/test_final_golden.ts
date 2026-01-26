
import { chromium, Page } from 'playwright';
import { selectBestMatch } from './ollama';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const CONFIG = { SCROLL_DISTANCE: 400, MAX_SCROLL_HEIGHT: 3000, SCROLL_DELAY: 200 };

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

function weightsMatch(weight1: string | null, weight2: string | null): boolean {
    if (!weight1 || !weight2) return false;
    const w1 = weight1.toLowerCase().replace(/\s+/g, '').replace(',', '.');
    const w2 = weight2.toLowerCase().replace(/\s+/g, '').replace(',', '.');
    return w1.includes(w2) || w2.includes(w1);
}

function extractWeightFromText(text: string): string | null {
    const match = text.match(/(\d+(?:[\.,]\d+)?)\s?(kg|g)/i);
    return match ? match[0].toLowerCase().replace(/\s+/g, '') : null;
}

async function scrapeStore(page: Page, storeName: string, product: { nome: string, weight: string }): Promise<string> {
    const logger = { info: (m: string) => console.log(`[${storeName}:${product.weight}] ${m}`) };
    const query = `${product.nome} ${product.weight}`;
    const url = storeName === 'Petz' ? `https://www.petz.com.br/busca?q=${encodeURIComponent(query)}` :
        (storeName === 'Cobasi' ? `https://www.cobasi.com.br/pesquisa?terms=${encodeURIComponent(query)}` :
            `https://www.petlove.com.br/busca?q=${encodeURIComponent(query)}`);

    try {
        await page.goto(url, { waitUntil: 'load', timeout: 60000 });
        await page.waitForTimeout(5000);

        if (storeName === 'Petz') {
            // PETZ: GO TO PDP IMMEDIATELY
            const link = await page.$eval('.product-card-wrapper a, .product-item a', (el: any) => el.href).catch(() => null);
            if (link) {
                await page.goto(link, { waitUntil: 'load' });
                await page.waitForTimeout(5000);
                const opts = await page.$$('button, span, div, label');
                for (const opt of opts) {
                    const txt = await opt.innerText().catch(() => '');
                    if (extractWeightFromText(txt) === product.weight) {
                        await opt.click({ force: true }).catch(() => { });
                        await page.waitForTimeout(4000);
                        break;
                    }
                }
                const bodyTxt = await page.innerText('body');
                const p = pickRetailPrice((bodyTxt.match(/R\$\s*[\d.,]+/g) || []).map(normalizePrice).filter(v => v > 100), bodyTxt);
                return p > 100 ? `R$ ${p.toFixed(2)}` : 'Não encontrado';
            }
        }

        if (storeName === 'Petlove') {
            const card = await page.$('.product-card__content');
            if (card) {
                const modalBtn = await card.$('button:has-text("+opções")');
                if (modalBtn) {
                    await modalBtn.click({ force: true });
                    await page.waitForTimeout(3000);
                    const modalOpts = await page.$$('.modal-content button, .modal-content span');
                    for (const opt of modalOpts) {
                        const txt = await opt.innerText().catch(() => '');
                        if (extractWeightFromText(txt) === product.weight) {
                            await opt.click({ force: true });
                            await page.waitForTimeout(4000);
                            const body = await page.innerText('body');
                            const p = pickRetailPrice((body.match(/R\$\s*[\d.,]+/g) || []).map(normalizePrice).filter(v => v > 100), body);
                            return p > 100 ? `R$ ${p.toFixed(2)}` : 'Não encontrado';
                        }
                    }
                }
            }
        }

        if (storeName === 'Cobasi') {
            const card = await page.$('[class*="ProductCard"], article');
            if (card) {
                const btns = await card.$$('button, span');
                for (const btn of btns) {
                    const txt = await btn.innerText().catch(() => '');
                    if (extractWeightFromText(txt) === product.weight) {
                        await btn.click({ force: true });
                        await page.waitForTimeout(5000);
                        const updated = await card.innerText();
                        const p = pickRetailPrice((updated.match(/R\$\s*[\d.,]+/g) || []).map(normalizePrice).filter(v => v > 100), updated);
                        return p > 100 ? `R$ ${p.toFixed(2)}` : 'Não encontrado';
                    }
                }
            }
        }

    } catch (e) { return "Erro"; }
    return "Não encontrado";
}

async function run() {
    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext({ userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36' });
    const products = [{ nome: 'Golden Special Cães', weight: '15kg' }, { nome: 'Golden Special Cães', weight: '20kg' }];
    const stores = ['Petz', 'Cobasi', 'Petlove'];
    const results: any[] = [];
    for (const p of products) {
        for (const s of stores) {
            const page = await context.newPage();
            const res = await scrapeStore(page, s, p);
            results.push({ Produto: p.weight, Loja: s, Preço: res });
            await page.close();
        }
    }
    await browser.close();
    console.table(results);
}
run();
