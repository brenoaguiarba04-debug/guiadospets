import { chromium } from 'playwright';

async function diagnose() {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    const url = `https://lista.mercadolivre.com.br/viva-verde-4kg`;

    try {
        await page.goto(url, { waitUntil: 'networkidle' });
        await page.waitForTimeout(5000);

        const cardSelectors = [
            '.ui-search-result__wrapper',
            '.poly-card',
            '.ui-search-item',
            '[class*="product-card"]',
            '.poly-component'
        ];

        let card = null;
        for (const sel of cardSelectors) {
            card = await page.$(sel);
            if (card) {
                console.log(`Matched selector: ${sel}`);
                break;
            }
        }

        if (card) {
            const html = await card.innerHTML();
            const text = await card.innerText();
            console.log("=== ML CARD HTML ===");
            console.log(html);
            console.log("\n=== ML CARD TEXT ===");
            console.log(text);
        } else {
            console.log("No card found. Body text snapshot:");
            const body = await page.innerText('body');
            console.log(body.substring(0, 500));
        }
    } finally {
        await browser.close();
    }
}
diagnose();
