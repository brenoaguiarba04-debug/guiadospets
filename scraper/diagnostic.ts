import { chromium } from 'playwright';

async function diagnose() {
    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    });

    const product = "Areia Viva Verde Grãos Finos 4kg";
    const queries = {
        petz: `https://www.petz.com.br/busca?q=${encodeURIComponent("Areia Viva Verde 4kg")}`,
        petlove: `https://www.petlove.com.br/busca?q=${encodeURIComponent("Areia Viva Verde 4kg")}`,
        cobasi: `https://www.cobasi.com.br/pesquisa?terms=${encodeURIComponent("Areia Viva Verde 4kg")}`,
        amazon: `https://www.amazon.com.br/s?k=${encodeURIComponent("Areia Viva Verde 4kg")}`,
        mercadolivre: `https://lista.mercadolivre.com.br/${encodeURIComponent("Areia Viva Verde 4kg")}`
    };

    for (const [store, url] of Object.entries(queries)) {
        console.log(`\n=== DIAGNOSING ${store.toUpperCase()} ===`);
        const page = await context.newPage();
        try {
            await page.goto(url, { waitUntil: 'load', timeout: 60000 });
            await page.waitForTimeout(5000);

            // Capture first card HTML and all prices
            let container = "";
            if (store === 'petz') container = '.product-card-wrapper, .product-item';
            if (store === 'petlove') container = '.product-card__content, [data-testid="product-card"]';
            if (store === 'cobasi') container = '[class*="ProductCard"], [class*="product-card"]';
            if (store === 'amazon') container = '[data-component-type="s-search-result"]';
            if (store === 'mercadolivre') container = '.ui-search-result__wrapper, .poly-card';

            const cards = await page.$$(container);
            if (cards.length > 0) {
                const card = cards[0];
                const text = await card.innerText();
                const html = await card.innerHTML();
                const link = await card.$eval('a', (el: any) => el.href).catch(() => 'NOT_FOUND');

                console.log(`[LINK] ${link}`);
                console.log(`[TEXT] ${text.replace(/\n/g, ' | ')}`);
                console.log(`[HTML Snippet] ${html.slice(0, 1000)}`);

                // Find all price-like strings
                const prices = text.match(/R\$\s?[\d.,]+/g) || [];
                console.log(`[DETECTED PRICES] ${prices.join(', ')}`);

                if (store === 'petz') {
                    const jsonEl = await card.$('.jsonGa');
                    if (jsonEl) console.log(`[JSON GA] ${await jsonEl.textContent()}`);
                }
            } else {
                console.log("No cards found for " + store);
                await page.screenshot({ path: `debug_${store}_fail.png` });
            }
        } catch (e) {
            console.log(`Error diagnosing ${store}: ${e}`);
        } finally {
            await page.close();
        }
    }

    await browser.close();
}

diagnose();
