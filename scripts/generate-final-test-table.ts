
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function generateFinalReport() {
    const ids = [112, 12, 178, 238, 221, 230, 169, 133, 41, 195];
    const { data: produtos } = await supabase
        .from('produtos')
        .select('id, nome')
        .in('id', ids);

    if (!produtos) return;

    let md = '\n# 📊 Relatório Final de Teste: 10 Produtos Aleatórios\n\n';
    md += '| Produto | Amazon | Shopee | Mercado Livre | Melhor |\n';
    md += '| :--- | :--- | :--- | :--- | :--- |\n';

    for (const p of produtos) {
        const { data: precos } = await supabase
            .from('precos')
            .select('loja, preco, link_afiliado')
            .eq('produto_id', p.id)
            .in('loja', ['Amazon', 'Shopee', 'Mercado Livre']);

        let amazon = '---';
        let shopee = '---';
        let ml = '---';
        let minPreco = Infinity;
        let melhorLoja = '';

        if (precos) {
            precos.forEach(pr => {
                const priceFormatted = `[R$ ${pr.preco.toFixed(2)}](${pr.link_afiliado})`;
                if (pr.loja === 'Amazon') {
                    amazon = priceFormatted;
                    if (pr.preco < minPreco) { minPreco = pr.preco; melhorLoja = 'Amazon'; }
                }
                if (pr.loja === 'Shopee') {
                    shopee = priceFormatted;
                    if (pr.preco < minPreco) { minPreco = pr.preco; melhorLoja = 'Shopee'; }
                }
                if (pr.loja === 'Mercado Livre') {
                    ml = priceFormatted;
                    if (pr.preco < minPreco) { minPreco = pr.preco; melhorLoja = 'Mercado Livre'; }
                }
            });
        }

        md += `| ${p.nome.substring(0, 50)} | ${amazon} | ${shopee} | ${ml} | **${melhorLoja || '---'}** |\n`;
    }

    console.log(md);
}

generateFinalReport();
