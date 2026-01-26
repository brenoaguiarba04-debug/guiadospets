
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function check() {
    const ids = [
        '1001',
        '1002',
        '1003',
        '1004',
        '1005'
    ];

    console.log("=== SCRAPING RESULTS ===");

    for (const id of ids) {
        const { data: prod } = await supabase.from('produtos').select('nome, imagem_url').eq('id', id).single();
        console.log(`\n📦 Product: ${prod?.nome || id}`);
        console.log(`🖼️ Image: ${prod?.imagem_url || 'N/A'}`);

        const { data: prices } = await supabase.from('precos')
            .select('loja, preco, link_afiliado')
            .eq('produto_id', id)
            .order('preco', { ascending: true });

        if (prices && prices.length > 0) {
            prices.forEach(p => {
                console.log(`   - ${p.loja.padEnd(12)}: R$ ${p.preco.toFixed(2)} | [Link](${p.link_afiliado})`);
            });
        } else {
            console.log("   (No prices found)");
        }
    }
}

check();
