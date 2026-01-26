import { chromium } from 'playwright';

async function testPetlove() {
    console.log("Starting Petlove Debug...");
    const browser = await chromium.launch({ headless: true }); // Headless true for speed, change if needed
    const page = await browser.newPage();

    // Test product
    const query = "Ração Golden Special Cães Adultos Frango e Carne 15kg";
    const url = `https://www.petlove.com.br/busca?q=${encodeURIComponent(query)}`;

    console.log(`Navigating to: ${url}`);
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(5000);

    // Snapshot html for inspection
    // console.log(await page.content());

    // Check selectors
    const cards = await page.$$('.product-card__content, [data-testid="product-card"], article');
    console.log(`Found ${cards.length} cards.`);

    if (cards.length > 0) {
        const first = cards[0];
        console.log("First card text:", await first.innerText());
        const link = await first.$eval('a', el => el.href).catch(e => "No link");
        console.log("First card link:", link);
    } else {
        console.log("Selectors might be outdated. Taking screenshot...");
        await page.screenshot({ path: 'debug_petlove_fail.png' });
    }

    await browser.close();
}

testPetlove();
