import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function verify() {
    const id = 1;
    const { data: product } = await supabase.from('produtos').select('*').eq('id', id).single();
    if (!product) { console.log("Product not found"); return; }

    console.log(`Verifying ID ${id}: ${product.nome}`);
    const { data: precos_before } = await supabase.from('precos').select('*').eq('produto_id', id);
    console.log(`Prices before: ${precos_before?.length || 0}`);

    console.log("Mocking insert...");
    const { data, error } = await supabase.from('precos').insert({
        produto_id: id,
        preco: Math.random() * 100 + 100,
        loja: 'TestStore',
        link_afiliado: 'http://test.com',
        ultima_atualizacao: new Date().toISOString()
    }).select();

    if (error) {
        console.error("Insert failed:", error.message);
    } else {
        console.log("Insert success:", data);
        // Clean up
        await supabase.from('precos').delete().eq('id', data[0].id);
        console.log("Cleanup success");
    }
}

verify().catch(console.error);
