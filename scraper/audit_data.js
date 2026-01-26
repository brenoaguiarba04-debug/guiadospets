
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function runAudit() {
    const today = new Date().toISOString().split('T')[0];
    const { data: products } = await supabase.from('produtos').select('id, nome');
    const { data: prices } = await supabase
        .from('precos')
        .select('*')
        .gte('ultima_atualizacao', today);

    const report = products.map(product => {
        const pPrices = prices.filter(p => p.produto_id === product.id);
        if (pPrices.length < 2) return null;

        const values = pPrices.map(p => p.preco);
        const min = Math.min(...values);
        const max = Math.max(...values);

        return {
            name: product.nome,
            diff: (max - min).toFixed(2),
            ratio: (max / min).toFixed(2),
            prices: pPrices.map(p => ({ store: p.loja, price: p.preco, link: p.link_afiliado }))
        };
    }).filter(r => r && (parseFloat(r.ratio) > 1.4 || parseFloat(r.diff) > 70));

    fs.writeFileSync('audit_report.json', JSON.stringify(report, null, 2));
    console.log(`Audit complete. Found ${report.length} suspicious items.`);
}

runAudit();
