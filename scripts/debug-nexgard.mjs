import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const envPath = path.resolve(__dirname, '../.env.local')

let SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
let SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8')
    const urlMatch = envContent.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)
    const keyMatch = envContent.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)
    if (urlMatch) SUPABASE_URL = urlMatch[1].trim()
    if (keyMatch) SUPABASE_SERVICE_ROLE_KEY = keyMatch[1].trim()
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

async function main() {
    console.log('🔍 LISTANDO PRODUTOS NEXGARD')
    console.log('============================\n')

    const { data: produtos } = await supabase
        .from('produtos')
        .select('*')
        .ilike('nome', '%nexgard%')
        .order('nome')

    console.log(`Encontrados ${produtos.length} produtos Nexgard:\n`)

    produtos.forEach(p => {
        console.log(`[${p.id}] "${p.nome}"`)
        // console.log(`   IMG: ${p.imagem_url ? 'Sim' : 'Não'}`)
    })
}

main().catch(console.error)
