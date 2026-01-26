
import { chromium } from 'playwright';
import path from 'path';

async function capture() {
    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        viewport: { width: 1280, height: 1200 }
    });
    const page = await context.newPage();

    console.log("Checking Cobasi...");
    await page.goto('https://www.cobasi.com.br/pesquisa?terms=Biscrok%20Adulto', { waitUntil: 'load', timeout: 60000 });
    await page.waitForTimeout(5000);
    await page.screenshot({ path: path.resolve(__dirname, 'debug_cobasi_biscrok.png') });
    console.log("Cobasi screenshot saved.");

    console.log("Checking Petlove...");
    await page.goto('https://www.petlove.com.br/busca?q=Biscrok%20Adulto', { waitUntil: 'load', timeout: 60000 });
    await page.waitForTimeout(5000);
    await page.screenshot({ path: path.resolve(__dirname, 'debug_petlove_biscrok.png') });
    console.log("Petlove screenshot saved.");

    console.log("Checking Petz...");
    await page.goto('https://www.petz.com.br/busca?q=Biscrok%20Adulto', { waitUntil: 'load', timeout: 60000 });
    await page.waitForTimeout(5000);
    await page.screenshot({ path: path.resolve(__dirname, 'debug_petz_biscrok.png') });
    console.log("Petz screenshot saved.");

    await browser.close();
}

capture().catch(console.error);
