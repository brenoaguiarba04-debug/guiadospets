import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function run() {
    const { data: produtos } = await supabase
        .from('produtos')
        .select('id, nome, precos(*)')
        .order('id', { ascending: true })
        .limit(10);

    if (!produtos) return;

    console.log('| Produto | Mercado Livre (Preço) | Link ML | Shopee (Preço) | Link Shopee |');
    console.log('| :--- | :--- | :--- | :--- | :--- |');

    produtos.forEach(p => {
        const ml = p.precos.find((pr: any) => pr.loja === 'Mercado Livre');
        const shopee = p.precos.find((pr: any) => pr.loja === 'Shopee');

        const mlPrice = ml ? `R$ ${ml.preco.toFixed(2)}` : 'N/A';
        const shopeePrice = shopee ? `R$ ${shopee.preco.toFixed(2)}` : 'N/A';

        const mlLink = ml ? `[Link](${ml.link_afiliado})` : '-';
        const shopeeLink = shopee ? `[Link](${shopee.link_afiliado})` : '-';

        console.log(`| ${p.nome} | ${mlPrice} | ${mlLink} | ${shopeePrice} | ${shopeeLink} |`);
    });
}

run();
