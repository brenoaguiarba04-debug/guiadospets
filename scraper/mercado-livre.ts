
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

async function scrapeMercadoLivre() {
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

            // FILTRAGEM E SELEÇÃO INTELIGENTE

            // 1. Normalizar query para palavras-chave obrigatórias
            // Remove palavras comuns (stop words) se necessário, mas por enquanto vamos usar a query limpa
            const cleanQuery = query.toLowerCase().replace(/[^a-z0-9 ]/g, '');
            const queryWords = cleanQuery.split(' ').filter((w: string) => w.length > 2); // Palavras com > 2 letras

            // Função para verificar Match
            const checkMatch = (productTitle: string) => {
                const cleanTitle = productTitle.toLowerCase().replace(/[^a-z0-9 ]/g, '');
                // Verifica se TODAS as palavras chaves principais da query estão no título (AND logic strict)
                // Para ser mais flexível, podemos exigir 75% de match ou palavras específicas (Marca)

                // Estratégia Híbrida:
                // Se o produto tem marca definida no banco, ELA DEVE ESTAR NO TÍTULO.
                if (produto.marca) {
                    const brand = produto.marca.toLowerCase();
                    if (!cleanTitle.includes(brand)) return false;
                }

                // Verifica overlap de palavras
                let matches = 0;
                for (const word of queryWords) {
                    if (cleanTitle.includes(word)) matches++;
                }

                // Pelo menos 2/3 das palavras devem bater
                return matches >= Math.ceil(queryWords.length * 0.6);
            };

            const validCandidates = candidates.filter(c => checkMatch(c.title));

            if (validCandidates.length > 0) {
                console.log(`✅ ${validCandidates.length} candidatos passaram no filtro de nome.`);

                // sorting: Priorizar menor preço, mas desempate com vendas?
                // O usuário quer "Melhor avaliado com melhor preço".
                // Vamos ordenar por Preço ASC. 
                // Se houver produtos com preço muito próximo, pegamos o que tem mais vendas.

                validCandidates.sort((a, b) => {
                    // Se a diferença de preço for maior que 10%, o preço manda.
                    const priceDiffPercent = Math.abs(a.price - b.price) / Math.min(a.price, b.price);
                    if (priceDiffPercent > 0.1) {
                        return a.price - b.price; // Menor preço vence
                    }
                    // Se preço é similar, vence quem tem mais vendas
                    const salesDiff = (b.sales || 0) - (a.sales || 0);
                    if (salesDiff !== 0) return salesDiff;

                    // Se vendas são iguais (ou zero), o mais barato vence
                    return a.price - b.price;
                });

                const best = validCandidates[0];
                console.log(`🏆 Eleito: R$ ${best.price} - ${best.title} (${best.sales} vendas)`);

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
                console.log("⏭️ Nenhum candidato passou no filtro de nome (Match rigoroso).");
                console.log("Query words:", queryWords);
                console.log("Candidato 1:", candidates[0]?.title);
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

scrapeMercadoLivre();
