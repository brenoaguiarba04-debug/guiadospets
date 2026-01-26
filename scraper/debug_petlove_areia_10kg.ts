
import { chromium } from 'playwright';

async function debug() {
    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    });
    const page = await context.newPage();

    const url = 'https://www.petlove.com.br/busca?q=Areia%20Viva%20Verde%2010kg';
    console.log(`Searching Petlove for 10kg...`);
    await page.goto(url, { waitUntil: 'load', timeout: 60000 });
    await page.waitForTimeout(5000);

    const cards = await page.$$('.product-card__content, article');
    console.log(`Found ${cards.length} cards for specific 10kg query.`);
    for (const card of cards) {
        const text = await card.innerText();
        console.log(`Result: ${text.split('\n')[0]}`);
    }

    await browser.close();
}

debug().catch(console.error);
