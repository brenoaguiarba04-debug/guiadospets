import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import readline from 'readline';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

async function exportLinks() {
    console.log('🔍 Buscando links do Mercado Livre que precisam de afiliação...');

    const { data: precos, error } = await supabase
        .from('precos')
        .select('id, link_afiliado')
        .eq('loja', 'Mercado Livre')
        .like('link_afiliado', 'https://%') // Links diretos começam com https
        .not('link_afiliado', 'like', '%mercadolivre.com/sec/%') // Ignorar já encurtados
        .not('link_afiliado', 'like', '%/social/%'); // Ignorar já sociais

    if (error) {
        console.error('❌ Erro ao buscar:', error.message);
        return;
    }

    if (!precos || precos.length === 0) {
        console.log('✅ Nenhum link novo encontrado.');
        return;
    }

    console.log(`\n📋 COPIE A LISTA ABAIXO E COLE NO PAINEL DO ML:\n`);
    console.log(precos.map(p => p.link_afiliado).join('\n'));
    console.log(`\nTotal: ${precos.length} links.`);
}

async function importLinks() {
    console.log('\n📥 AGUARDANDO LINKS ENCURTADOS...');
    console.log('Cole os links gerados pelo Mercado Livre abaixo (um por linha).');
    console.log('Pressione Ctrl+D (ou Ctrl+C) quando terminar.\n');

    const lines: string[] = [];
    rl.on('line', (line) => {
        if (line.trim()) lines.push(line.trim());
    });

    rl.on('close', async () => {
        if (lines.length === 0) {
            console.log('Nenhum link fornecido.');
            process.exit(0);
        }

        console.log(`\n🔄 Processando ${lines.length} links...`);

        // Busca os mesmos preços do export para bater a ordem
        // Nota: Assumindo que a ordem de geração no painel do ML é a mesma da colagem.
        const { data: precos } = await supabase
            .from('precos')
            .select('id, link_afiliado')
            .eq('loja', 'Mercado Livre')
            .like('link_afiliado', 'https://%')
            .not('link_afiliado', 'like', '%mercadolivre.com/sec/%')
            .not('link_afiliado', 'like', '%/social/%');

        if (!precos) {
            console.log('❌ Erro ao recuperar registros para atualização.');
            process.exit(1);
        }

        let atualizados = 0;
        for (let i = 0; i < Math.min(precos.length, lines.length); i++) {
            const { error } = await supabase
                .from('precos')
                .update({ link_afiliado: lines[i] })
                .eq('id', precos[i].id);

            if (!error) atualizados++;
        }

        console.log(`✨ Sincronização finalizada! ${atualizados} links atualizados com sucesso.`);
        process.exit(0);
    });
}

const mode = process.argv.includes('--import') ? 'import' : 'export';

if (mode === 'export') {
    exportLinks().then(() => process.exit(0));
} else {
    importLinks();
}
