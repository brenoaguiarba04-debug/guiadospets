
import { chromium, Page } from 'playwright';

// Copying the exact logic from final_scraper_v2.ts for fidelity
async function handleCardVariants(card: any, targetWeight: string, page: Page) {
    if (targetWeight === 'N/A') return;

    console.log(`[Logic] Checking variants for target: ${targetWeight}`);
    try {
        // Hover
        await card.hover().catch(() => { });
        await page.waitForTimeout(500);

        const options = await card.$$('button, span, div, a');
        console.log(`[Logic] Found ${options.length} potential elements`);

        for (const opt of options) {
            const text = (await opt.innerText()).trim();
            // Debug text content
            if (text.length > 0 && text.length < 30) console.log(`[Debug] Option text: "${text}"`);

            // Simplified matching for test
            const match = text.toLowerCase().includes(targetWeight.toLowerCase().replace(/\s/g, ''));

            if (match) {
                const isVisible = await opt.isVisible();
                console.log(`[Logic] Match found: "${text}" | Visible: ${isVisible}`);
                if (isVisible) {
                    console.log(`[Logic] CLICKING variant: ${text}`);
                    await opt.click({ force: true }).catch((e) => console.log('Click error:', e.message));
                    await page.waitForTimeout(1500);
                    return true;
                }
            }
        }
    } catch (e: any) {
        console.log(`[Logic] Error: ${e.message}`);
    }
    return false;
}

async function run() {
    console.log("--- START VERIFICATION V2 (PETZ IS KEY) ---");
    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext();
    const page = await context.newPage();

    // Petz Test (Should work well)
    try {
        console.log("Testing Petz...");
        await page.goto('https://www.petz.com.br/busca?q=racao+golden+15kg', { timeout: 60000 });
        await page.waitForTimeout(6000);

        const cards = await page.$$('.product-card-wrapper, .product-item, [class*="card-product"]');
        console.log(`Petz: Found ${cards.length} cards`);

        if (cards.length > 0) {
            // Petz usually defaults to what we searched if specific, but let's try to find a variant
            // "15kg" might be the default.
            const targetWeight = '15kg';
            console.log(`Testing Card 0 with target ${targetWeight}`);
            await handleCardVariants(cards[0], targetWeight, page);
        }

    } catch (e) { console.error("Petz Fail:", e); }

    // Cobasi Test (Retry)
    try {
        console.log("\nTesting Cobasi...");
        await page.goto('https://www.cobasi.com.br/pesquisa?terms=racao+golden+15kg', { timeout: 60000 });
        await page.waitForTimeout(5000);

        const cards = await page.$$('[class*="ProductCard"], article');
        console.log(`Cobasi: Found ${cards.length} cards`);

        if (cards.length > 0) {
            const targetWeight = '15kg';
            console.log(`Testing Card 0 with target ${targetWeight}`);
            await handleCardVariants(cards[0], targetWeight, page);
        }

    } catch (e) { console.error("Cobasi Fail:", e); }

    await browser.close();
    console.log("--- DONE ---");
}

run();
