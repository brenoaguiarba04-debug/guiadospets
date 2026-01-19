/**
 * Script de validação e qualidade de dados
 * Verifica links de afiliado, imagens quebradas e gera relatório
 * 
 * Uso: node scripts/validate-data.mjs
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { resolve } from 'path'
import https from 'https'
import http from 'http'

// Carrega variáveis de ambiente
dotenv.config({ path: resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Configure NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY no .env.local')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

// Função para verificar se URL é válida
function isValidUrl(url) {
    if (!url || typeof url !== 'string') return false
    if (url === '#' || url.length < 10) return false
    try {
        new URL(url.startsWith('http') ? url : `https://${url}`)
        return true
    } catch {
        return false
    }
}

// Função para verificar se imagem existe (HEAD request)
async function checkImageUrl(url) {
    return new Promise((resolve) => {
        try {
            const urlObj = new URL(url)
            const protocol = urlObj.protocol === 'https:' ? https : http

            const req = protocol.request(urlObj, { method: 'HEAD', timeout: 5000 }, (res) => {
                resolve(res.statusCode >= 200 && res.statusCode < 400)
            })

            req.on('error', () => resolve(false))
            req.on('timeout', () => {
                req.destroy()
                resolve(false)
            })
            req.end()
        } catch {
            resolve(false)
        }
    })
}

async function validateData() {
    console.log('🔍 Iniciando validação de dados...\n')

    const report = {
        totalProdutos: 0,
        totalPrecos: 0,
        linksValidos: 0,
        linksInvalidos: 0,
        linksVazios: 0,
        imagensValidas: 0,
        imagensInvalidas: 0,
        imagensVazias: 0,
        produtosSemPreco: 0,
        lojas: {},
        problemas: []
    }

    // 1. Buscar todos os produtos
    console.log('📦 Buscando produtos...')
    const { data: produtos, error: prodError } = await supabase
        .from('produtos')
        .select('id, nome, imagem_url')

    if (prodError) {
        console.error('Erro ao buscar produtos:', prodError)
        return
    }

    report.totalProdutos = produtos.length
    console.log(`   Encontrados ${produtos.length} produtos\n`)

    // 2. Verificar imagens (amostra de 20)
    console.log('🖼️  Verificando imagens (amostra)...')
    const amostraImagens = produtos.slice(0, 20)

    for (const prod of amostraImagens) {
        if (!prod.imagem_url) {
            report.imagensVazias++
        } else {
            const isValid = await checkImageUrl(prod.imagem_url)
            if (isValid) {
                report.imagensValidas++
            } else {
                report.imagensInvalidas++
                report.problemas.push({
                    tipo: 'imagem_invalida',
                    produtoId: prod.id,
                    nome: prod.nome?.substring(0, 50),
                    url: prod.imagem_url
                })
            }
        }
    }

    // 3. Buscar preços
    console.log('💰 Verificando preços e links de afiliado...')
    const { data: precos, error: precoError } = await supabase
        .from('precos')
        .select('id, produto_id, loja, preco, link_afiliado')

    if (precoError) {
        console.error('Erro ao buscar preços:', precoError)
        return
    }

    report.totalPrecos = precos.length

    // 4. Analisar links de afiliado por loja
    for (const preco of precos) {
        // Contagem por loja
        if (!report.lojas[preco.loja]) {
            report.lojas[preco.loja] = { total: 0, validos: 0, invalidos: 0 }
        }
        report.lojas[preco.loja].total++

        // Verificar link
        if (!preco.link_afiliado || preco.link_afiliado === '#') {
            report.linksVazios++
            report.lojas[preco.loja].invalidos++
        } else if (isValidUrl(preco.link_afiliado)) {
            report.linksValidos++
            report.lojas[preco.loja].validos++
        } else {
            report.linksInvalidos++
            report.lojas[preco.loja].invalidos++
            report.problemas.push({
                tipo: 'link_invalido',
                produtoId: preco.produto_id,
                loja: preco.loja,
                link: preco.link_afiliado?.substring(0, 80)
            })
        }
    }

    // 5. Produtos sem preço
    const produtosComPreco = new Set(precos.map(p => p.produto_id))
    for (const prod of produtos) {
        if (!produtosComPreco.has(prod.id)) {
            report.produtosSemPreco++
        }
    }

    // 6. Gerar relatório
    console.log('\n' + '='.repeat(60))
    console.log('📊 RELATÓRIO DE QUALIDADE DE DADOS')
    console.log('='.repeat(60))

    console.log(`\n📦 PRODUTOS`)
    console.log(`   Total: ${report.totalProdutos}`)
    console.log(`   Sem preço: ${report.produtosSemPreco}`)

    console.log(`\n🖼️  IMAGENS (amostra de 20)`)
    console.log(`   Válidas: ${report.imagensValidas} ✅`)
    console.log(`   Inválidas: ${report.imagensInvalidas} ❌`)
    console.log(`   Vazias: ${report.imagensVazias} ⚠️`)

    console.log(`\n💰 PREÇOS E LINKS`)
    console.log(`   Total de ofertas: ${report.totalPrecos}`)
    console.log(`   Links válidos: ${report.linksValidos} ✅`)
    console.log(`   Links inválidos: ${report.linksInvalidos} ❌`)
    console.log(`   Links vazios: ${report.linksVazios} ⚠️`)

    console.log(`\n🏪 POR LOJA:`)
    for (const [loja, stats] of Object.entries(report.lojas)) {
        const percent = ((stats.validos / stats.total) * 100).toFixed(0)
        const emoji = percent > 80 ? '✅' : percent > 50 ? '⚠️' : '❌'
        console.log(`   ${loja}: ${stats.validos}/${stats.total} válidos (${percent}%) ${emoji}`)
    }

    // Score geral
    const score = Math.round(
        (report.linksValidos / (report.totalPrecos || 1)) * 100
    )
    console.log(`\n🎯 SCORE GERAL DE QUALIDADE: ${score}%`)

    if (score < 50) {
        console.log('   ⚠️  Muitos links precisam ser atualizados!')
        console.log('   💡 Dica: Cadastre-se nos programas de afiliados e atualize os links')
    } else if (score < 80) {
        console.log('   📈 Bom progresso! Continue melhorando os links')
    } else {
        console.log('   🎉 Excelente! A maioria dos links está funcionando')
    }

    // Primeiros problemas
    if (report.problemas.length > 0) {
        console.log(`\n⚠️  PRIMEIROS ${Math.min(5, report.problemas.length)} PROBLEMAS:`)
        for (const prob of report.problemas.slice(0, 5)) {
            if (prob.tipo === 'link_invalido') {
                console.log(`   - [Link] Produto #${prob.produtoId} (${prob.loja}): ${prob.link}`)
            } else {
                console.log(`   - [Imagem] Produto #${prob.produtoId}: ${prob.nome}`)
            }
        }
    }

    console.log('\n' + '='.repeat(60))
    console.log('✅ Validação concluída!')
    console.log('='.repeat(60))
}

validateData().catch(console.error)
