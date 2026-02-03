
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkProgress() {
    const ids = [112, 12, 178, 238, 221, 230, 169, 133, 41, 195];

    const { data: precos } = await supabase
        .from('precos')
        .select('produto_id, loja, ultima_atualizacao')
        .in('produto_id', ids);

    console.log('--- PROGRESSO NO BANCO ---');
    console.log(`Preços encontrados: ${precos?.length || 0}`);

    const stats: any = {};
    precos?.forEach(p => {
        if (!stats[p.produto_id]) stats[p.produto_id] = [];
        stats[p.produto_id].push(p.loja);
    });

    console.log(JSON.stringify(stats, null, 2));
}

checkProgress();
