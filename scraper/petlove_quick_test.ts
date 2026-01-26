import { chromium, Page } from 'playwright';
import { selectBestMatch } from './ollama';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

// Mimic the logic from final_scraper.ts
function simplifyQuery(term: string): string {
    const clean = term.replace(/[^\w\s\u00C0-\u00FF.]/g, ' ').replace(/\b\d+\s*x\b/gi, '').replace(/\s+/g, ' ').trim();
    return clean.split(' ').slice(0, 7).join(' ');
}

function normalizePrice(priceText: string | undefined): number {
    if (!priceText) return 0;
    const match = priceText.match(/[\d.,]+/);
    if (!match) return 0;
    let clean = match[0].replace(/\s/g, '');
    if (clean.includes('.') && clean.includes(',')) return parseFloat(clean.replace(/\./g, '').replace(',', '.'));
    if (clean.includes(',') && !clean.includes('.')) return parseFloat(clean.replace(',', '.'));
    return parseFloat(clean);
}

async function testPetloveOnly() {
    console.log("=== STARTING PETLOVE SINGLE TEST ===");
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        viewport: { width: 1280, height: 720 },
        extraHTTPHeaders: {
            'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
        }
    });
    const page = await context.newPage();

    // Using a common product for testing
    const productName = "NexGard Spectra 3.6 a 7.5kg";
    const targetWeight = "7.5kg";
    const query = simplifyQuery(productName);
    const url = `https://www.petlove.com.br/busca?q=${encodeURIComponent(query)}`;

    console.log(`Searching: ${productName}`);
    console.log(`URL: ${url}`);

    try {
        await page.goto(url, { waitUntil: 'load', timeout: 60000 });
        await page.waitForTimeout(5000); // Wait for scripts/content

        // JSON-LD STRATEGY (DEBUG VERSION)
        const debugData: any = await page.evaluate(() => {
            const scripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));
            const logs: string[] = [];
            let result: any[] = [];

            scripts.forEach((script, i) => {
                try {
                    const json = JSON.parse(script.textContent || '{}');
                    const type = json['@type'];
                    logs.push(`Script ${i}: @type=${type}`);

                    if (type === 'ItemList' && json.itemListElement) {
                        result = json.itemListElement.map((item: any) => ({
                            title: item.item?.name || item.name,
                            link: item.item?.url || item.url,
                            price: item.item?.offers?.lowPrice || item.offers?.lowPrice || 0
                        }));
                    }
                } catch (e) { logs.push(`Script ${i}: Parse Error`); }
            });
            return { result, logs };
        });

        console.log("JSON-LD Logs:", debugData.logs);
        const candidates = debugData.result;
        console.log(`Found ${candidates.length} candidates in JSON-LD.`);

        if (candidates.length > 0) {
            console.log("Candidates:");
            candidates.slice(0, 3).forEach((c, i) => console.log(`  ${i}: ${c.title} - R$ ${c.price}`));

            // LLM MATCH
            console.log("Asking LLM for best match...");
            const bestIndex = await selectBestMatch(candidates, productName);
            console.log(`LLM pick index: ${bestIndex}`);

            if (bestIndex !== -1) {
                const best = candidates[bestIndex];
                console.log(`SELECTED: ${best.title} at ${best.link}`);

                // VISIT PDP to verify price extraction
                console.log("Visiting PDP...");
                await page.goto(best.link.startsWith('http') ? best.link : `https://www.petlove.com.br${best.link}`, { waitUntil: 'load' });
                await page.waitForTimeout(3000);

                const pdpPrice = await page.evaluate(() => {
                    const sel = ['.price-current', '[data-testid="price-current"]', '.product-price', '.price-now'];
                    for (const s of sel) {
                        const el = document.querySelector(s);
                        if (el && /R\$/i.test(el.textContent || '')) return el.textContent;
                    }
                    return null;
                });

                console.log(`PDP Price Text detected: ${pdpPrice}`);
                console.log(`Normalized Price: R$ ${normalizePrice(pdpPrice || '')}`);
            }
        } else {
            console.log("FAILED: No candidates found via JSON-LD.");
            // DEBUG: Save HTML to see why
            const fs = require('fs');
            fs.writeFileSync('petlove_test_fail.html', await page.content());
        }

    } catch (e) {
        console.error("Test failed:", e);
    } finally {
        await browser.close();
    }
}

testPetloveOnly();
