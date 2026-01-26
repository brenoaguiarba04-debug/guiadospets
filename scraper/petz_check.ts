
import { chromium } from 'playwright';
import path from 'path';

async function capture() {
    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        viewport: { width: 1280, height: 1200 }
    });
    const page = await context.newPage();

    console.log("Checking Petz 1kg...");
    await page.goto('https://www.petz.com.br/busca?q=Biscrok%20Adulto%201kg', { waitUntil: 'load', timeout: 60000 });
    await page.waitForTimeout(5000);
    await page.screenshot({ path: path.resolve(__dirname, 'petz_1kg_final.png') });

    console.log("Checking Petz 500g...");
    await page.goto('https://www.petz.com.br/busca?q=Biscrok%20Adulto%20500g', { waitUntil: 'load', timeout: 60000 });
    await page.waitForTimeout(5000);
    await page.screenshot({ path: path.resolve(__dirname, 'petz_500g_final.png') });

    await browser.close();
}

capture().catch(console.error);
