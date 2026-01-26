import { chromium } from 'playwright';
import path from 'path';

async function testMLSession() {
    const userDataDir = path.resolve(__dirname, 'browser_session');
    console.log(`Using userDataDir: ${userDataDir}`);

    const context = await chromium.launchPersistentContext(userDataDir, {
        headless: false, // Visible for debugging
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    });

    const page = await context.newPage();
    const query = "Areia Viva Verde Grãos Finos 4kg";
    const url = `https://lista.mercadolivre.com.br/${encodeURIComponent(query)}`;

    console.log(`Navigating to: ${url}`);
    try {
        await page.goto(url, { waitUntil: 'networkidle' });
        await page.waitForTimeout(5000);

        const pageTitle = await page.title();
        console.log(`Page Title: ${pageTitle}`);
        console.log(`Current URL: ${page.url()}`);

        const cards = await page.$$('.ui-search-result__wrapper, .poly-card, li.ui-search-layout__item');
        console.log(`Found ${cards.length} cards`);

        if (cards.length === 0) {
            console.log("No cards found. Taking screenshot...");
            await page.screenshot({ path: 'ml_session_fail.png' });
        } else {
            for (let i = 0; i < Math.min(cards.length, 5); i++) {
                const card = cards[i];
                const title = await card.$eval('.ui-search-item__title, .poly-component__title, h2', (el: any) => el.innerText).catch(() => 'NO_TITLE');
                const price = await card.$eval('.price-tag-amount, .poly-price__current', (el: any) => el.innerText).catch(() => 'NO_PRICE');
                console.log(`Card ${i}: "${title}" - ${price}`);
            }
        }
    } catch (err) {
        console.error("Test failed:", err);
    } finally {
        await context.close();
    }
}

testMLSession();
