
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function finalStats() {
    const today = new Date().toISOString().split('T')[0];

    // Get all products
    const { data: allProducts } = await supabase.from('produtos').select('id, nome');

    // Get all prices updated today
    const { data: todayPrices } = await supabase
        .from('precos')
        .select('produto_id, loja, preco')
        .gte('ultima_atualizacao', today);

    const processedIds = new Set(todayPrices.map(p => p.produto_id));
    const missing = allProducts.filter(p => !processedIds.has(p.id));

    console.log(`Total Products: ${allProducts.length}`);
    console.log(`Products with at least one price TODAY: ${processedIds.size}`);
    console.log(`Products with NO price found TODAY: ${missing.length}`);

    if (missing.length > 0) {
        console.log("\nSome missing examples:");
        missing.slice(0, 5).forEach(m => console.log(`- ${m.nome}`));
    }
}

finalStats();
