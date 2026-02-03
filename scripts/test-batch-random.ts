
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { spawn } from 'child_process';
import chalk from 'chalk';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function runScript(command: string, args: string[], name: string, color: any) {
    console.log(color(`🚀 [${name}] Iniciando...`));
    const child = spawn(command, args, { stdio: 'inherit', shell: true });
    return new Promise((resolve) => {
        child.on('close', (code) => {
            console.log(color(`🏁 [${name}] Finalizado com código ${code}`));
            resolve(code);
        });
    });
}

async function runTest() {
    console.log(chalk.bold.white('🎲 Buscando 10 produtos aleatórios no banco de dados...'));

    // 1. Pegar IDs aleatórios usando uma query simples
    // Como Supabase não tem ORDER BY RANDOM() fácil via JS client sem RPC,
    // vamos pegar todos os IDs e sortear no JS (considerando que são poucos produtos, ~400)
    const { data: allIds } = await supabase.from('produtos').select('id');
    if (!allIds || allIds.length === 0) {
        console.error('❌ Nenhum produto encontrado no banco.');
        return;
    }

    const shuffled = allIds.sort(() => 0.5 - Math.random());
    const selectedIds = shuffled.slice(0, 10).map(p => p.id);
    const idsString = selectedIds.join(',');

    console.log(chalk.green(`✅ IDs selecionados: ${idsString}`));

    // 2. Rodar scrapers em paralelo
    console.log(chalk.bold.cyan('\n⚡ Iniciando scrapers concorrentes para os 10 produtos...\n'));

    const promises = [
        runScript('npx', ['tsx', 'scraper/amazon_scraper.ts', '--batch', '--ids', idsString], 'AMAZON', chalk.cyan),
        runScript('npx', ['tsx', 'scraper/mercado-livre.ts', '--ids', idsString], 'ML', chalk.yellow),
        runScript('npx', ['tsx', 'scraper/shopee.ts', '--ids', idsString], 'SHOPEE', chalk.rgb(255, 100, 0))
    ];

    await Promise.all(promises);

    console.log(chalk.bold.green('\n✅ Todos os scrapers finalizaram! Gerando relatório final...\n'));

    // 3. Gerar Tabela Final
    await generateFinalReport(selectedIds);
}

async function generateFinalReport(ids: number[]) {
    const { data: produtos } = await supabase
        .from('produtos')
        .select('id, nome')
        .in('id', ids);

    if (!produtos) return;

    let md = '\n# 📊 Relatório de Teste: Preços e Links de Afiliado (10 Randômicos)\n\n';
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

runTest();
