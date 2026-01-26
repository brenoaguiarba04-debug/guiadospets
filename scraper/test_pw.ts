import { chromium } from 'playwright';

(async () => {
    try {
        console.log("Launching browser...");
        const browser = await chromium.launch({ headless: true });
        console.log("Browser launched. New page...");
        const page = await browser.newPage();
        console.log("Navigating...");
        await page.goto('http://example.com');
        console.log("Page title:", await page.title());
        await browser.close();
        console.log("Done.");
    } catch (e) {
        console.error("Playwright failed:", e);
    }
})();
