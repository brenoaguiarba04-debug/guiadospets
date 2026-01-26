
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function check() {
    process.stdout.write("STATS_START");
    const { count, error } = await supabase.from('historico_precos').select('*', { count: 'exact', head: true });
    if (error) console.error(error);
    else console.log(`COUNT:${count}`);
}
check();
