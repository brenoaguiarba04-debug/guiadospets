/**
 * Script de sincronização com a API de afiliados da Shopee
 * Busca preços reais e links de afiliados para os produtos
 * 
 * CORRIGIDO: Usa SHA256 simples, não HMAC-SHA256
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

// Rate limiting
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms))

/**
 * Simplifica o nome do produto para busca mais genérica
 */
function simplificarNome(nomeCompleto) {
    const nome = nomeCompleto.toLowerCase()

    // Termos de busca específicos para cada marca
    if (nome.includes('golden')) return 'racao golden cachorro'
    if (nome.includes('premier')) return 'racao premier cachorro'
    if (nome.includes('bravecto')) return 'bravecto'
    if (nome.includes('nexgard')) return 'nexgard'
    if (nome.includes('simparic')) return 'simparic'

    // Fallback: primeiras 3 palavras
    const palavras = nomeCompleto.replace(/[^\w\s]/g, '').split(/\s+/)
    return palavras.slice(0, 3).join(' ')
}

/**
 * Gera assinatura SHA256 (NÃO HMAC!) conforme documentação Shopee
 * Fórmula: SHA256(Credential + Timestamp + Payload + Secret)
 */
function gerarAssinatura(payload, timestamp) {
    // Fórmula: SHA256(AppId + Timestamp + Payload + Secret)
    const factor = `${SHOPEE_APP_ID}${timestamp}${payload}${SHOPEE_SECRET}`

    // SHA256 simples (não HMAC!)
    return crypto
        .createHash('sha256')
        .update(factor)
        .digest('hex')
}

/**
 * Busca um produto na API de afiliados da Shopee
 */
async function buscarNaShopee(nomeProduto) {
    const termo = simplificarNome(nomeProduto)
    console.log(`🔎 Buscando: "${termo}"...`)

    const timestamp = Math.floor(Date.now() / 1000)

    // Query GraphQL
    const query = `{
productOfferV2(keyword: "${termo}", limit: 1) {
nodes {
itemId
productName
price
imageUrl
offerLink
}
}
}`

    const payload = JSON.stringify({ query })
    const signature = gerarAssinatura(payload, timestamp)

    console.log(`   Timestamp: ${timestamp}`)
    console.log(`   Signature: ${signature.slice(0, 20)}...`)

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

        const responseText = await response.text()

        if (!response.ok) {
            console.log(`   ❌ Erro HTTP ${response.status}: ${responseText.slice(0, 100)}`)
            return null
        }

        const dados = JSON.parse(responseText)

        if (dados.errors) {
            console.log(`   ⚠️ Erro API: ${dados.errors[0]?.message}`)
            return null
        }

        const produtos = dados?.data?.productOfferV2?.nodes || []

        if (produtos.length === 0) {
            console.log(`   ⚠️ Nenhum produto encontrado`)
            return null
        }

        const produto = produtos[0]
        const preco = parseFloat(produto.price)
        console.log(`   ✅ Encontrado: R$ ${preco.toFixed(2)} - ${produto.productName?.slice(0, 30)}...`)

        return {
            preco,
            link: produto.offerLink,
            imagem: produto.imageUrl
        }

    } catch (error) {
        console.log(`   ❌ Erro: ${error.message}`)
        return null
    }
}

/**
 * Atualiza ou insere preço da Shopee no banco
 */
async function atualizarPrecoShopee(produtoId, resultado) {
    const { data: existente } = await supabase
        .from('precos')
        .select('id')
        .eq('produto_id', produtoId)
        .eq('loja', 'Shopee')
        .single()

    if (existente) {
        await supabase
            .from('precos')
            .update({
                preco: resultado.preco,
                link_afiliado: resultado.link,
                ultima_atualizacao: new Date().toISOString()
            })
            .eq('id', existente.id)
        console.log(`   🔄 Preço atualizado!`)
    } else {
        await supabase
            .from('precos')
            .insert({
                produto_id: produtoId,
                loja: 'Shopee',
                preco: resultado.preco,
                link_afiliado: resultado.link,
                ultima_atualizacao: new Date().toISOString()
            })
        console.log(`   💾 Novo preço salvo!`)
    }

    // Atualiza imagem se disponível
    if (resultado.imagem && resultado.imagem.startsWith('http')) {
        await supabase
            .from('produtos')
            .update({ imagem_url: resultado.imagem })
            .eq('id', produtoId)
        console.log(`   🖼️ Imagem atualizada!`)
    }
}

/**
 * Função principal de sincronização
 */
async function main() {
    console.log('--- INICIANDO SINCRONIZAÇÃO SHOPEE ---')
    console.log(`App ID: ${SHOPEE_APP_ID}`)

    const { data: produtos, error } = await supabase
        .from('produtos')
        .select('id, nome')

    if (error) {
        console.error('❌ Erro ao buscar produtos:', error.message)
        return
    }

    if (!produtos || produtos.length === 0) {
        console.log('Banco de dados vazio.')
        return
    }

    const total = produtos.length
    let sucesso = 0

    for (let i = 0; i < produtos.length; i++) {
        const p = produtos[i]
        console.log(`\n[${i + 1}/${total}] ${p.nome.slice(0, 50)}...`)

        const resultado = await buscarNaShopee(p.nome)

        if (resultado) {
            await atualizarPrecoShopee(p.id, resultado)
            sucesso++
        }

        // Rate limiting
        if (i < total - 1) {
            await delay(1500)
        }
    }

    console.log(`\n🏁 Sincronização finalizada! ${sucesso}/${total} produtos atualizados.`)
}

main()
