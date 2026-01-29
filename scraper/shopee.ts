
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'
// import fetch from 'node-fetch' // Native fetch in Node 18+

// Configurações e Tipos
interface ShopeeProduct {
    itemId: string;
    productName: string;
    price: string;
    commissionRate: number;
    imageUrl: string;
    offerLink: string;
}

// Configurações
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://wgyosfpkctbpeoyxddec.supabase.co'
// Hardcoded keys for now based on user context, should be in env
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndneW9zZnBrY3RicGVveXhkZGVjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODYxMzMxMSwiZXhwIjoyMDg0MTg5MzExfQ.hC1EDiJLflSfD-QcZj9wkPQZWgEDpAcGZbst1NdvhXc'

// Credenciais Shopee
const SHOPEE_APP_ID = '18353990856'
const SHOPEE_SECRET = 'HP3T635VIW5IUPLVXPPVCNE5ID35PF5S'
const SHOPEE_API_URL = 'https://open-api.affiliate.shopee.com.br/graphql'

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// Rate limiting
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

/**
 * Simplifica o nome do produto para busca mais genérica
 */
function simplificarNome(nomeCompleto: string): string {
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
function gerarAssinatura(payload: string, timestamp: number): string {
    const factor = `${SHOPEE_APP_ID}${timestamp}${payload}${SHOPEE_SECRET}`
    return crypto.createHash('sha256').update(factor).digest('hex')
}

/**
 * Busca um produto na API de afiliados da Shopee
 */
async function buscarNaShopee(nomeProduto: string) {
    const termo = simplificarNome(nomeProduto)
    console.log(`🔎 Buscando: "${termo}"...`)

    const timestamp = Math.floor(Date.now() / 1000)

    const query = `{
        productOfferV2(keyword: "${termo}", limit: 20) {
            nodes {
                itemId
                productName
                price
                commissionRate
                imageUrl
                offerLink
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
            headers: headers as any,
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

        const produtos: ShopeeProduct[] = dados?.data?.productOfferV2?.nodes || []

        if (produtos.length === 0) {
            console.log(`   ⚠️ Nenhum produto encontrado`)
            return null
        }

        // LÓGICA DE SELEÇÃO: Commission >= 9% && Menor Preço
        const TAXA_MINIMA = 0.09; // 9%

        // 1. Tenta filtrar produtos com boa comissão
        const highCommission = produtos.filter(p => p.commissionRate >= TAXA_MINIMA);

        let escolhido: ShopeeProduct | null = null;

        if (highCommission.length > 0) {
            // Se tem produtos com boa comissão, pega o mais barato entre eles
            highCommission.sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
            escolhido = highCommission[0];
            console.log(`   💎 ATENÇÃO: Selecionado por boa comissão! (${(escolhido.commissionRate * 100).toFixed(1)}%)`);
        } else {
            // Fallback: Se ninguém paga bem, pega o mais barato geral
            produtos.sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
            escolhido = produtos[0];
            console.log(`   ⚠️ Comissão baixa (<9%), selecionado pelo menor preço. (${(escolhido.commissionRate * 100).toFixed(1)}%)`);
        }

        const produto = escolhido;
        const preco = parseFloat(produto.price)
        console.log(`   ✅ Encontrado: R$ ${preco.toFixed(2)} - ${produto.productName?.slice(0, 30)}...`)

        return {
            preco,
            link: produto.offerLink,
            imagem: produto.imageUrl
        }

    } catch (error: any) {
        console.log(`   ❌ Erro: ${error.message}`)
        return null
    }
}

/**
 * Atualiza ou insere preço da Shopee no banco
 */
async function atualizarPrecoShopee(produtoId: number, resultado: any) {
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

    // Check if running as script directly
    // const { data: produtos, error } = await supabase
    //     .from('produtos')
    //     .select('id, nome')

    // In TS, cleaner to just run it:

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
