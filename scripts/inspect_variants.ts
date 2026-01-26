
import { chromium } from 'playwright';

async function inspectVariants(url: string, storeName: string) {
    console.log(`\n--- Inspecting ${storeName} variants ---`);
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
        await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
        await page.waitForTimeout(5000);

        // Take a screenshot to confirm we are on the results page
        await page.screenshot({ path: `inspect_${storeName}_search.png` });

        // Identify cards
        let cardSelector = '';
        if (storeName === 'petlove') cardSelector = '.product-card__content, article';
        if (storeName === 'cobasi') cardSelector = '[class*="ProductCard"], article';
        if (storeName === 'petz') cardSelector = '.product-card-wrapper, .product-item';

        const cards = await page.$$(cardSelector);
        console.log(`Found ${cards.length} cards.`);

        for (let i = 0; i < Math.min(cards.length, 3); i++) {
            const card = cards[i];
            const text = await card.innerText();
            console.log(`Card ${i} Initial Text (first 50 chars): ${text.substring(0, 50).replace(/\n/g, ' ')}`);

            // Look for variant buttons
            const variants = await card.$$('button, div[class*="variant"], div[class*="size"], div[class*="weight"], span[class*="option"]');
            console.log(`  Found ${variants.length} potential variant elements.`);

            for (const v of variants) {
                const vText = await v.innerText();
                const vClass = await v.getAttribute('class');
                if (vText.match(/\d+\s*(kg|g|ml|l|mg)/i)) {
                    console.log(`  Variant Option Found: "${vText}" | Class: ${vClass}`);
                }
            }
        }
    } catch (err) {
        console.error(`Error inspecting ${storeName}:`, err);
    } finally {
        await browser.close();
    }
}

async function run() {
    await inspectVariants('https://www.petlove.com.br/busca?q=viva+verde', 'petlove');
    await inspectVariants('https://www.cobasi.com.br/pesquisa?terms=viva+verde', 'cobasi');
    await inspectVariants('https://www.petz.com.br/busca?q=viva+verde', 'petz');
}

run();
