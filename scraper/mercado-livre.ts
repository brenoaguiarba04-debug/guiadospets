
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { selectBestMatch, ProductCandidate } from './ollama';

dotenv.config();
dotenv.config({ path: '.env.local' });

puppeteer.use(StealthPlugin());

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseKey) {
    console.error("❌ Credenciais do Supabase não encontradas. Verifique .env.local");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

export async function scrapeMercadoLivre() {
    console.log("🚀 Iniciando scraper do Mercado Livre...");

    // 1. Buscar produtos no banco
    const { data: produtos, error } = await supabase
        .from('produtos')
        .select('*');

    if (error || !produtos) {
        console.error("❌ Erro ao buscar produtos:", error);
        return;
    }

    console.log(`📦 Encontrados ${produtos.length} produtos para buscar.`);

    // 2. Iniciar navegador
    const browser = await puppeteer.launch({
        headless: true, // Alterar para true em produção
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });

    for (const produto of produtos) {
        const query = produto.palavras_chave || `${produto.nome} ${produto.marca || ''}`;
        console.log(`\n🔍 Buscando: "${produto.nome}"... (Query: ${query})`);

        try {
            // 3. Buscar no Mercado Livre
            const searchUrl = `https://lista.mercadolivre.com.br/${encodeURIComponent(query)}`;
            await page.goto(searchUrl, { waitUntil: 'domcontentloaded' });

            // Extrair candidatos (primeiros 10 resultados orgânicos para ter mais opções)
            const candidates: ProductCandidate[] = await page.evaluate(() => {
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

                    // Tentativa de extrair vendas (ex: "+10mil vendidos")
                    // Muitas vezes está em um span com texto
                    const itemsGroup = Array.from(item.querySelectorAll('.ui-search-item__group__element, .poly-reviews__total'));
                    let sales = 0;
                    for (const el of itemsGroup) {
                        const text = el.textContent?.trim().toLowerCase() || '';
                        if (text.includes('vendido')) {
                            // Extrair números, considerando "mil"
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

            if (candidates.length === 0) {
                console.log("⚠️ Nenhum produto encontrado no ML.");
                continue;
            }

            console.log(`🎲 Encontrados ${candidates.length} candidatos.`);

            console.log(`🎲 Encontrados ${candidates.length} candidatos.`);

            // 4. SELEÇÃO INTELIGENTE VIA GROQ AI
            const bestIndex = await selectBestMatch(candidates, query);

            if (bestIndex !== -1) {
                const best = candidates[bestIndex];
                console.log(`🏆 Eleito pela AI: R$ ${best.price} - ${best.title} (${best.sales} vendas)`);

                // 5. Salvar no Supabase
                const { error: insertError } = await supabase
                    .from('precos')
                    .insert({
                        produto_id: produto.id,
                        loja: 'Mercado Livre',
                        preco: best.price,
                        link_afiliado: best.link,
                        ultima_atualizacao: new Date().toISOString()
                    });

                if (insertError) {
                    console.error("❌ Erro ao salvar preço:", insertError);
                } else {
                    console.log("💾 Preço salvo com sucesso!");
                }
            } else {
                console.log("⏭️ Nenhum candidato correspondeu ao produto (AI Match Negativo).");
            }

        } catch (err) {
            console.error(`❌ Erro ao processar produto ${produto.id}:`, err);
        }

        // Delay aleatório para evitar bloqueio
        await new Promise(r => setTimeout(r, 2000 + Math.random() * 3000));
    }

    await browser.close();
    console.log("\n🏁 Scraper finalizado!");
}

if (require.main === module || process.argv[1].endsWith('mercado-livre.ts')) {
    scrapeMercadoLivre();
}
