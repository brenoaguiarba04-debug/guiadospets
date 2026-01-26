
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY! // Use service role to bypass RLS if needed
);

async function fetchAll() {
    console.log("Fetching all products from Supabase...");
    const { data, error, count } = await supabase
        .from('produtos')
        .select('*', { count: 'exact' });

    if (error) {
        console.error("Error fetching:", error);
        return;
    }

    console.log(`✅ Found ${count} products.`);
    if (data) {
        // Save to file for the orchestrator
        const fs = require('fs');
        fs.writeFileSync(path.resolve(__dirname, 'mass_update_list.json'), JSON.stringify(data, null, 2));
        console.log("💾 List saved to scraper/mass_update_list.json");
    }
}

fetchAll();
