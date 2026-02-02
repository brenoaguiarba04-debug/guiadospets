import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { selectBestMatch } from './ollama';

puppeteer.use(StealthPlugin());

const args = process.argv.slice(2);
const isBatch = args.includes('--batch');
const limitIndex = args.indexOf('--limit');
const limit = limitIndex !== -1 ? parseInt(args[limitIndex + 1]) : null;


if (!isBatch && args.length === 0) {
    console.error('Uso: npx tsx scraper/amazon_scraper.ts "Nome do Produto" OU --batch --limit 20');
    process.exit(1);
}

// Add helper to pass product ID if needed, or query it
export async function scrapeAmazon(productName: string, productId?: number, supabaseClient?: any, browserInstance?: any) {
    console.log(`\n🔍 Buscando na Amazon por: "${productName}"...`);

    let browser = browserInstance;
    const isSharedBrowser = !!browserInstance;

    if (!browser) {
        browser = await puppeteer.launch({
            headless: false, // Necessário para SiteStripe e login inicial
            userDataDir: './scraper/amazon_session',
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--start-maximized'
            ],
            defaultViewport: null
        });
    }


    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    // Debug browser logs
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));

    try {
        // 1. Search
        await page.goto('https://www.amazon.com.br', { waitUntil: 'domcontentloaded', timeout: 30000 });

        // Wait a bit
        await new Promise(r => setTimeout(r, 2000));

        // Check for captcha
        const captcha = await page.$('input#captchacharacters');
        if (captcha) {
            console.log('⚠️ Captcha detectado! Por favor, resolva manualmente (modo headful ativado).');
            await page.waitForNavigation({ timeout: 60000 }); // Give user time to solve
        }

        await page.waitForSelector('#twotabsearchtextbox', { timeout: 10000 });
        await page.type('#twotabsearchtextbox', productName);
        await page.keyboard.press('Enter');

        console.log('Aguardando resultados...');
        try {
            await page.waitForSelector('[data-component-type="s-search-result"]', { timeout: 15000 });
        } catch (e) {
            console.log('Timeout esperando selector de resultados.');
        }

        // 2. Find best organic result using Ollama
        const targetLink = await page.evaluate(async () => {
            console.log('Iniciando evaluate...');
            const items = document.querySelectorAll('[data-component-type="s-search-result"]');
            console.log(`Encontrados ${items.length} itens.`);

            if (items.length === 0) return null;

            const candidates = [];

            for (const item of Array.from(items).slice(0, 8)) { // Scan top 8
                const titleEl = item.querySelector('h2');
                const title = titleEl?.textContent?.trim() || '';

                // Extrair ASIN diretamente do atributo data-asin do item
                const asin = item.getAttribute('data-asin');
                let link = '';

                if (asin && asin.length > 0) {
                    link = `https://www.amazon.com.br/dp/${asin}/`;
                }

                console.log(`PAGE LOG: Item: ${title.slice(0, 30)}... | ASIN: ${asin} | Link: ${!!link}`);

                // Extract Price from search result for context
                let price = 0;
                const priceWhole = item.querySelector('.a-price-whole');
                if (priceWhole) {
                    price = parseFloat(priceWhole.textContent?.replace(/\D/g, '') || '0');
                }

                if (title && link) {
                    candidates.push({ title, price, link });
                }
            }
            return candidates;

        });

        if (!targetLink || targetLink.length === 0) {
            console.log('❌ Nenhum produto encontrado.');
            await page.screenshot({ path: 'scripts/debug_search_fail.png' });
            await browser.close();
            return;
        }

        // Use Ollama to pick best match from NODE context (not browser)
        const candidates = targetLink.map((c: any, i: number) => ({ ...c, index: i }));
        const bestIndex = await selectBestMatch(candidates, productName);

        let chosenUrl = candidates[0].link; // Default to first
        if (bestIndex !== -1 && candidates[bestIndex]) {
            chosenUrl = candidates[bestIndex].link;
        } else if (bestIndex === -1) {
            console.log('⚠️ Ollama não encontrou match ideal. Usando o primeiro resultado.');
        }

        let finalAffiliateUrl = chosenUrl;
        console.log(`👉 Acessando produto: ${chosenUrl}`);


        await page.goto(chosenUrl, { waitUntil: 'networkidle2', timeout: 60000 });

        // Espera adicional para garantir que o SiteStripe carregue
        await new Promise(r => setTimeout(r, 3000));

        // Nova Lógica SiteStripe

        console.log('⏳ Aguardando barra SiteStripe...');
        let shortLink = '';
        try {
            // Múltiplos seletores possíveis para o botão de texto do SiteStripe
            const textLinkSelectors = [
                '#amzn-ss-text-link',
                'a[id*="ss-text"]',
                '.amzn-ss-link-item[data-link-type="text"]',
                '#amzn-ss-wrap a[href*="text"]'
            ];

            let clicked = false;
            for (const selector of textLinkSelectors) {
                try {
                    const el = await page.$(selector);
                    if (el) {
                        console.log(`🔍 Encontrado seletor: ${selector}`);
                        await el.click();
                        clicked = true;
                        break;
                    }
                } catch { /* ignora */ }
            }

            if (!clicked) {
                // Tenta encontrar qualquer link na barra do SiteStripe
                const ssWrap = await page.$('#amzn-ss-wrap');
                if (ssWrap) {
                    console.log('🔍 Barra SiteStripe encontrada, tentando clicar em "Text"...');
                    // Busca link que contenha "Text" no texto
                    const links = await page.$$('#amzn-ss-wrap a');
                    for (const link of links) {
                        const text = await link.evaluate((el: any) => el.textContent);
                        if (text && text.toLowerCase().includes('text')) {
                            await link.click();
                            clicked = true;
                            console.log('✅ Clicou em "Text" via texto do link');
                            break;
                        }
                    }
                }
            }

            if (clicked) {
                // Espera o popover com o link curto aparecer
                await new Promise(r => setTimeout(r, 2000));

                const textareaSelectors = [
                    '#amzn-ss-text-shortlink-textarea',
                    'textarea[id*="shortlink"]',
                    '#amzn-ss-text-shortlink-form textarea',
                    'input[id*="shortlink"]'
                ];

                for (const selector of textareaSelectors) {
                    try {
                        const el = await page.$(selector);
                        if (el) {
                            shortLink = await el.evaluate((e: any) => e.value || e.textContent);
                            if (shortLink && shortLink.includes('amzn.to')) {
                                console.log(`✅ Link curto capturado: ${shortLink}`);
                                finalAffiliateUrl = shortLink.trim();
                                break;
                            }
                        }
                    } catch { /* ignora */ }
                }
            }

            if (!shortLink) {
                console.log('⚠️ Não foi possível capturar o link curto do SiteStripe.');
            }
        } catch (e: any) {
            console.log(`⚠️ SiteStripe erro: ${e.message}`);
        }

        // Fallback para link formatado manualmente
        if (!shortLink || !shortLink.includes('amzn.to')) {
            if (process.env.AMAZON_AFFILIATE_TAG) {
                const asinMatch = chosenUrl.match(/\/(?:dp|gp\/product)\/([A-Z0-9]{10})/i);
                if (asinMatch) {
                    finalAffiliateUrl = `https://www.amazon.com.br/dp/${asinMatch[1]}/?tag=${process.env.AMAZON_AFFILIATE_TAG}`;
                    console.log(`🔗 Fallback: ${finalAffiliateUrl}`);
                }
            }
        }


        // Wait a bit for dynamic content
        await new Promise(r => setTimeout(r, 2000));


        const data = await page.evaluate(() => {
            const titleEl = document.querySelector('#productTitle') || document.querySelector('.qa-title-text');
            const title = titleEl ? titleEl.textContent?.trim() : 'Título não encontrado';

            let price = 0;
            // Tentar múltiplos seletores de preço
            const selectors = [
                '.a-price .a-offscreen',
                '#priceblock_ourprice',
                '#priceblock_dealprice',
                '.a-color-price',
                '.priceToPay',
                '.a-price-whole'
            ];

            for (const selector of selectors) {
                const el = document.querySelector(selector);
                if (el && el.textContent) {
                    const match = el.textContent.match(/R\$\s*([\d.,]+)/) || el.textContent.match(/([\d.,]+)/);
                    if (match) {
                        price = parseFloat(match[1].replace(/\./g, '').replace(',', '.'));
                        if (price > 0) break;
                    }
                }
            }

            // Variations
            const variationItems = document.querySelectorAll('#twister_feature_div ul li:not(.swatch-unavailable)');
            const variationTypes: string[] = [];
            document.querySelectorAll('#twister_feature_div div[id^="variation_"]').forEach(div => {
                const label = div.querySelector('.a-form-label');
                const options = div.querySelectorAll('ul li');
                if (label && options.length > 0) {
                    variationTypes.push(`${label.textContent?.trim()}: ${options.length} opções`);
                }
            });

            return {
                title,
                price,
                totalVariations: variationItems.length,
                variationDetails: variationTypes
            };
        });




        console.log('\n📦 Resultado do Scraping:');
        console.log('------------------------------------------------');
        console.log(`📌 Produto: ${data.title}`);
        console.log(`💰 Preço: R$ ${data.price.toFixed(2)}`);
        console.log(`🔢 Variações encontradas: ${data.totalVariations}`);
        if (data.variationDetails.length > 0) {
            console.log(`   Detalhes: ${data.variationDetails.join(', ')}`);
        }
        console.log('------------------------------------------------\n');

        // SAVE TO DB (UPSERT)
        if (productId && supabaseClient && data.price > 0) {
            const { data: existingPrice } = await supabaseClient
                .from('precos')
                .select('id')
                .eq('produto_id', productId)
                .eq('loja', 'Amazon')
                .single();

            if (existingPrice) {
                const { error } = await supabaseClient
                    .from('precos')
                    .update({
                        preco: data.price,
                        link_afiliado: finalAffiliateUrl,
                        ultima_atualizacao: new Date().toISOString()

                    })
                    .eq('id', existingPrice.id);
                if (error) console.error('❌ Erro ao atualizar no banco:', error);
                else console.log('🔄 Preço Amazon atualizado!');
            } else {
                const { error } = await supabaseClient
                    .from('precos')
                    .insert({
                        produto_id: productId,
                        loja: 'Amazon',
                        preco: data.price,
                        link_afiliado: finalAffiliateUrl,
                        ultima_atualizacao: new Date().toISOString()

                    });
                if (error) console.error('❌ Erro ao salvar no banco:', error);
                else console.log('💾 Novo preço Amazon salvo!');
            }
        }

    } catch (error) {
        console.error('❌ Erro durante o scraping:', error);
        try {
            if (page) {
                await page.screenshot({ path: 'scripts/debug_error.png' });
                console.log('📸 Screenshot salvo em scripts/debug_error.png');
            }
        } catch { /* ignora erro de screenshot */ }
    } finally {
        try {
            if (isSharedBrowser && page) {
                await page.close();
            } else if (!isSharedBrowser && browser) {
                await browser.close();
            }
        } catch { /* ignora erro de fechamento */ }
    }

}

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

