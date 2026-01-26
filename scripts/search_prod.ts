import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function search() {
    const { data: products } = await supabase.from('produtos').select('id, nome');
    if (!products) return;

    const matches = products.filter(p => p.nome.toLowerCase().includes('viva verde'));
    console.log(matches);
}

search();
