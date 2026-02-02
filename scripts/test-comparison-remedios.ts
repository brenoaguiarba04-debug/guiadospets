import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import chalk from 'chalk';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function runTest() {
    console.log(chalk.bold.magenta('\n💊 TESTE DE PREÇOS: REMÉDIOS (ML vs SHOPEE vs AMAZON)'));
    console.log(chalk.gray('========================================================\n'));

    // 1. Buscar produtos de categorias de remédios
    const { data: produtos, error: prodError } = await supabase
        .from('produtos')
        .select('id, nome, categoria')
        .or('categoria.ilike.%Antipulgas%,categoria.ilike.%Medicamento%,categoria.ilike.%Vermífugo%')
        .limit(15);

    if (prodError || !produtos) {
        console.error('Erro ao buscar produtos:', prodError);
        return;
    }

    const tableData = [];

    // Cabeçalho manual
    console.log(
        chalk.bold.white('PRODUTO'.padEnd(50)) +
        chalk.bold.cyan('AMAZON'.padEnd(15)) +
        chalk.bold.rgb(255, 100, 0)('SHOPEE'.padEnd(15)) +
        chalk.bold.yellow('ML'.padEnd(15)) +
        chalk.bold.green('MELHOR')
    );
    console.log('-'.repeat(105));

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
                    if (pr.preco < minPreco) { minPreco = pr.preco; melhorLoja = 'ML'; }
                }
            });
        }

        const nome = p.nome.substring(0, 48).padEnd(50);
        console.log(
            nome +
            amazon.padEnd(15) +
            shopee.padEnd(15) +
            ml.padEnd(15) +
            (melhorLoja ? chalk.green(melhorLoja) : '---')
        );
    }

    console.log('\n✅ Teste finalizado!');
}

runTest();
