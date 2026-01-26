import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function count() {
    const { count, error } = await supabase
        .from('precos')
        .select('*', { count: 'exact', head: true });

    if (error) {
        console.error('Error fetching count:', error);
        return;
    }

    const { data: latest } = await supabase
        .from('precos')
        .select('*')
        .order('ultima_atualizacao', { ascending: false })
        .limit(5);

    console.log(`Total prices: ${count}`);
    console.log('Latest prices:', latest);
}

count();
