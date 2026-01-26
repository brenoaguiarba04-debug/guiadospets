import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function checkPrecos() {
    console.log("Checking products...");
    const { data: products } = await supabase.from('produtos').select('id, nome').limit(3);

    if (!products) {
        console.log("No products found.");
        return;
    }

    for (const p of products) {
        console.log(`\nProduct: ${p.nome} (ID: ${p.id})`);
        const { data: precos } = await supabase
            .from('precos')
            .select('*')
            .eq('produto_id', p.id)
            .order('ultima_atualizacao', { ascending: false });

        if (precos && precos.length > 0) {
            console.table(precos.slice(0, 10).map(pr => ({
                loja: pr.loja,
                preco: pr.preco,
                atualizacao: pr.ultima_atualizacao
            })));
        } else {
            console.log("No prices found.");
        }
    }
}

checkPrecos().catch(console.error);
