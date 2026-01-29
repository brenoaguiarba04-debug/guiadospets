
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());

async function testLogic() {
    console.log("🚀 Iniciando verificação da nova lógica...");
    const query = "areia viva verde 4kg";
    console.log(`\n🔍 Query: "${query}"`);

    const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });

    const searchUrl = `https://lista.mercadolivre.com.br/${encodeURIComponent(query)}`;
    await page.goto(searchUrl, { waitUntil: 'domcontentloaded' });

    // CÓDIGO COPIADO DA LÓGICA DE PRODUÇÃO PARA TESTE
    const candidates = await page.evaluate(() => {
        const items = Array.from(document.querySelectorAll('li.ui-search-layout__item')).slice(0, 10);
        return items.map((item, index) => {
            let title = item.querySelector('h2.ui-search-item__title')?.textContent?.trim();
            if (!title) title = item.querySelector('h3.ui-search-item__title')?.textContent?.trim();
            if (!title) title = item.querySelector('.ui-search-item__title')?.textContent?.trim();
            if (!title) title = item.querySelector('.poly-component__title')?.textContent?.trim();
            if (!title) title = "Título não encontrado";

            const priceWhole = item.querySelector('.andes-money-amount__fraction')?.textContent?.trim() || '0';
            const priceCents = item.querySelector('.andes-money-amount__cents')?.textContent?.trim() || '00';
            const price = parseFloat(`${priceWhole.replace(/\./g, '')}.${priceCents}`);

            const link = item.querySelector('a.ui-search-link')?.getAttribute('href') ||
                item.querySelector('a')?.getAttribute('href') || '';

            const itemsGroup = Array.from(item.querySelectorAll('.ui-search-item__group__element, .poly-reviews__total'));
            let sales = 0;
            for (const el of itemsGroup) {
                const text = el.textContent?.trim().toLowerCase() || '';
                if (text.includes('vendido')) {
                    let multiplier = 1;
                    if (text.includes('mil')) multiplier = 1000;
                    const num = parseFloat(text.replace(/\D/g, '') || '0');
                    sales = num * multiplier;
                    break;
                }
            }

            return { index, title, price, link, sales: sales || 0 };
        });
    });

    console.log(`🎲 Candidatos encontrados: ${candidates.length}`);
    candidates.forEach(c => console.log(`[${c.index}] R$ ${c.price} (Sales: ${c.sales}) - ${c.title}`));

    // LÓGICA DE FILTRAGEM
    const cleanQuery = query.toLowerCase().replace(/[^a-z0-9 ]/g, '');
    const queryWords = cleanQuery.split(' ').filter(w => w.length > 2);

    const checkMatch = (productTitle) => {
        const cleanTitle = productTitle.toLowerCase().replace(/[^a-z0-9 ]/g, '');
        // Mock da marca: Viva Verde (assumindo que sabemos a marca da query)
        if (cleanTitle.includes('viva verde')) {
            // force strict match on brand if known
        }

        let matches = 0;
        for (const word of queryWords) {
            if (cleanTitle.includes(word)) matches++;
        }
        return matches >= Math.ceil(queryWords.length * 0.6);
    };

    const validCandidates = candidates.filter(c => checkMatch(c.title));

    if (validCandidates.length > 0) {
        console.log(`\n✅ ${validCandidates.length} candidatos passaram no filtro de nome.`);

        validCandidates.sort((a, b) => {
            const priceDiffPercent = Math.abs(a.price - b.price) / Math.min(a.price, b.price);
            if (priceDiffPercent > 0.1) {
                return a.price - b.price;
            }
            return b.sales - a.sales;
        });

        const best = validCandidates[0];
        console.log(`🏆 VENCEDOR: R$ ${best.price} - ${best.title} (${best.sales} vendas)`);
    } else {
        console.log("\n❌ NENHUM candidato passou no filtro.");
    }

    await browser.close();
}

testLogic();
