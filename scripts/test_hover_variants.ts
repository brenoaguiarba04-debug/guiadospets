
import { chromium } from 'playwright';

async function testStore(storeName: string, url: string, cardSelector: string, targetWeight: string) {
    console.log(`\n--- Testing ${storeName} with target: ${targetWeight} ---`);
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });
    const page = await context.newPage();

    try {
        await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
        await page.waitForTimeout(3000);

        const cards = await page.$$(cardSelector);
        console.log(`Found ${cards.length} cards.`);

        for (let i = 0; i < Math.min(cards.length, 3); i++) {
            const card = cards[i];
            const initialTitle = await card.innerText();
            console.log(`Card ${i} Initial: ${initialTitle.split('\n')[0]}...`);

            // Hover to reveal variants if necessary
            await card.hover();
            await page.waitForTimeout(1000);

            // Find all buttons or clickable spans/divs inside the card
            const options = await card.$$('button, span, div, a');
            for (const opt of options) {
                const text = await opt.innerText();
                if (text.toLowerCase().includes(targetWeight.toLowerCase())) {
                    console.log(`  Targeting variant: "${text}"`);
                    try {
                        await opt.click({ force: true });
                        await page.waitForTimeout(2000);
                        const updatedText = await card.innerText();
                        console.log(`  Post-Click Text (first 100 chars): ${updatedText.substring(0, 100).replace(/\n/g, ' ')}`);
                    } catch (e) {
                        console.log(`  Failed to click "${text}": ${e.message}`);
                    }
                }
            }
        }
        await page.screenshot({ path: `v2_test_${storeName}.png` });
    } catch (err) {
        console.error(`Error in ${storeName}:`, err.message);
    } finally {
        await browser.close();
    }
}

async function run() {
    // Testing Cobasi
    await testStore('cobasi', 'https://www.cobasi.com.br/pesquisa?terms=viva+verde', '[class*="ProductCard"], article', '10 kg');

    // Testing Petlove
    await testStore('petlove', 'https://www.petlove.com.br/busca?q=viva+verde', '.product-card__content, [data-testid="product-card"]', '12kg');
}

run();
