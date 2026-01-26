
import { chromium, Page } from 'playwright';

async function inspect() {
    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    });

    const stores = [
        { name: 'Cobasi', url: 'https://www.cobasi.com.br/pesquisa?terms=Golden%20Special%2020kg' },
        { name: 'Petz', url: 'https://www.petz.com.br/busca?q=Golden%20Special%2020kg' },
        { name: 'Petlove', url: 'https://www.petlove.com.br/busca?q=Golden%20Special%2020kg' }
    ];

    for (const store of stores) {
        console.log(`--- Inspecting ${store.name} for 20kg ---`);
        const page = await context.newPage();
        await page.goto(store.url, { waitUntil: 'load', timeout: 60000 });
        await page.waitForTimeout(5000);

        const cardSelector = store.name === 'Petz' ? '.product-card-wrapper' : (store.name === 'Cobasi' ? '[class*="ProductCard"]' : '.product-card__content');
        const cards = await page.$$(cardSelector);

        for (const card of cards) {
            const text = await card.innerText().catch(() => '');
            if (text.toLowerCase().includes('golden special')) {
                console.log(`Found Golden Card. Content snippet: ${text.slice(0, 100).replace(/\n/g, ' ')}`);
                const variants = await card.$$('button, span, div, label');
                for (const v of variants) {
                    const vText = await v.innerText().catch(() => '');
                    if (vText.includes('20')) {
                        console.log(`Clicking 20kg button: ${vText}`);
                        await v.click({ force: true }).catch(() => { });
                        await page.waitForTimeout(4000);
                        const newText = await card.innerText();
                        console.log(`Price after klik:`, newText.match(/R\$\s*[\d.,]+/g));
                    }
                }
                break; // Only check first valid card
            }
        }
        await page.close();
    }

    await browser.close();
}

inspect().catch(console.error);