if (isBatch) {
    (async () => {
        dotenv.config({ path: '.env.local' });
        const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

        console.log(`🚀 Iniciando Batch Amazon Scraper (Limit: ${limit || 'Todos'})...`);
        let query = supabase.from('produtos').select('*').order('id', { ascending: true });

        if (limit) {
            query = query.limit(limit);
        }

        const { data: products } = await query;


        if (!products || products.length === 0) { console.log('Nenhum produto.'); return; }

        // Launch shared browser for batch
        console.log('🚀 Iniciando Browser Compartilhado...');
        const browser = await puppeteer.launch({
            headless: false,
            userDataDir: './scraper/amazon_session',
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--start-maximized'
            ],
            defaultViewport: null
        });
        console.log('✅ Browser iniciado.');

        try {
            for (const p of products) {
                console.log(`🔄 Processando produto ID ${p.id}: ${p.nome}`);
                await scrapeAmazon(p.nome, p.id, supabase, browser);
            }
        } finally {

            await browser.close();
        }
    })();
} else {
    // Standalone mode - no DB save unless we add logic, but batch is priority
    const searchQuery = args.filter(a => a !== '--batch' && !args.includes('--limit') || (args.indexOf('--limit') !== args.indexOf(a) && args.indexOf('--limit') + 1 !== args.indexOf(a))).join(' ');
    // Better filter
    const cleanArgs = args.filter((a, i) => {
        if (a === '--batch') return false;
        if (a === '--limit') return false;
        if (i > 0 && args[i - 1] === '--limit') return false;
        return true;
    });
    scrapeAmazon(cleanArgs.join(' '));

}
