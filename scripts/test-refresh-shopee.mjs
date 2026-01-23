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

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

const SHOPEE_APP_ID = '18353990856'
const SHOPEE_SECRET = 'HP3T635VIW5IUPLVXPPVCNE5ID35PF5S'
const SHOPEE_API_URL = 'https://open-api.affiliate.shopee.com.br/graphql'

function simplificarNome(nomeCompleto) {
    const nome = nomeCompleto.toLowerCase()
    if (nome.includes('golden')) return 'racao golden cachorro'
    if (nome.includes('premier')) return 'racao premier cachorro'
    if (nome.includes('bravecto')) return 'bravecto'
    if (nome.includes('nexgard')) return 'nexgard'
    if (nome.includes('simparic')) return 'simparic'
    const palavras = nomeCompleto.replace(/[^\w\s]/g, '').split(/\s+/)
    return palavras.slice(0, 3).join(' ')
}

function gerarAssinatura(payload, timestamp) {
    const factor = `${SHOPEE_APP_ID}${timestamp}${payload}${SHOPEE_SECRET}`
    return crypto.createHash('sha256').update(factor).digest('hex')
}

async function checkUrl(url) {
    try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 3000)
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
    console.log(`🔎 Buscando: "${termo}"...`)
    const timestamp = Math.floor(Date.now() / 1000)
    const query = `{
productOfferV2(keyword: "${termo}", limit: 1) {
nodes {
imageUrl
offerLink
productName
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
    } catch (e) {
        console.error(e)
        return null
    }
}

async function main() {
    console.log('🧪 TESTE DE REFRESH SHOPEE')

    // Pegar produtos quebrados conhecidos (ex: ID 23 Shopee, 112 Petz)
    const ids = [23, 112]

    for (const id of ids) {
        console.log(`\n--- Testando Produto ID ${id} ---`)
        const { data: produto } = await supabase.from('produtos').select('*').eq('id', id).single()

        if (!produto) {
            console.log(`Produto ${id} não encontrado.`)
            continue
        }

        console.log(`Produto: ${produto.nome}`)
        console.log(`URL Atual: ${produto.imagem_url}`)
        const statusOld = await checkUrl(produto.imagem_url)
        console.log(`Status URL Atual: ${statusOld} ${statusOld === 200 ? '✅' : '❌'}`)

        const novo = await buscarNaShopee(produto.nome)

        if (novo) {
            console.log(`\nURL Nova encontrada na API: ${novo.imageUrl}`)
            const statusNew = await checkUrl(novo.imageUrl)
            console.log(`Status URL Nova: ${statusNew} ${statusNew === 200 ? '✅' : '❌'}`)
        } else {
            console.log('❌ Falha ao buscar na Shopee API ou produto não encontrado.')
        }
    }
}

main()
