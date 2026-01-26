
import { chromium, Page } from 'playwright';
import path from 'path';

async function inspect() {
    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    });

    const stores = [
        { name: 'Petlove', url: 'https://www.petlove.com.br/busca?q=Viva%20Verde' },
        { name: 'Cobasi', url: 'https://www.cobasi.com.br/pesquisa?terms=Viva%20Verde' },
        { name: 'Petz', url: 'https://www.petz.com.br/busca?q=Viva%20Verde' }
    ];

    for (const store of stores) {
        console.log(`--- Inspecting ${store.name} ---`);
        const page = await context.newPage();
        await page.goto(store.url, { waitUntil: 'load', timeout: 60000 });
        await page.waitForTimeout(5000);

        const cards = await page.$$('.product-card-wrapper, .product-item, [class*="card-product"], [class*="ProductCard"], article');
        for (let i = 0; i < Math.min(cards.length, 5); i++) {
            const card = cards[i];
            const title = await card.innerText().then(t => t.split('\n')[0]);
            console.log(`Product ${i + 1}: ${title}`);

            // Try to find buttons or weight-like spans
            const variants = await card.$$('button, span, div, label');
            const weightTexts: string[] = [];
            for (const v of variants) {
                const txt = await v.innerText().catch(() => '');
                if (/\d+\s?(kg|g|lb|un)/i.test(txt)) {
                    weightTexts.push(txt.trim());
                }
                if (txt.includes('+opções') || txt.includes('mais')) {
                    weightTexts.push(txt.trim() + " (EXPANDER)");
                }
            }
            console.log(`Possible weights/options found:`, [...new Set(weightTexts)]);
        }
        await page.close();
    }

    await browser.close();
}

inspect().catch(console.error);
