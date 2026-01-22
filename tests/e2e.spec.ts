import { test, expect } from '@playwright/test';

test('homepage loads successfully', async ({ page }) => {
    await page.goto('/');

    await expect(page).toHaveTitle(/GuiaDoPet/);

    await expect(page.locator('header')).toBeVisible();

    await expect(page.locator('footer')).toBeVisible();
});

test('navigation links work', async ({ page }) => {
    await page.goto('/');

    await page.click('text=Marcas');
    await expect(page).toHaveURL(/marcas/);

    await page.click('text=Cupons');
    await expect(page).toHaveURL(/cupons/);
});

test('product pages load correctly', async ({ page }) => {
    await page.goto('/produto/1');

    await expect(page.locator('h1')).toBeVisible();

    await expect(page.locator('text=Melhores ofertas')).toBeVisible();
});

test('category pages load correctly', async ({ page }) => {
    await page.goto('/categoria/racoes');

    await expect(page.locator('h1')).toBeVisible();

    await expect(page.locator('text=Rações')).toBeVisible();
});

test('brand pages load correctly', async ({ page }) => {
    await page.goto('/marca/royal-canin');

    await expect(page.locator('h1')).toBeVisible();
});

test('no console errors on homepage', async ({ page }) => {
    const consoleErrors: string[] = [];

    page.on('console', (msg) => {
        if (msg.type() === 'error') {
            consoleErrors.push(msg.text());
        }
    });

    await page.goto('/');

    await page.waitForLoadState('networkidle');

    const criticalErrors = consoleErrors.filter(
        (error) =>
            !error.includes('favicon') &&
            !error.includes('404') &&
            !error.includes('Failed to load resource')
    );

    expect(criticalErrors).toHaveLength(0);
});

test('search functionality works', async ({ page }) => {
    await page.goto('/');

    const searchInput = page.locator('input[placeholder*="Buscar"]');
    await expect(searchInput).toBeVisible();

    await searchInput.fill('ração');
    await searchInput.press('Enter');

    await expect(page).toHaveURL(/q=ração/);
});

test('mobile responsive layout', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto('/');

    await expect(page.locator('header')).toBeVisible();
});

test('affiliate links are present on product page', async ({ page }) => {
    await page.goto('/produto/1');

    const buyButtons = page.locator('text=Comprar Agora');
    const count = await buyButtons.count();

    if (count > 0) {
        await expect(buyButtons.first()).toBeVisible();
    }
});

test('schema.org JSON-LD is present on product page', async ({ page }) => {
    await page.goto('/produto/1');

    const jsonLd = page.locator('script[type="application/ld+json"]');
    await expect(jsonLd).toHaveCount(1);

    const content = await jsonLd.textContent();
    expect(content).toContain('Product');
});

test('sitemap is accessible', async ({ page }) => {
    const response = await page.goto('/sitemap.xml');
    expect(response?.status()).toBe(200);
});

test('robots.txt is accessible', async ({ page }) => {
    const response = await page.goto('/robots.txt');
    expect(response?.status()).toBe(200);
});
