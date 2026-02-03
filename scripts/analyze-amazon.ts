
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function analyze() {
    console.log('=== ANÁLISE DE PREÇOS AMAZON ===\n');

    // Últimos 10 preços Amazon
    const { data: amazonPrices } = await supabase
        .from('precos')
        .select('produto_id, preco, link_afiliado, ultima_atualizacao')
        .eq('loja', 'Amazon')
        .order('ultima_atualizacao', { ascending: false })
        .limit(10);

    if (!amazonPrices || amazonPrices.length === 0) {
        console.log('❌ NENHUM preço Amazon encontrado no banco!');
        return;
    }

    console.log(`Encontrados ${amazonPrices.length} preços Amazon recentes:\n`);

    for (const p of amazonPrices) {
        const { data: produto } = await supabase
            .from('produtos')
            .select('nome')
            .eq('id', p.produto_id)
            .single();

        console.log(`📦 Produto ID ${p.produto_id}: ${produto?.nome?.substring(0, 50) || 'Desconhecido'}`);
        console.log(`   💰 Preço: R$ ${p.preco?.toFixed(2) || 'N/A'}`);
        console.log(`   🔗 Link: ${p.link_afiliado?.substring(0, 100) || 'SEM LINK'}...`);
        console.log(`   📅 Atualizado: ${p.ultima_atualizacao}`);
        console.log('');
    }

    // Verificar se links são válidos
    console.log('\n=== VERIFICAÇÃO DE LINKS ===');
    for (const p of amazonPrices.slice(0, 3)) {
        if (p.link_afiliado) {
            const isAmznTo = p.link_afiliado.includes('amzn.to');
            const hasTag = p.link_afiliado.includes('tag=');
            console.log(`Link ${p.produto_id}: amzn.to=${isAmznTo}, tag=${hasTag}`);
        }
    }
}

analyze();
