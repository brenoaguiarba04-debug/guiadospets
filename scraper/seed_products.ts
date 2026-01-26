
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function seed() {
    const products = [
        { id: 1001, nome: 'Areia Viva Verde Grãos Finos 4kg', categoria: 'Gatos', marca: 'Viva Verde' },
        { id: 1002, nome: 'Ração Golden Special Cães Adultos Frango e Carne 15kg', categoria: 'Cães', marca: 'Golden' },
        { id: 1003, nome: 'Nexgard 25 a 50kg', categoria: 'Farmácia', marca: 'Nexgard' },
        { id: 1004, nome: 'Simparic 10 a 20kg', categoria: 'Farmácia', marca: 'Simparic' },
        { id: 1005, nome: 'Ração Quatree Supreme Gatos Castrados Frango e Batata Doce 10kg', categoria: 'Gatos', marca: 'Quatree' }
    ];

    console.log("Seeding products...");
    const { error } = await supabase.from('produtos').upsert(products); // Upsert handles update/insert

    if (error) {
        console.error("Error seeding:", error);
    } else {
        console.log("✅ Products seeded successfully.");
    }
}

seed();
