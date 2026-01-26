import { chromium } from 'playwright';

async function diagnose() {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    });

    const queries = {
        amazon: `https://www.amazon.com.br/s?k=${encodeURIComponent("Areia Viva Verde 4kg")}`,
        ml_asc: `https://lista.mercadolivre.com.br/viva-verde-4kg_O_price_asc`,
        ml_normal: `https://lista.mercadolivre.com.br/viva-verde-4kg`
    };

    for (const [key, url] of Object.entries(queries)) {
        console.log(`\n=== DIAGNOSING ${key.toUpperCase()} ===`);
        const page = await context.newPage();
        try {
            await page.goto(url, { waitUntil: 'load', timeout: 60000 });
            await page.waitForTimeout(5000);

            if (key === 'amazon') {
                const results = await page.$$('[data-component-type="s-search-result"]');
                console.log(`Found ${results.length} Amazon products`);
                for (let i = 0; i < Math.min(results.length, 10); i++) {
                    const title = await results[i].$eval('h2', el => el.innerText).catch(() => 'N/A');
                    const link = await results[i].$eval('a.a-link-normal', (el: any) => el.href).catch(() => 'N/A');
                    const asin = await results[i].getAttribute('data-asin');
                    console.log(`[Result ${i + 1}] Title: ${title}`);
                    console.log(`           Link: ${link}`);
                    console.log(`           ASIN: ${asin}`);
                }
            } else {
                // Mercado Livre
                const results = await page.$$('.ui-search-result__wrapper, .poly-card, .ui-search-layout__item');
                console.log(`Found ${results.length} Mercado Livre products on ${key}`);
                for (let i = 0; i < Math.min(results.length, 15); i++) {
                    const text = await results[i].innerText().catch(() => 'N/A');
                    const link = await results[i].$eval('a', (el: any) => el.href).catch(() => 'N/A');
                    const isBestSeller = text.includes("MAIS VENDIDO") || text.includes("Mais vendido");
                    // Extract price from text
                    const prices = text.match(/R\$\s?[\d.,]+/g) || [];
                    console.log(`[Result ${i + 1}] ${isBestSeller ? '[BEST] ' : ''}${text.substring(0, 80).replace(/\n/g, ' ')}... | Price: ${prices[0] || 'N/A'}`);
                    console.log(`           Link: ${link}`);
                }
            }
        } catch (e) {
            console.log(`Error: ${e}`);
        } finally {
            await page.close();
        }
    }
    await browser.close();
}

diagnose();
