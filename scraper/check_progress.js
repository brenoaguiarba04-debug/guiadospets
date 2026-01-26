
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkProgress() {
    const today = new Date().toISOString().split('T')[0];

    // Count distinct products that have at least one price updated today
    const { data, error, count } = await supabase
        .from('precos')
        .select('produto_id', { count: 'exact', head: false })
        .gte('ultima_atualizacao', today);

    if (error) {
        console.error('Error checking progress:', error);
        return;
    }

    const uniqueProducts = new Set(data.map(p => p.produto_id));
    console.log(`Total prices updated today: ${data.length}`);
    console.log(`Unique products processed: ${uniqueProducts.size}`);

    // Total products in DB
    const { count: totalProducts } = await supabase
        .from('produtos')
        .select('*', { count: 'exact', head: true });

    console.log(`Total products in catalog: ${totalProducts}`);
}

checkProgress();
