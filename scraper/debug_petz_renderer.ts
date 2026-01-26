
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

(async () => {
    console.log("=== DEBUG PETZ RENDERER ===");
    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        viewport: { width: 1366, height: 768 } // Standard desktop
    });
    const page = await context.newPage();

    const query = "Ração Golden Special Cães Adultos";
    const url = `https://www.petz.com.br/busca?q=${encodeURIComponent(query)}`;

    console.log(`Navigating to: ${url}`);

    // 1. Go to page
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });

    // 2. Wait explicitly for what SHOULD be there
    console.log("Waiting for network idle...");
    await page.waitForLoadState('networkidle');

    // 3. Take immediate screenshot
    await page.screenshot({ path: 'debug_petz_initial.png', fullPage: true });

    // 4. Try scroll to trigger lazy load
    console.log("Scrolling...");
    await page.evaluate(() => window.scrollBy(0, 500));
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'debug_petz_scrolled.png', fullPage: true });

    // 5. Dump HTML
    const html = await page.content();
    fs.writeFileSync('debug_petz_source.html', html);
    console.log("Saved debug_petz_source.html");

    // 6. Check for product selectors
    const cardCount = await page.locator('.product-card-wrapper, .product-item, [class*="card-product"], li.li-product').count();
    console.log(`Detected Product Cards: ${cardCount}`);

    // Interact to see if it wakes up
    if (cardCount === 0) {
        console.log("Attempting interaction to wake up page...");
        await page.mouse.move(100, 100);
        await page.mouse.move(200, 200);
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2));
        await page.waitForTimeout(2000);
        await page.screenshot({ path: 'debug_petz_interacted.png' });
    }

    await browser.close();
})();
