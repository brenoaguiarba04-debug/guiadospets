
import { chromium } from 'playwright';
import path from 'path';

async function verify() {
    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext({ userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36' });
    const page = await context.newPage();

    const targets = [
        { s: 'Petlove', q: 'Golden Gato Salmao 1kg' },
        { s: 'Petlove', q: 'Golden Gato Salmao 3kg' },
        { s: 'Petlove', q: 'Golden Gato Salmao 10kg' },
        { s: 'Petz', q: 'Golden Gato Salmao 1kg' },
        { s: 'Petz', q: 'Golden Gato Salmao 3kg' },
        { s: 'Petz', q: 'Golden Gato Salmao 10kg' },
        { s: 'Cobasi', q: 'Golden Gato Salmao 1kg' },
        { s: 'Cobasi', q: 'Golden Gato Salmao 3kg' },
        { s: 'Cobasi', q: 'Golden Gato Salmao 10kg' },
    ];

    const results: any[] = [];

    for (const t of targets) {
        console.log(`Checking ${t.s} for ${t.q}...`);
        const url = t.s === 'Petz' ? `https://www.petz.com.br/busca?q=${encodeURIComponent(t.q)}` :
            (t.s === 'Cobasi' ? `https://www.cobasi.com.br/pesquisa?terms=${encodeURIComponent(t.q)}` :
                `https://www.petlove.com.br/busca?q=${encodeURIComponent(t.q)}`);

        await page.goto(url, { waitUntil: 'load', timeout: 30000 }).catch(() => { });
        await page.waitForTimeout(4000);

        const selector = t.s === 'Petz' ? '.product-card-wrapper' :
            (t.s === 'Cobasi' ? '[class*="ProductCard"]' : '.product-card__content, article');

        const card = await page.$(selector);
        if (card) {
            const text = await card.innerText();
            const pMatch = text.match(/R\$\s*[\d.,]+/g);
            const prices = pMatch ? pMatch.map(p => p.replace('R$', '').trim()) : [];
            results.push({ Loja: t.s, Query: t.q, Preços: prices.slice(0, 2).join(' / '), Link: await card.$eval('a', (el: any) => el.href).catch(() => '') });
        } else {
            results.push({ Loja: t.s, Query: t.q, Preços: 'N/D', Link: '' });
        }
    }

    console.table(results);
    await browser.close();
}
verify();
