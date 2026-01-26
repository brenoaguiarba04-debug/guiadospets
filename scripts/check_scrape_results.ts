import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function checkResults() {
    console.log("----------------------------------------");
    console.log("📊 CHECKING LATEST SCRAPER ACTIVITY");
    console.log("----------------------------------------");

    // 1. Fetch latest 10 price updates
    const { data: prices, error: priceError } = await supabase
        .from('precos')
        .select(`
            preco,
            loja,
            ultima_atualizacao,
            produtos (nome)
        `)
        .order('ultima_atualizacao', { ascending: false })
        .limit(10);

    if (priceError) {
        console.error("❌ Error fetching prices:", priceError.message);
    } else {
        if (!prices || prices.length === 0) {
            console.log("⚠️ No prices found in DB.");
        } else {
            console.log(`✅ Found recent price updates! (Latest: ${new Date(prices[0].ultima_atualizacao).toLocaleString()})`);
            console.log("Top 5 recent updates:");
            prices.slice(0, 5).forEach(p => {
                // handle joined relation if possible, or just print what we have
                const prodName = Array.isArray(p.produtos) ? p.produtos[0]?.nome : (p.produtos as any)?.nome || 'Unknown Product';
                console.log(`- [${p.loja}] R$ ${p.preco} - ${prodName}`);
            });
        }
    }

    console.log("\n----------------------------------------");

    // 2. Fetch latest errors
    const { data: errors, error: errError } = await supabase
        .from('scraper_errors')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(5);

    if (errError) {
        // Table might not exist if no errors ever occurred
        console.log("ℹ️ No errors logged (or table missing).");
    } else {
        if (errors.length > 0) {
            console.log(`❌ Latest Errors (${errors.length} found):`);
            errors.forEach(e => {
                console.log(`- [${e.loja}] ${e.erro}`);
            });
        } else {
            console.log("✅ No errors found in logs!");
        }
    }
    console.log("----------------------------------------");
}

checkResults();
