import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

async function getProductDetails() {
    const userDataDir = path.resolve(__dirname, 'browser_session');
    const context = await chromium.launchPersistentContext(userDataDir, {
        headless: true,
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    });
    const page = await context.newPage();
    const url = 'https://www.mercadolivre.com.br/vivaverde-areia-higinica-para-gatos-gros-finos-4kg/p/MLB19541891';

    await page.goto(url, { waitUntil: 'load' });

    const title = await page.$eval('.ui-pdp-title', el => (el as HTMLElement).innerText).catch(() => 'N/A');
    const price = await page.evaluate(() => {
        const p = document.querySelector('.ui-pdp-price__second-line .and-price-tag-amount, .ui-pdp-price__second-line .price-tag-amount, meta[itemprop="price"]');
        if (p?.tagName === 'META') return (p as HTMLMetaElement).content;
        return (p as HTMLElement)?.innerText || 'N/A';
    });

    const result = {
        title: title.trim(),
        price: price.replace(/\n/g, '').replace(/\s+/g, ' ').trim(),
        url: url
    };

    fs.writeFileSync('ml_final_details.json', JSON.stringify(result, null, 2));
    console.log("FINAL_DETAILS_READY");

    await context.close();
}

getProductDetails();
