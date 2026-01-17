/**
 * Script para adicionar produtos populares de pet da Shopee
 * Busca produtos de: Ração, Antipulgas/Remédios, Areia de Gato
 */
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

// Configurações
const SUPABASE_URL = 'https://wgyosfpkctbpeoyxddec.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndneW9zZnBrY3RicGVveXhkZGVjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg2MTMzMTEsImV4cCI6MjA4NDE4OTMxMX0.uQhOqsiVj2JUEjSyIBT5x1wzEMNIzHBzWk5m4L8XX8w'

// Credenciais Shopee
const SHOPEE_APP_ID = '18353990856'
const SHOPEE_SECRET = 'HP3T635VIW5IUPLVXPPVCNE5ID35PF5S'
const SHOPEE_API_URL = 'https://open-api.affiliate.shopee.com.br/graphql'

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms))

function gerarAssinatura(payload, timestamp) {
    const factor = `${SHOPEE_APP_ID}${timestamp}${payload}${SHOPEE_SECRET}`
    return crypto.createHash('sha256').update(factor).digest('hex')
}

/**
 * Busca produtos na Shopee por termo
 */
async function buscarProdutosShopee(termo, limite = 5) {
    console.log(`\n🔎 Buscando "${termo}"...`)

    const timestamp = Math.floor(Date.now() / 1000)

    const query = `{
productOfferV2(keyword: "${termo}", limit: ${limite}, sortType: 2) {
nodes {
itemId
productName
price
imageUrl
offerLink
commissionRate
sales
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
        const response = await fetch(SHOPEE_API_URL, {
            method: 'POST',
            headers,
            body: payload
        })

        const dados = await response.json()

        if (dados.errors) {
            console.log(`   ⚠️ Erro: ${dados.errors[0]?.message}`)
            return []
        }

        const produtos = dados?.data?.productOfferV2?.nodes || []
        console.log(`   ✅ Encontrados: ${produtos.length} produtos`)

        return produtos

    } catch (error) {
        console.log(`   ❌ Erro: ${error.message}`)
        return []
    }
}

/**
 * Adiciona produto ao banco de dados
 */
async function adicionarProduto(produto, categoria, marca) {
    // Verifica se já existe (pelo nome similar)
    const { data: existente } = await supabase
        .from('produtos')
        .select('id')
        .ilike('nome', `%${produto.productName.slice(0, 30)}%`)
        .single()

    if (existente) {
        console.log(`   ⏭️ Já existe: ${produto.productName.slice(0, 40)}...`)
        return null
    }

    // Insere produto
    const { data: novoProduto, error: erroProduto } = await supabase
        .from('produtos')
        .insert({
            nome: produto.productName,
            marca: marca,
            categoria: categoria,
            imagem_url: produto.imageUrl,
            palavras_chave: `${produto.productName} ${categoria} ${marca}`
        })
        .select()
        .single()

    if (erroProduto) {
        console.log(`   ❌ Erro ao inserir: ${erroProduto.message}`)
        return null
    }

    // Insere preço
    await supabase
        .from('precos')
        .insert({
            produto_id: novoProduto.id,
            loja: 'Shopee',
            preco: parseFloat(produto.price),
            link_afiliado: produto.offerLink,
            ultima_atualizacao: new Date().toISOString()
        })

    console.log(`   ✅ Adicionado: ${produto.productName.slice(0, 40)}... - R$ ${parseFloat(produto.price).toFixed(2)}`)
    return novoProduto
}

/**
 * Função principal
 */
async function main() {
    console.log('=== ADICIONANDO PRODUTOS POPULARES DA SHOPEE ===\n')

    // Lista de buscas por categoria
    const buscas = [
        // Rações
        { termo: 'racao golden cachorro', categoria: 'Ração', marca: 'Golden', limite: 5 },
        { termo: 'racao premier cachorro', categoria: 'Ração', marca: 'Premier', limite: 5 },
        { termo: 'racao royal canin cachorro', categoria: 'Ração', marca: 'Royal Canin', limite: 5 },
        { termo: 'racao pedigree cachorro', categoria: 'Ração', marca: 'Pedigree', limite: 3 },
        { termo: 'racao whiskas gato', categoria: 'Ração', marca: 'Whiskas', limite: 3 },
        { termo: 'racao royal canin gato', categoria: 'Ração', marca: 'Royal Canin', limite: 3 },
        { termo: 'racao golden gato', categoria: 'Ração', marca: 'Golden', limite: 3 },

        // Remédios/Antipulgas
        { termo: 'bravecto cachorro', categoria: 'Antipulgas', marca: 'MSD', limite: 4 },
        { termo: 'nexgard cachorro', categoria: 'Antipulgas', marca: 'Boehringer', limite: 4 },
        { termo: 'simparic cachorro', categoria: 'Antipulgas', marca: 'Zoetis', limite: 4 },
        { termo: 'frontline cachorro', categoria: 'Antipulgas', marca: 'Boehringer', limite: 3 },
        { termo: 'revolution gato', categoria: 'Antipulgas', marca: 'Zoetis', limite: 3 },

        // Areias de Gato
        { termo: 'areia gato pipicat', categoria: 'Higiene', marca: 'Pipicat', limite: 4 },
        { termo: 'areia gato granulado', categoria: 'Higiene', marca: 'Vários', limite: 4 },
        { termo: 'areia gato silica', categoria: 'Higiene', marca: 'Vários', limite: 3 },
        { termo: 'areia sanitaria gato', categoria: 'Higiene', marca: 'Vários', limite: 3 },
    ]

    let totalAdicionados = 0

    for (const busca of buscas) {
        const produtos = await buscarProdutosShopee(busca.termo, busca.limite)

        for (const produto of produtos) {
            const adicionado = await adicionarProduto(produto, busca.categoria, busca.marca)
            if (adicionado) totalAdicionados++
        }

        // Rate limiting
        await delay(1500)
    }

    console.log(`\n🏁 Finalizado! ${totalAdicionados} novos produtos adicionados.`)
}

main()
