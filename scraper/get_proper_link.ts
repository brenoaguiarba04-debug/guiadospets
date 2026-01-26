import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

async function getDetails() {
    const userDataDir = path.resolve(__dirname, 'browser_session');
    const context = await chromium.launchPersistentContext(userDataDir, {
        headless: true,
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    });
    const page = await context.newPage();
    const query = "Areia Viva Verde Grãos Finos 4kg";
    const url = `https://lista.mercadolivre.com.br/${encodeURIComponent(query)}`;

    await page.goto(url, { waitUntil: 'networkidle' });

    // Selectors for Mercado Livre Search Results
    const firstLink = await page.$eval('.ui-search-result__wrapper a, .poly-card a, .ui-search-item__group__element a', (el: any) => el.href).catch(() => null);
    const firstTitle = await page.$eval('.ui-search-item__title, .poly-component__title, h2', (el: any) => el.innerText).catch(() => 'N/A');
    const firstPrice = await page.$eval('.ui-search-result__wrapper .price-tag-amount, .poly-card .poly-price__current', (el: any) => el.innerText).catch(() => 'N/A');

    if (firstLink) {
        const result = {
            title: firstTitle.trim(),
            link: firstLink,
            price: firstPrice.replace(/\n/g, '').replace(/\s+/g, ' ').trim()
        };
        fs.writeFileSync('ml_details.json', JSON.stringify(result, null, 2));
        console.log("DETAILS_FOUND");
    } else {
        console.log("NOT_FOUND");
    }

    await context.close();
}

getDetails();
