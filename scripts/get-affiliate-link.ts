import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function getAffiliateLink() {
    const { data } = await supabase
        .from('precos')
        .select('link_afiliado, produto_id')
        .eq('loja', 'Amazon')
        .not('link_afiliado', 'is', null)
        .limit(1)
        .single();

    if (!data) {
        console.log('Nenhum link Amazon encontrado no banco.');
        return;
    }

    const link = data.link_afiliado;

    // Extrair ASIN
    const asinMatch = link.match(/\/dp\/([A-Z0-9]+)/i);
    if (asinMatch && asinMatch[1]) {
        const asin = asinMatch[1];
        const affiliateLink = `https://www.amazon.com.br/dp/${asin}/?tag=petpromos0f-20`;
        console.log('\n===== LINK DE AFILIADO PARA TESTE =====');
        console.log(affiliateLink);
        console.log('========================================\n');
    } else {
        console.log('Link original (sem ASIN detectado):', link);
    }
}

getAffiliateLink();
