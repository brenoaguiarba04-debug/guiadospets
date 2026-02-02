import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function generateTable() {
    const { data: produtos } = await supabase
        .from('produtos')
        .select('id, nome, categoria')
        .or('categoria.ilike.%Antipulgas%,categoria.ilike.%Medicamento%,categoria.ilike.%Vermífugo%')
        .limit(12);

    if (!produtos) return;

    let md = '| Produto | Amazon | Shopee | Mercado Livre | Melhor |\n';
    md += '| :--- | :--- | :--- | :--- | :--- |\n';

    for (const p of produtos) {
        const { data: precos } = await supabase
            .from('precos')
            .select('loja, preco')
            .eq('produto_id', p.id)
            .in('loja', ['Amazon', 'Shopee', 'Mercado Livre']);

        let amazon = '---';
        let shopee = '---';
        let ml = '---';
        let minPreco = Infinity;
        let melhorLoja = '';

        if (precos) {
            precos.forEach(pr => {
                if (pr.loja === 'Amazon') {
                    amazon = `R$ ${pr.preco.toFixed(2)}`;
                    if (pr.preco < minPreco) { minPreco = pr.preco; melhorLoja = 'Amazon'; }
                }
                if (pr.loja === 'Shopee') {
                    shopee = `R$ ${pr.preco.toFixed(2)}`;
                    if (pr.preco < minPreco) { minPreco = pr.preco; melhorLoja = 'Shopee'; }
                }
                if (pr.loja === 'Mercado Livre') {
                    ml = `R$ ${pr.preco.toFixed(2)}`;
                    if (pr.preco < minPreco) { minPreco = pr.preco; melhorLoja = 'Mercado Livre'; }
                }
            });
        }

        md += `| ${p.nome.substring(0, 50)} | ${amazon} | ${shopee} | ${ml} | **${melhorLoja || '---'}** |\n`;
    }

    console.log(md);
}

generateTable();
