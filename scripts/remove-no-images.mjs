/**
 * Script para verificar validade das imagens via HTTP Check
 */

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

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
})

// Função para checar URL
async function checkUrl(url) {
    try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 3000) // 3s timeout

        const res = await fetch(url, {
            method: 'HEAD',
            signal: controller.signal,
            headers: {
                // Simula browser para evitar bloqueio simples
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        })
        clearTimeout(timeoutId)
        return res.status
    } catch (e) {
        return 0 // Error (timeout, dns, etc)
    }
}

async function main() {
    console.log('📡 VERIFICAÇÃO DE CONECTIVIDADE DE IMAGENS')
    console.log('==========================================\n')

    const { data: produtos } = await supabase
        .from('produtos')
        .select('id, nome, imagem_url')

    console.log(`📦 Analisando ${produtos.length} produtos...`)

    let brokenCount = 0
    const brokenIds = []

    // Checar em lotes para não sobrecarregar
    const batchSize = 20
    for (let i = 0; i < produtos.length; i += batchSize) {
        const batch = produtos.slice(i, i + batchSize)
        process.stdout.write(`\rProcessando ${i} de ${produtos.length}...`)

        await Promise.all(batch.map(async (p) => {
            if (!p.imagem_url || !p.imagem_url.startsWith('http')) {
                brokenCount++
                brokenIds.push(p)
                return
            }

            const status = await checkUrl(p.imagem_url)
            // Se não for 200, consideramos quebrado (403, 404, 0)
            if (status !== 200) {
                brokenCount++
                brokenIds.push(p)
            }
        }))
    }

    console.log(`\n\n📊 RESULTADO:`)
    console.log(`✅ Imagens OK: ${produtos.length - brokenCount}`)
    console.log(`❌ Imagens Quebradas: ${brokenCount}`)

    if (brokenCount > 0) {
        console.log('\nExemplos de quebradas:')
        brokenIds.slice(0, 10).forEach(p => {
            console.log(`   - [${p.id}] ${p.imagem_url}`)
        })

        if (process.argv.includes('--delete')) {
            console.log(`\n🗑️  EXCLUINDO ${brokenCount} PRODUTOS...\n`)
            let excluidos = 0

            for (const p of brokenIds) {
                await supabase.from('precos').delete().eq('produto_id', p.id)
                const { error } = await supabase.from('produtos').delete().eq('id', p.id)

                if (error) console.error(`Erro ao excluir ${p.id}:`, error.message)
                else {
                    excluidos++
                    if (excluidos % 10 === 0) process.stdout.write('.')
                }
            }
            console.log(`\n\n✨ ${excluidos} excluídos com sucesso.`)
        } else {
            console.log('\n⚠️  MODO SIMULAÇÃO. Para excluir use: node scripts/remove-no-images.mjs --delete')
        }
    }
}

main().catch(console.error)
