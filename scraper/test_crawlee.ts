
import { PlaywrightCrawler } from 'crawlee';

async function main() {
    console.log("Testing PlaywrightCrawler...");
    const crawler = new PlaywrightCrawler({
        headless: true,
        maxRequestsPerCrawl: 3,
        requestHandler: async ({ page, request, log }) => {
            log.info(`Processing ${request.url}`);
            await page.waitForTimeout(1000);
            log.info(`Done ${request.url}`);
        },
    });

    await crawler.run(['https://example.com']);
    console.log("Crawler finished.");
}

main().catch(console.error);
