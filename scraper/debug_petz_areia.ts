
import { chromium } from 'playwright';

async function debug() {
    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    });
    const page = await context.newPage();

    const url = 'https://www.petz.com.br/produto/areia-higienica-viva-verde-graos-mistos-para-gatos-128221';
    console.log(`Navigating to ${url}...`);
    await page.goto(url, { waitUntil: 'load', timeout: 60000 });
    await page.waitForTimeout(5000);

    const options = await page.$$('button, span, div, label, li, a');
    console.log(`Found ${options.length} potential option elements.`);

    for (const opt of options) {
        const txt = await opt.innerText().catch(() => '');
        if (txt.toLowerCase().includes('kg') || txt.toLowerCase().includes('g')) {
            const isVisible = await opt.isVisible();
            console.log(`Option: "${txt.replace(/\n/g, ' ')}" | Visible: ${isVisible}`);

            if (txt.includes('10 kg') || txt.includes('10kg')) {
                console.log("MATCH! Attempting to click 10kg...");
                await opt.scrollIntoViewIfNeeded();
                await opt.click({ force: true }).catch(err => console.log("Click failed:", err.message));
                await page.waitForTimeout(5000);

                const bodyText = await page.innerText('body');
                const prices = bodyText.match(/R\$\s*[\d.,]+/g);
                console.log("Prices after click:", prices?.slice(0, 5));
                break;
            }
        }
    }

    await browser.close();
}

debug().catch(console.error);
