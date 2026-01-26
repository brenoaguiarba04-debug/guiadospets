
import { chromium } from 'playwright';

async function debug() {
    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext({ userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36' });
    const page = await context.newPage();

    const stores = [
        { name: 'Petlove', url: 'https://www.petlove.com.br/busca?q=Golden%20Gato%20Castrado%20Salm%C3%A3o' },
        { name: 'Cobasi', url: 'https://www.cobasi.com.br/pesquisa?terms=Golden%20Gato%20Castrado%20Salm%C3%A3o' },
        { name: 'Petz', url: 'https://www.petz.com.br/busca?q=Golden%20Gato%20Castrado%20Salm%C3%A3o' }
    ];

    for (const store of stores) {
        console.log(`--- Debugging ${store.name} ---`);
        await page.goto(store.url, { waitUntil: 'load', timeout: 60000 });
        await page.waitForTimeout(5000);

        const containerSelector = store.name === 'Petz' ? '.product-card-wrapper' :
            (store.name === 'Cobasi' ? '[class*="ProductCard"], article' : '.product-card__content');

        const cards = await page.$$(containerSelector);
        console.log(`Found ${cards.length} cards`);
        for (let i = 0; i < Math.min(cards.length, 3); i++) {
            const text = await cards[i].innerText();
            console.log(`Card ${i + 1} Text (First 200 chars): ${text.slice(0, 200).replace(/\n/g, ' ')}`);
        }
    }

    await browser.close();
}
debug();
