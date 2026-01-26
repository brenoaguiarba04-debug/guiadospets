import { PlaywrightCrawler } from 'crawlee';
import { processWithLocalLLM } from './ollama';
import { supabase } from '../src/lib/supabase';
import dotenv from 'dotenv';
import path from 'path';

// Load env vars (try both locations)
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const crawler = new PlaywrightCrawler({
    // Headless: false makes it look like a real browser (helper for local scraping)
    headless: false,

    // Try to evade detection
    browserPoolOptions: {
        useFingerprints: true,
    },

    requestHandler: async ({ page, request, log }) => {
        log.info(`Processing ${request.url}...`);

        try {
            await page.waitForSelector('h1', { timeout: 10000 });
            // Wait for price to be visible if possible, or just grab body
            const rawBody = await page.evaluate(() => document.body.innerText);

            // 1. Process with AI
            log.info(`Sending content to Ollama...`);
            // Limit context to avoid overload/timeout, but grab enough for Qwen
            const products = await processWithLocalLLM(rawBody.slice(0, 6000));

            if (products && products.length > 0) {
                log.info(`Extracted ${products.length} products`);

                for (const data of products) {
                    if (!data.nome) continue;

                    log.info(`Processing: ${data.nome} - R$ ${data.preco}`);

                    // 2. Save to Supabase
                    const { data: existing } = await supabase
                        .from('produtos')
                        .select('id, nome')
                        .ilike('nome', data.nome)
                        .maybeSingle();

                    let productId;

                    if (existing) {
                        productId = existing.id;
                    } else {
                        const { data: newProd, error } = await supabase
                            .from('produtos')
                            .insert({
                                nome: data.nome,
                                marca: data.marca || 'Genérico',
                                imagem_url: '',
                                created_at: new Date().toISOString()
                            })
                            .select()
                            .single();

                        if (error) {
                            log.error(`Supabase Insert Error: ${error.message}`);
                            continue;
                        }
                        productId = newProd.id;
                    }

                    // Detect Store from URL
                    let loja = 'Outra';
                    if (request.url.includes('petz.com')) loja = 'Petz';
                    else if (request.url.includes('cobasi.com')) loja = 'Cobasi';
                    else if (request.url.includes('petlove.com')) loja = 'Petlove';
                    else if (request.url.includes('mercadolivre.com')) loja = 'Mercado Livre';
                    else if (request.url.includes('amazon.com')) loja = 'Amazon';

                    // Insert Price
                    if (data.preco > 0) {
                        const { error: priceError } = await supabase.from('precos').insert({
                            produto_id: productId,
                            preco: data.preco,
                            loja: loja,
                            link_afiliado: request.url,
                            ultima_atualizacao: new Date().toISOString()
                        });

                        if (priceError) {
                            log.error(`Supabase Price Error: ${priceError.message}`);
                        } else {
                            log.info(`Price saved successfully for ${loja}.`);
                        }
                    }
                }
            } else {
                log.warning('Models returned empty list or invalid data.');
            }
        } catch (e) {
            log.error(`Failed to process ${request.url}: ${e}`);
        }
    },
    failedRequestHandler: ({ request, log }) => {
        log.error(`Request ${request.url} failed too many times.`);
    },
});

async function main() {
    console.log('Starting scraper for multiple stores...');
    await crawler.run([
        // Petz
        'https://www.petz.com.br/produto/racao-golden-special-para-caes-adultos-sabor-frango-e-carne-106622',
        // Cobasi
        'https://www.cobasi.com.br/racao-golden-formula-caes-adultos-frango-arroz-3660309/p',
        // Petlove
        'https://www.petlove.com.br/racao-golden-special-para-caes-adultos-frango-e-carne/p',
        // Mercado Livre (Exemplo de busca/produto)
        'https://produto.mercadolivre.com.br/MLB-1823906663-racao-golden-special-adultos-frango-carne-15kg-_JM',
        // Amazon (Exemplo)
        'https://www.amazon.com.br/Rao-Golden-Special-Adultos-Frango/dp/B0753L7Z6J'
    ]);
    console.log('Done!');
}

main().catch(console.error);
