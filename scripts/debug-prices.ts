
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function debugPrices() {
    // Pegar os IDs do último teste
    const testIds = [112, 12, 178, 238, 221, 230, 169, 133, 41, 195];

    console.log('=== ANÁLISE DETALHADA DOS PREÇOS CAPTURADOS ===\n');

    for (const id of testIds) {
        const { data: produto } = await supabase
            .from('produtos')
            .select('id, nome')
            .eq('id', id)
            .single();

        if (!produto) continue;

        console.log(`\n📦 ID ${id}: ${produto.nome.substring(0, 60)}...`);
        console.log('-'.repeat(80));

        const { data: precos } = await supabase
            .from('precos')
            .select('loja, preco, link_afiliado, ultima_atualizacao')
            .eq('produto_id', id)
            .in('loja', ['Amazon', 'Shopee', 'Mercado Livre'])
            .order('ultima_atualizacao', { ascending: false });

        if (!precos || precos.length === 0) {
            console.log('   ❌ NENHUM PREÇO ENCONTRADO para Amazon/Shopee/ML');
        } else {
            for (const p of precos) {
                const linkPreview = p.link_afiliado ? p.link_afiliado.substring(0, 80) : 'SEM LINK';
                console.log(`   [${p.loja}] R$ ${p.preco?.toFixed(2) || '???'}`);
                console.log(`      Link: ${linkPreview}...`);
                console.log(`      Atualizado: ${p.ultima_atualizacao}`);
            }
        }
    }
}

debugPrices();
