
import { chromium } from 'playwright';

async function analyze() {
    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    });
    const page = await context.newPage();

    console.log("Analyzing Petz Biscrok Card...");
    await page.goto('https://www.petz.com.br/busca?q=Biscrok%20Adulto', { waitUntil: 'load', timeout: 60000 });
    await page.waitForTimeout(5000);

    const cards = await page.$$('.product-card-wrapper, .product-item');
    if (cards.length > 0) {
        const card = cards[0];
        const html = await card.innerHTML();
        console.log("Card Interior HTML Sample:", html.slice(0, 500));

        // Find the plus button
        const plusButton = await card.$('.plus, [class*="plus"], button:has-text("+"), .add-to-cart');
        if (plusButton) {
            const selector = await plusButton.evaluate(el => {
                return {
                    tagName: el.tagName,
                    className: el.className,
                    id: el.id,
                    text: (el as HTMLElement).innerText
                };
            });
            console.log("Found Plus Button:", selector);

            console.log("Clicking Plus Button...");
            await plusButton.click({ force: true });
            await page.waitForTimeout(3000);

            // Check if a modal or variant list appeared
            const modalVisible = await page.isVisible('.modal, [class*="modal"], .variant-list, [class*="variant"]').catch(() => false);
            console.log("Modal/Variant list visible after click?", modalVisible);

            if (modalVisible) {
                await page.screenshot({ path: 'petz_modal_debug.png' });
                console.log("Modal screenshot saved.");
            }
        } else {
            console.log("No specific plus button found with guessed selectors.");
        }
    }

    await browser.close();
}

analyze().catch(console.error);
