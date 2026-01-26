
import { chromium } from 'playwright';
import fs from 'fs';

async function testStore(storeName: string, url: string, cardSelector: string, targetWeight: string) {
    const logFile = `${storeName}_full_inspect.log`;
    const log = (msg: string) => {
        console.log(msg);
        fs.appendFileSync(logFile, msg + '\n');
    };

    log(`\n--- Testing ${storeName} with target: ${targetWeight} ---`);
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });
    const page = await context.newPage();

    try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
        await page.waitForTimeout(5000);

        const cards = await page.$$(cardSelector);
        log(`Found ${cards.length} cards.`);

        for (let i = 0; i < Math.min(cards.length, 5); i++) {
            const card = await cards[i];
            const initialTitle = await card.innerText();
            log(`Card ${i} Initial Title: ${initialTitle.split('\n')[0]}...`);

            await card.hover().catch(() => log(`  Hover failed on card ${i}`));
            await page.waitForTimeout(1000);

            // Fetch all elements that look like weight buttons
            const options = await card.$$('button, span, a, div');
            log(`  Found ${options.length} inner elements.`);

            for (const opt of options) {
                const text = (await opt.innerText()).trim();
                const isWeight = text.match(/^\d+\s*(kg|g|ml|l|mg)$/i) || text.match(/^R\$\s*[\d,.]+$/);

                if (text.toLowerCase().includes(targetWeight.toLowerCase().replace(/\s/g, ''))) {
                    log(`  MATCHED VARIANT: "${text}"`);
                    const isVisible = await opt.isVisible();
                    log(`    Visible: ${isVisible}`);

                    if (isVisible) {
                        log(`    Clicking variant...`);
                        await opt.click({ force: true }).catch(err => log(`    Click Error: ${err.message}`));
                        await page.waitForTimeout(2000);
                        const newText = await card.innerText();
                        log(`    UPDATED CARD TEXT: ${newText.substring(0, 50).replace(/\n/g, ' ')}...`);
                    }
                }
            }
        }
        await page.screenshot({ path: `v3_test_${storeName}.png` });
    } catch (err) {
        log(`Error in ${storeName}: ${err.message}`);
    } finally {
        await browser.close();
    }
}

async function run() {
    await testStore('cobasi', 'https://www.cobasi.com.br/pesquisa?terms=viva+verde', '[class*="ProductCard"], article', '10 kg');
    await testStore('petlove', 'https://www.petlove.com.br/busca?q=viva+verde', '.product-card__content, [data-testid="product-card"]', '12kg');
}

run();
