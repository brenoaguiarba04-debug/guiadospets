import { chromium } from 'playwright';
import path from 'path';

async function testML() {
    const userDataDir = path.resolve(__dirname, 'browser_session');
    const context = await chromium.launchPersistentContext(userDataDir, {
        headless: false,
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    });
    const page = await context.newPage();
    const query = "Areia Viva Verde Grãos Finos 4kg";
    const url = `https://lista.mercadolivre.com.br/${encodeURIComponent(query)}`;

    console.log(`Navigating to: ${url}`);
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    const cards = await page.$$('.ui-search-result__wrapper, .poly-card, li.ui-search-layout__item');
    console.log(`Found ${cards.length} cards`);

    for (let i = 0; i < Math.min(cards.length, 5); i++) {
        const card = cards[i];
        const title = await card.$eval('.ui-search-item__title, .poly-component__title, h2', (el: any) => el.innerText).catch(() => 'NO_TITLE');
        const price = await card.$eval('.price-tag-amount, .poly-price__current', (el: any) => el.innerText).catch(() => 'NO_PRICE');
        const link = await card.$eval('a', (el: any) => el.href).catch(() => 'NO_LINK');
        console.log(`Card ${i}: "${title}" - ${price}`);
        console.log(`  -> Link: ${link}`);

        const weight = title.match(/(\d+(?:[\.,]\d+)?)\s?(kg|g|ml|l|mg)/i);
        console.log(`  -> Extracted Weight: ${weight ? weight[0] : 'NONE'}`);
    }

    await context.close();
}

testML();
