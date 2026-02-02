
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import Table from 'cli-table3';
import chalk from 'chalk';

dotenv.config();
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function runTest() {
    console.log(chalk.cyan('🚀 Buscando produtos que JÁ POSSUEM PREÇOS cadastrados...'));

    // Buscamos apenas produtos que têm pelo menos um preço associado
    // LIMITANDO a 20 para o teste
    const { data: precos } = await supabase
        .from('precos')
        .select(`
            preco,
            loja,
            link_afiliado,
            produto_id,
            produtos (nome)
        `)
        .order('ultima_atualizacao', { ascending: false })
        .limit(60); // Pegamos mais para agrupar

    if (!precos || precos.length === 0) {
        console.error(chalk.red('❌ Nenhum preço encontrado no banco.'));
        return;
    }

    // Agrupar por produto
    const produtosMap = new Map();

    precos.forEach((p: any) => {
        if (!p.produtos) return;
        const nome = p.produtos.nome;
        if (!produtosMap.has(nome)) {
            produtosMap.set(nome, {
                nome: nome,
                ml: null,
                shopee: null,
                amazon: null
            });
        }
        const item = produtosMap.get(nome);
        if (p.loja === 'Mercado Livre') item.ml = { preco: p.preco, link: p.link_afiliado };
        if (p.loja === 'Shopee') item.shopee = { preco: p.preco, link: p.link_afiliado };
        if (p.loja === 'Amazon') item.amazon = { preco: p.preco, link: p.link_afiliado };
    });

    const produtos = Array.from(produtosMap.values()).slice(0, 20);

    const table = new Table({
        head: [
            chalk.blue('Produto'),
            chalk.yellow('ML'),
            chalk.yellow('Shopee'),
            chalk.yellow('Amazon')
        ],
        colWidths: [40, 25, 25, 25]
    });

    produtos.forEach(p => {
        const format = (store: any) => {
            if (!store) return chalk.red('N/A');
            return `${chalk.green('R$ ' + store.preco.toFixed(2))}\n${chalk.gray(store.link.slice(0, 20))}...`;
        };

        table.push([
            p.nome.slice(0, 38),
            format(p.ml),
            format(p.shopee),
            format(p.amazon)
        ]);
    });

    console.log(table.toString());
}

runTest();
