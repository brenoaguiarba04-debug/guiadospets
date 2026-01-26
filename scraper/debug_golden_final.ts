
import { chromium, Page } from 'playwright';
import path from 'path';

async function capture() {
    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    });
    const page = await context.newPage();

    console.log("Searching Cobasi for 'Golden Special 20kg'...");
    await page.goto('https://www.cobasi.com.br/pesquisa?terms=Golden%20Special%2020kg', { waitUntil: 'load', timeout: 60000 });
    await page.waitForTimeout(5000);
    await page.screenshot({ path: path.resolve(__dirname, 'golden_20kg_cobasi.png') });

    // Dump first card text
    const cobasiCard = await page.$('[class*="ProductCard"], article');
    if (cobasiCard) {
        console.log("Cobasi Card Text:", await cobasiCard.innerText());
    }

    console.log("Searching Petlove for 'Golden Special 20kg'...");
    await page.goto('https://www.petlove.com.br/busca?q=Golden%20Special%2020kg', { waitUntil: 'load', timeout: 60000 });
    await page.waitForTimeout(5000);
    await page.screenshot({ path: path.resolve(__dirname, 'golden_20kg_petlove.png') });

    // Check if there's a +opções modal opener
    const petloveCard = await page.$('.product-card__content, article');
    if (petloveCard) {
        console.log("Petlove Card Text:", await petloveCard.innerText());
        const btn = await petloveCard.$('button:has-text("+opções")');
        if (btn) {
            console.log("Found +opções button, clicking...");
            await btn.click();
            await page.waitForTimeout(3000);
            await page.screenshot({ path: path.resolve(__dirname, 'golden_20kg_petlove_modal.png') });
        }
    }

    await browser.close();
}

capture().catch(console.error);
