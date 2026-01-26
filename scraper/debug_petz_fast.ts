
import { chromium } from 'playwright';
import fs from 'fs';

(async () => {
    console.log("=== DEBUG PETZ FAST ===");
    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        viewport: { width: 1366, height: 768 }
    });
    const page = await context.newPage();

    const query = "Ração Golden Special Cães Adultos";
    const url = `https://www.petz.com.br/busca?q=${encodeURIComponent(query)}`;

    console.log(`Navigating to: ${url}`);

    // 1. Go to page (domcontentloaded only)
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

    // 2. Fixed wait
    console.log("Waiting 5s...");
    await page.waitForTimeout(5000);

    // 3. Take screenshot
    await page.screenshot({ path: 'debug_petz_fast_initial.png', fullPage: true });

    // 4. Counts
    const cardCount = await page.locator('.product-card-wrapper, .product-item, [class*="card-product"], li.li-product').count();
    console.log(`Detected Product Cards: ${cardCount}`);

    // 5. HTML Dump
    const html = await page.content();
    fs.writeFileSync('debug_petz_fast_source.html', html);
    console.log("Saved HTML.");

    await browser.close();
})();
