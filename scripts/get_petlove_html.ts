
import { chromium } from 'playwright';
import fs from 'fs';

async function run() {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto('https://www.petlove.com.br/busca?q=viva+verde');
    await page.waitForTimeout(5000);

    const card = await page.$('.product-card__content, [data-testid="product-card"]');
    if (card) {
        const html = await card.innerHTML();
        fs.writeFileSync('petlove_card.html', html);
        console.log('Saved petlove_card.html');
    }

    await browser.close();
}
run();
