
import { chromium, Page } from 'playwright';
import fs from 'fs';
import path from 'path';

function normalize(s: string) { return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""); }

async function scrapeStore(page: Page, store: string, weight: string) {
    const logger = (m: string) => console.log(`[${store}:${weight}] ${m}`);
    let query = `Golden Gatos Castrados Salmao ${weight}`;
    if (store === 'Petlove') query = `Golden Gato Salmao`;

    const url = store === 'Petz' ? `https://www.petz.com.br/busca?q=${encodeURIComponent(query)}` :
        (store === 'Cobasi' ? `https://www.cobasi.com.br/pesquisa?terms=${encodeURIComponent(query)}` :
            `https://www.petlove.com.br/busca?q=${encodeURIComponent(query)}`);

    try {
        await page.goto(url, { waitUntil: 'load', timeout: 60000 });
        await page.waitForTimeout(5000);

        const selector = store === 'Petz' ? '.product-card-wrapper' :
            (store === 'Cobasi' ? '[class*="ProductCard"]' : '.product-card__content, article');

        const cards = await page.$$(selector);
        for (let i = 0; i < Math.min(cards.length, 8); i++) {
            let card = cards[i];
            let text = await card.innerText().catch(() => '');
            let norm = normalize(text);

            if (norm.includes('golden') && norm.includes('gato') && norm.includes('salmao')) {
                // Try variant button
                try {
                    const btns = await card.$$('button, span, li');
                    for (const btn of btns) {
                        const bTxt = normalize(await btn.innerText().catch(() => ''));
                        const wNum = weight.replace('kg', '');
                        if (bTxt.includes(wNum) && bTxt.includes('kg')) {
                            logger(`Clicking variant: ${bTxt}`);
                            await btn.click({ force: true }).catch(() => { });
                            await page.waitForTimeout(5000);

                            // Fresh card
                            const refetched = await page.$$(selector);
                            if (refetched[i]) card = refetched[i];
                            break;
                        }
                    }
                } catch (e) { }

                const freshText = await card.innerText().catch(() => '');
                const freshNorm = normalize(freshText);
                const priceMatch = freshText.match(/R\$\s*[\d.,]+/g);
                const prices = priceMatch ? priceMatch.map(p => parseFloat(p.replace('R$', '').replace('.', '').replace(',', '.').trim())).filter(v => v > 10) : [];
                const price = prices.length > 0 ? (freshNorm.includes('assinante') || freshNorm.includes('clube') ? Math.max(...prices) : Math.min(...prices)) : 0;
                const link = await card.$eval('a', (el: any) => el.href).catch(() => page.url());

                // Final Weight Validation in Fresh Text
                const wNum = weight.replace('kg', '');
                if (freshNorm.includes(wNum) && freshNorm.includes('kg') && price > 10) {
                    return { price: `R$ ${price.toFixed(2)}`, link };
                }
            }
        }
    } catch (e: any) { logger(`Error: ${e.message}`); }
    return { price: 'N/D', link: '' };
}

async function run() {
    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext({ userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36' });
    const weights = ['1kg', '3kg', '10kg'];
    const stores = ['Petz', 'Cobasi', 'Petlove'];
    const final = [];

    for (const w of weights) {
        for (const s of stores) {
            const page = await context.newPage();
            const res = await scrapeStore(page, s, w);
            final.push({ Peso: w, Loja: s, Preço: res.price, Link: res.link });
            await page.close();
        }
    }

    fs.writeFileSync(path.resolve(__dirname, 'results_final_gato.json'), JSON.stringify(final, null, 2));
    await browser.close();
    console.table(final);
}
run();
