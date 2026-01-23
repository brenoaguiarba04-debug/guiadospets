/**
 * Script para corrigir imagens quebradas buscando na Shopee
 */

import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'
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

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Erro: Variáveis de ambiente não encontradas.')
    process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
})

// Configurações Shopee
const SHOPEE_APP_ID = '18353990856'
const SHOPEE_SECRET = 'HP3T635VIW5IUPLVXPPVCNE5ID35PF5S'
const SHOPEE_API_URL = 'https://open-api.affiliate.shopee.com.br/graphql'

function simplificarNome(nomeCompleto) {
    const nome = nomeCompleto.toLowerCase()
    // Termos mais genéricos funcionam melhor para buscar imagem
    if (nome.includes('golden')) return 'racao golden cachorro' // Tenta achar qualquer golden, melhor que nada
    if (nome.includes('premier')) return 'racao premier cachorro'
    if (nome.includes('bravecto')) return 'bravecto'
    if (nome.includes('nexgard')) return 'nexgard'
    if (nome.includes('simparic')) return 'simparic'
    if (nome.includes('pipicat')) return 'areia pipicat'
    if (nome.includes('royal canin')) {
        // Tentar pegar "Royal Canin + Tipo"
        if (nome.includes('urinary')) return 'royal canin urinary'
        if (nome.includes('gastrointestinal')) return 'royal canin gastrointestinal'
        if (nome.includes('hypoallergenic')) return 'royal canin hypoallergenic'
        return 'racao royal canin'
    }

    // Tenta pegar as 3 primeiras palavras que geralmente definem o produto
    const palavras = nomeCompleto.replace(/[^\w\s]/g, '').split(/\s+/)
    return palavras.slice(0, 3).join(' ')
}

function gerarAssinatura(payload, timestamp) {
    const factor = `${SHOPEE_APP_ID}${timestamp}${payload}${SHOPEE_SECRET}`
    return crypto.createHash('sha256').update(factor).digest('hex')
}

// Verifica se a URL está acessível
async function checkUrl(url) {
    if (!url || !url.startsWith('http')) return 0
    try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 4000)
        const res = await fetch(url, {
            method: 'HEAD',
            signal: controller.signal,
            headers: { 'User-Agent': 'Mozilla/5.0' }
        })
        clearTimeout(timeoutId)
        return res.status
    } catch { return 0 }
}

async function buscarNaShopee(nomeProduto) {
    const termo = simplificarNome(nomeProduto)
    const timestamp = Math.floor(Date.now() / 1000)
    const query = `{
productOfferV2(keyword: "${termo}", limit: 1) {
nodes {
imageUrl
offerLink
productName
price
}
}
}`
    const payload = JSON.stringify({ query })
    const signature = gerarAssinatura(payload, timestamp)
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `SHA256 Credential=${SHOPEE_APP_ID}, Timestamp=${timestamp}, Signature=${signature}`
    }

    try {
        const response = await fetch(SHOPEE_API_URL, { method: 'POST', headers, body: payload })
        const dados = await response.json()
        const produtos = dados?.data?.productOfferV2?.nodes || []
        return produtos[0]
    } catch { return null }
}

async function main() {
    console.log('🔧 CORREÇÃO DE IMAGENS')
    console.log('======================\n')

    // 1. Buscar produtos
    const { data: produtos } = await supabase.from('produtos').select('*')
    console.log(`📦 Verificando ${produtos.length} produtos...`)

    let corrigidos = 0
    let falhas = 0
    let ok = 0

    // Processar em série para não flodar
    for (const [i, p] of produtos.entries()) {
        process.stdout.write(`\r[${i + 1}/${produtos.length}] Analisando... `)

        // Verifica URL atual
        const status = await checkUrl(p.imagem_url)

        if (status === 200) {
            ok++
            continue
        }

        // Se está quebrado (não 200), tenta corrigir
        console.log(`\n❌ Quebrado (${status}): ${p.nome}`)

        const shopeeData = await buscarNaShopee(p.nome)

        if (shopeeData && shopeeData.imageUrl) {
            const novaUrl = shopeeData.imageUrl

            // Verifica se a nova URL é válida
            const novoStatus = await checkUrl(novaUrl)

            if (novoStatus === 200) {
                // Atualiza no banco
                await supabase.from('produtos').update({ imagem_url: novaUrl }).eq('id', p.id)

                // Opcional: Atualizar preço Shopee já que achamos
                // Isso ajuda a manter o link de afiliado atualizado também
                await supabase.from('precos').upsert({
                    produto_id: p.id,
                    loja: 'Shopee',
                    preco: parseFloat(shopeeData.price),
                    link_afiliado: shopeeData.offerLink,
                    ultima_atualizacao: new Date().toISOString()
                }, { onConflict: 'produto_id,loja' })

                console.log(`   ✅ Corrigido! Nova imagem Shopee.`)
                corrigidos++
            } else {
                console.log(`   ⚠️ Nova URL também parece inválida.`)
                falhas++
            }
        } else {
            console.log(`   ❌ Não encontrado na Shopee API.`)
            falhas++
        }
    }

    console.log('\n\n📊 RELATÓRIO FINAL')
    console.log(`✅ Originais OK: ${ok}`)
    console.log(`🔧 Corrigidos: ${corrigidos}`)
    console.log(`⚠️  Não corrigidos: ${falhas}`)
}

main()
