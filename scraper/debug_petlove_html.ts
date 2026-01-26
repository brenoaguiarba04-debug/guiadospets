import { chromium } from 'playwright';
import fs from 'fs';

async function debug() {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });
    const page = await context.newPage();
    const url = 'https://www.petlove.com.br/busca?q=NexGard+Spectra';
    console.log(`Navigating to ${url}...`);

    try {
        await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
        await page.waitForTimeout(5000);
        const html = await page.content();
        fs.writeFileSync('debug_petlove_source.html', html);
        console.log('HTML saved to debug_petlove_source.html');

        const cardCount = await page.$$eval('.product-card__content, [data-testid="product-card"], article, .product-item', el => el.length);
        console.log(`Card count: ${cardCount}`);

        if (cardCount > 0) {
            const firstCard = await page.$eval('.product-card__content, [data-testid="product-card"], article, .product-item', el => el.outerHTML);
            console.log('First card HTML (truncated):', firstCard.slice(0, 500));
        }
    } catch (e) {
        console.error('Error:', e);
    } finally {
        await browser.close();
    }
}

debug();
