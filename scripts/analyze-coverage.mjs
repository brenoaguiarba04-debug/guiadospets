/**
 * Análise de Cobertura do Banco de Dados
 * Verifica quais produtos têm preços de quais lojas
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = "https://wgyosfpkctbpeoyxddec.supabase.co"
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndneW9zZnBrY3RicGVveXhkZGVjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg2MTMzMTEsImV4cCI6MjA4NDE4OTMxMX0.uQhOqsiVj2JUEjSyIBT5x1wzEMNIzHBzWk5m4L8XX8w"

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

async function analisar() {
    console.log('📊 ANÁLISE DE COBERTURA DO BANCO DE DADOS')
    console.log('=========================================\n')

    // Buscar todos os produtos com preços
    const { data: produtos, error } = await supabase
        .from('produtos')
        .select('id, nome, categoria, precos(id, loja, preco, link_afiliado)')
        .order('nome')

    if (error) {
        console.error('Erro:', error)
        return
    }

    console.log(`📦 Total de produtos: ${produtos.length}\n`)

    // Estatísticas por loja
    const lojas = {}
    const lojasEsperadas = ['Amazon', 'Shopee', 'Petz', 'Petlove', 'Cobasi', 'Mercado Livre']

    // Produtos sem preço
    const semPreco = []

    // Produtos com poucos preços (< 3 lojas)
    const poucosPrecos = []

    // Cobertura por produto
    const cobertura = []

    for (const p of produtos) {
        const precos = p.precos || []
        const lojasDoProduto = [...new Set(precos.map(pr => pr.loja))]

        // Contar por loja
        for (const loja of lojasDoProduto) {
            lojas[loja] = (lojas[loja] || 0) + 1
        }

        if (precos.length === 0) {
            semPreco.push(p.nome)
        } else if (lojasDoProduto.length < 3) {
            poucosPrecos.push({
                nome: p.nome,
                lojas: lojasDoProduto.join(', '),
                qtd: lojasDoProduto.length
            })
        }

        // Links inválidos
        const linksInvalidos = precos.filter(pr => !pr.link_afiliado || pr.link_afiliado.length < 10).length

        cobertura.push({
            id: p.id,
            nome: p.nome.slice(0, 50),
            total_precos: precos.length,
            lojas_unicas: lojasDoProduto.length,
            lojas: lojasDoProduto.join(', '),
            links_invalidos: linksInvalidos
        })
    }

    // ==================
    // RELATÓRIO
    // ==================

    console.log('🏪 COBERTURA POR LOJA:')
    console.log('─'.repeat(40))
    for (const [loja, count] of Object.entries(lojas).sort((a, b) => b[1] - a[1])) {
        const percentual = ((count / produtos.length) * 100).toFixed(1)
        const barra = '█'.repeat(Math.round(percentual / 5)) + '░'.repeat(20 - Math.round(percentual / 5))
        console.log(`  ${loja.padEnd(15)} ${barra} ${count} (${percentual}%)`)
    }

    console.log('\n❌ LOJAS FALTANDO NO BANCO:')
    const lojasPresentes = Object.keys(lojas)
    const lojasFaltando = lojasEsperadas.filter(l => !lojasPresentes.includes(l))
    if (lojasFaltando.length > 0) {
        lojasFaltando.forEach(l => console.log(`  - ${l}`))
    } else {
        console.log('  Todas as lojas esperadas estão presentes!')
    }

    console.log('\n⚠️  PRODUTOS SEM NENHUM PREÇO:')
    if (semPreco.length > 0) {
        semPreco.slice(0, 10).forEach(n => console.log(`  - ${n}`))
        if (semPreco.length > 10) console.log(`  ... e mais ${semPreco.length - 10}`)
    } else {
        console.log('  Nenhum! Todos têm pelo menos 1 preço.')
    }

    console.log('\n🔍 PRODUTOS COM POUCA COBERTURA (< 3 lojas):')
    poucosPrecos.slice(0, 15).forEach(p => {
        console.log(`  - ${p.nome.slice(0, 40)}... → Só em: ${p.lojas}`)
    })
    if (poucosPrecos.length > 15) console.log(`  ... e mais ${poucosPrecos.length - 15}`)

    // Produtos com links inválidos
    const comLinksInvalidos = cobertura.filter(c => c.links_invalidos > 0)
    console.log(`\n🔗 PRODUTOS COM LINKS INVÁLIDOS: ${comLinksInvalidos.length}`)
    comLinksInvalidos.slice(0, 10).forEach(p => {
        console.log(`  - ${p.nome}... (${p.links_invalidos} links ruins)`)
    })

    // Resumo final
    console.log('\n📈 RESUMO:')
    console.log('─'.repeat(40))
    console.log(`  Total de produtos: ${produtos.length}`)
    console.log(`  Produtos sem preço: ${semPreco.length}`)
    console.log(`  Produtos com < 3 lojas: ${poucosPrecos.length}`)
    console.log(`  Lojas diferentes: ${Object.keys(lojas).length}`)

    const mediaLojasPorProduto = cobertura.reduce((sum, c) => sum + c.lojas_unicas, 0) / produtos.length
    console.log(`  Média de lojas por produto: ${mediaLojasPorProduto.toFixed(1)}`)

    const coberturaBoa = cobertura.filter(c => c.lojas_unicas >= 3).length
    console.log(`  Produtos com boa cobertura (≥3 lojas): ${coberturaBoa} (${((coberturaBoa / produtos.length) * 100).toFixed(1)}%)`)
}

analisar().catch(console.error)
