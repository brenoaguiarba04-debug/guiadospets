/**
 * Script para adicionar produtos Fórmula Natural e Guabi Natural via Shopee API
 * Busca os produtos mais vendidos dessas marcas
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
async function buscarProdutosShopee(termo, limite = 8) {
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
        // Verifica se já tem preço da Shopee
        const { data: precoExiste } = await supabase
            .from('precos')
            .select('id')
            .eq('produto_id', existente.id)
            .eq('loja', 'Shopee')
            .single()

        if (!precoExiste) {
            await supabase.from('precos').insert({
                produto_id: existente.id,
                loja: 'Shopee',
                preco: parseFloat(produto.price),
                link_afiliado: produto.offerLink,
                ultima_atualizacao: new Date().toISOString()
            })
            console.log(`   💾 Preço Shopee adicionado: ${produto.productName.slice(0, 40)}...`)
            return 'preco_adicionado'
        }
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

    console.log(`   ✅ Novo: ${produto.productName.slice(0, 40)}... - R$ ${parseFloat(produto.price).toFixed(2)}`)
    return 'novo_produto'
}

/**
 * Função principal
 */
async function main() {
    console.log('=== ADICIONANDO FÓRMULA NATURAL E GUABI NATURAL ===\n')

    // Lista de buscas - Produtos mais vendidos pesquisados
    const buscas = [
        // FÓRMULA NATURAL - Cães
        { termo: 'formula natural cachorro adulto', categoria: 'Ração', marca: 'Fórmula Natural', limite: 8 },
        { termo: 'formula natural filhote', categoria: 'Ração', marca: 'Fórmula Natural', limite: 5 },
        { termo: 'formula natural mini pequeno', categoria: 'Ração', marca: 'Fórmula Natural', limite: 5 },
        { termo: 'formula natural medio grande', categoria: 'Ração', marca: 'Fórmula Natural', limite: 5 },
        { termo: 'formula natural castrado', categoria: 'Ração', marca: 'Fórmula Natural', limite: 5 },
        { termo: 'formula natural senior', categoria: 'Ração', marca: 'Fórmula Natural', limite: 4 },
        { termo: 'formula natural light', categoria: 'Ração', marca: 'Fórmula Natural', limite: 4 },
        { termo: 'formula natural fresh meat', categoria: 'Ração', marca: 'Fórmula Natural', limite: 5 },

        // FÓRMULA NATURAL - Gatos
        { termo: 'formula natural gato', categoria: 'Ração', marca: 'Fórmula Natural', limite: 6 },
        { termo: 'formula natural gato castrado', categoria: 'Ração', marca: 'Fórmula Natural', limite: 5 },
        { termo: 'formula natural gato filhote', categoria: 'Ração', marca: 'Fórmula Natural', limite: 4 },

        // GUABI NATURAL - Cães
        { termo: 'guabi natural cachorro adulto', categoria: 'Ração', marca: 'Guabi Natural', limite: 8 },
        { termo: 'guabi natural filhote', categoria: 'Ração', marca: 'Guabi Natural', limite: 5 },
        { termo: 'guabi natural frango arroz', categoria: 'Ração', marca: 'Guabi Natural', limite: 5 },
        { termo: 'guabi natural cordeiro aveia', categoria: 'Ração', marca: 'Guabi Natural', limite: 5 },
        { termo: 'guabi natural medio grande', categoria: 'Ração', marca: 'Guabi Natural', limite: 5 },
        { termo: 'guabi natural mini pequeno', categoria: 'Ração', marca: 'Guabi Natural', limite: 5 },

        // GUABI NATURAL - Gatos
        { termo: 'guabi natural gato', categoria: 'Ração', marca: 'Guabi Natural', limite: 6 },
        { termo: 'guabi natural gato castrado', categoria: 'Ração', marca: 'Guabi Natural', limite: 5 },
        { termo: 'guabi natural gato frango', categoria: 'Ração', marca: 'Guabi Natural', limite: 4 },
        { termo: 'guabi natural gato salmao', categoria: 'Ração', marca: 'Guabi Natural', limite: 4 },
    ]

    let totalNovos = 0
    let totalPrecos = 0

    for (const busca of buscas) {
        const produtos = await buscarProdutosShopee(busca.termo, busca.limite)

        for (const produto of produtos) {
            const resultado = await adicionarProduto(produto, busca.categoria, busca.marca)
            if (resultado === 'novo_produto') totalNovos++
            if (resultado === 'preco_adicionado') totalPrecos++
        }

        // Rate limiting
        await delay(1500)
    }

    console.log(`\n🏁 Finalizado!`)
    console.log(`   📦 ${totalNovos} novos produtos adicionados`)
    console.log(`   💰 ${totalPrecos} preços adicionados a produtos existentes`)
}

main()
