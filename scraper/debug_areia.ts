
import { chromium } from 'playwright';
import path from 'path';

async function capture() {
    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    });
    const page = await context.newPage();

    console.log("Searching Petlove for 'Viva Verde'...");
    await page.goto('https://www.petlove.com.br/busca?q=Viva%20Verde', { waitUntil: 'load', timeout: 60000 });
    await page.waitForTimeout(5000);
    await page.screenshot({ path: path.resolve(__dirname, 'areia_viva_petlove.png') });

    console.log("Searching Cobasi for 'Viva Verde'...");
    await page.goto('https://www.cobasi.com.br/pesquisa?terms=Viva%20Verde', { waitUntil: 'load', timeout: 60000 });
    await page.waitForTimeout(5000);
    await page.screenshot({ path: path.resolve(__dirname, 'areia_viva_cobasi.png') });

    await browser.close();
}

capture().catch(console.error);
