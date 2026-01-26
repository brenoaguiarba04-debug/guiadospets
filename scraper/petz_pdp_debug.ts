
import { chromium } from 'playwright';
import path from 'path';

async function capture() {
    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    });
    const page = await context.newPage();

    console.log("Navigating to Petz Biscrok PDP...");
    // Use the link from search
    const url = 'https://www.petz.com.br/produto/biscoito-pedigree-biscrok-multi-para-caes-adultos-128221';
    await page.goto(url, { waitUntil: 'load', timeout: 60000 });
    await page.waitForTimeout(5000);

    // Check for variants
    const options = await page.$$('button, span, div, label, p, a');
    console.log("Checking variants on PDP...");
    for (const opt of options) {
        const txt = await opt.innerText().catch(() => '');
        if (txt.includes('500') || txt.includes('1 kg')) {
            console.log("Found weight-like element:", txt);
        }
    }

    await page.screenshot({ path: path.resolve(__dirname, 'petz_pdp_final.png') });
    console.log("Screenshot saved.");

    await browser.close();
}

capture().catch(console.error);
