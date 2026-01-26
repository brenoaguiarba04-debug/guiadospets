import { chromium } from 'playwright';

export async function discoverStoreAPI(searchUrl: string) {
    console.log(`\n🔍 Discovering API endpoints for: ${searchUrl}`);
    console.log('   (This will open a browser window and sniff network traffic...)');

    const browser = await chromium.launch({
        headless: false,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();

    // Store potential APIs found
    const potentialApis: Set<string> = new Set();

    // Listen to network requests
    page.on('response', async (response) => {
        const url = response.url();
        const type = response.request().resourceType();
        const method = response.request().method();

        // Filter for interesting requests (XHR/Fetch, JSON responses)
        if (
            (type === 'fetch' || type === 'xhr') &&
            method === 'GET' &&
            (url.includes('api') || url.includes('search') || url.includes('catalog') || url.includes('graphql'))
        ) {
            try {
                // Peek at response to see if it looks like product data
                const text = await response.text();
                if (text.startsWith('{') || text.startsWith('[')) {
                    // It's JSON-like
                    if (text.includes('product') || text.includes('price') || text.includes('nome')) {
                        console.log(`\n📦 FOUND POTENTIAL API:`);
                        console.log(`   URL: ${url}`);
                        console.log(`   Method: ${method}`);
                        console.log(`   Sample (truncated): ${text.slice(0, 150)}...`);
                        potentialApis.add(url);
                    }
                }
            } catch (e) {
                // Ignore read errors (redirects etc)
            }
        }
    });

    try {
        await page.goto(searchUrl, { waitUntil: 'networkidle', timeout: 30000 });
        console.log(`\n⏳ Waiting 5 seconds for any lazy-loaded requests...`);
        await page.waitForTimeout(5000);

        // Scroll to trigger more requests
        await page.evaluate(() => window.scrollBy(0, 500));
        await page.waitForTimeout(2000);

    } catch (e) {
        console.error('Error navigating:', e);
    }

    await browser.close();

    if (potentialApis.size === 0) {
        console.log('\n❌ No obvious product APIs found. The site might be using Server Side Rendering (SSR) only.');
    } else {
        console.log(`\n✨ Scan complete. Found ${potentialApis.size} potential endpoints.`);
    }
}

// Allow running directly
if (require.main === module) {
    const target = process.argv[2] || 'https://www.petz.com.br/busca?q=racao';
    discoverStoreAPI(target).catch(console.error);
}
