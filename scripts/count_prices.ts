import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function count() {
    const { count: precoCount, error: precoError } = await supabase
        .from('precos')
        .select('*', { count: 'exact', head: true });

    const { count: produtoCount, error: produtoError } = await supabase
        .from('produtos')
        .select('*', { count: 'exact', head: true });

    if (precoError || produtoError) {
        console.error('Error fetching count:', precoError || produtoError);
        return;
    }

    console.log(`Total produtos: ${produtoCount}`);
    console.log(`Total prices: ${precoCount}`);
}

count();
