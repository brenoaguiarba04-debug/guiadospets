
import { chromium } from 'playwright';

async function debug() {
    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    });
    const page = await context.newPage();

    const url = 'https://www.cobasi.com.br/pesquisa?terms=Viva%20Verde';
    console.log(`Searching Cobasi...`);
    await page.goto(url, { waitUntil: 'load', timeout: 60000 });
    await page.waitForTimeout(5000);

    const cards = await page.$$('[class*="ProductCard"], article');
    for (const card of cards) {
        const text = await card.innerText();
        if (text.includes('Viva Verde')) {
            console.log(`Found Card: ${text.split('\n')[0]}`);
            const buttons = await card.$$('button, span, div');
            for (const b of buttons) {
                const bText = await b.innerText().catch(() => '');
                if (bText.includes('10') || bText.includes('12')) {
                    console.log(`Found weight button: ${bText}`);
                    await b.click({ force: true }).catch(() => { });
                    await page.waitForTimeout(3000);
                    const newText = await card.innerText();
                    console.log(`Price after klik:`, newText.match(/R\$\s*[\d.,]+/g));
                }
            }
        }
    }

    await browser.close();
}

debug().catch(console.error);
