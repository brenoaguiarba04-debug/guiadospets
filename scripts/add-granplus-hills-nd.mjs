/**
 * Script para adicionar produtos Gran Plus, Hill's e N&D via Shopee API
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

async function adicionarProduto(produto, categoria, marca) {
    // Verifica se já existe
    const { data: existente } = await supabase
        .from('produtos')
        .select('id')
        .ilike('nome', `%${produto.productName.slice(0, 30)}%`)
        .single()

    if (existente) {
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

async function main() {
    console.log('=== ADICIONANDO GRAN PLUS, HILLS E N&D ===\n')

    const buscas = [
        // GRAN PLUS - Cães
        { termo: 'gran plus cachorro adulto', categoria: 'Ração', marca: 'Gran Plus', limite: 8 },
        { termo: 'gran plus filhote', categoria: 'Ração', marca: 'Gran Plus', limite: 5 },
        { termo: 'gran plus choice', categoria: 'Ração', marca: 'Gran Plus', limite: 5 },
        { termo: 'gran plus mini', categoria: 'Ração', marca: 'Gran Plus', limite: 5 },
        { termo: 'gran plus medio grande', categoria: 'Ração', marca: 'Gran Plus', limite: 5 },
        { termo: 'gran plus frango carne', categoria: 'Ração', marca: 'Gran Plus', limite: 5 },

        // GRAN PLUS - Gatos
        { termo: 'gran plus gato', categoria: 'Ração', marca: 'Gran Plus', limite: 6 },
        { termo: 'gran plus gato castrado', categoria: 'Ração', marca: 'Gran Plus', limite: 4 },

        // HILLS - Science Diet
        { termo: 'hills science diet cachorro', categoria: 'Ração', marca: "Hill's", limite: 8 },
        { termo: 'hills science diet gato', categoria: 'Ração', marca: "Hill's", limite: 6 },
        { termo: 'hills cachorro adulto', categoria: 'Ração', marca: "Hill's", limite: 5 },
        { termo: 'hills filhote', categoria: 'Ração', marca: "Hill's", limite: 5 },
        { termo: 'hills gato castrado', categoria: 'Ração', marca: "Hill's", limite: 4 },

        // HILLS - Prescription Diet (Veterinária)
        { termo: 'hills prescription diet', categoria: 'Ração', marca: "Hill's", limite: 6 },
        { termo: 'hills urinary', categoria: 'Ração', marca: "Hill's", limite: 4 },
        { termo: 'hills renal', categoria: 'Ração', marca: "Hill's", limite: 4 },
        { termo: 'hills gastrointestinal', categoria: 'Ração', marca: "Hill's", limite: 4 },

        // N&D (Farmina) - Cães
        { termo: 'nd farmina cachorro', categoria: 'Ração', marca: 'N&D', limite: 8 },
        { termo: 'nd prime cachorro', categoria: 'Ração', marca: 'N&D', limite: 6 },
        { termo: 'nd ancestral grain', categoria: 'Ração', marca: 'N&D', limite: 5 },
        { termo: 'nd pumpkin cachorro', categoria: 'Ração', marca: 'N&D', limite: 5 },
        { termo: 'nd quinoa cachorro', categoria: 'Ração', marca: 'N&D', limite: 5 },
        { termo: 'n&d cachorro adulto', categoria: 'Ração', marca: 'N&D', limite: 5 },
        { termo: 'n&d filhote', categoria: 'Ração', marca: 'N&D', limite: 4 },

        // N&D (Farmina) - Gatos
        { termo: 'nd farmina gato', categoria: 'Ração', marca: 'N&D', limite: 6 },
        { termo: 'nd prime gato', categoria: 'Ração', marca: 'N&D', limite: 5 },
        { termo: 'n&d gato castrado', categoria: 'Ração', marca: 'N&D', limite: 4 },
        { termo: 'n&d gato adulto', categoria: 'Ração', marca: 'N&D', limite: 4 },
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
