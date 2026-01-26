import { PlaywrightCrawler } from 'crawlee';
import path from 'path';

// Dedicated script just for Logging In manually
async function runLoginHelper() {
    console.log("🔐 Starting Login Helper...");
    console.log("👉 The browser will open. Please LOG IN manually to Mercado Livre / Amazon.");
    console.log("👉 You have 5 minutes. The session will be saved automatically.");

    const crawler = new PlaywrightCrawler({
        headless: false, // Visible
        launchContext: {
            userDataDir: path.resolve(__dirname, 'browser_session'), // SAVE COOKIES HERE
        },
        requestHandlerTimeoutSecs: 300, // 5 MINUTES timeout
        maxConcurrency: 1,

        requestHandler: async ({ page, request, log }) => {
            log.info(`Opening ${request.url}...`);
            await page.goto(request.url);

            log.info("⏳ Waiting 5 minutes for you to log in... (Check the browser window)");
            await page.waitForTimeout(300000); // Wait 5 mins

            log.info(`Done with ${request.url}. Cookies saved.`);
        },
    });

    await crawler.run([
        'https://www.mercadolivre.com.br/jm/profile', // Direct login page often triggers login flow
        'https://www.amazon.com.br/your-account'
    ]);
}

runLoginHelper().catch(console.error);
