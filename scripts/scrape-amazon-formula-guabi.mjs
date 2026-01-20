/**
 * Script de scraping da Amazon Brasil - Fórmula Natural e Guabi Natural
 * Busca produtos dessas marcas específicas
 */
import puppeteer from 'puppeteer-extra'
import StealthPlugin from 'puppeteer-extra-plugin-stealth'
import { createClient } from '@supabase/supabase-js'

puppeteer.use(StealthPlugin())

const SUPABASE_URL = 'https://wgyosfpkctbpeoyxddec.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndneW9zZnBrY3RicGVveXhkZGVjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg2MTMzMTEsImV4cCI6MjA4NDE4OTMxMX0.uQhOqsiVj2JUEjSyIBT5x1wzEMNIzHBzWk5m4L8XX8w'

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms))

// Termos de busca para Fórmula Natural e Guabi Natural
const TERMOS_BUSCA = [
    // FÓRMULA NATURAL - Cães
    { termo: 'ração formula natural cachorro 15kg', categoria: 'Ração', marca: 'Fórmula Natural' },
    { termo: 'formula natural adulto medio grande', categoria: 'Ração', marca: 'Fórmula Natural' },
    { termo: 'formula natural filhote', categoria: 'Ração', marca: 'Fórmula Natural' },
    { termo: 'formula natural mini pequeno', categoria: 'Ração', marca: 'Fórmula Natural' },
    { termo: 'formula natural castrado cachorro', categoria: 'Ração', marca: 'Fórmula Natural' },
    { termo: 'formula natural fresh meat', categoria: 'Ração', marca: 'Fórmula Natural' },

    // FÓRMULA NATURAL - Gatos
    { termo: 'formula natural gato adulto', categoria: 'Ração', marca: 'Fórmula Natural' },
    { termo: 'formula natural gato castrado', categoria: 'Ração', marca: 'Fórmula Natural' },
    { termo: 'formula natural gato filhote', categoria: 'Ração', marca: 'Fórmula Natural' },

    // GUABI NATURAL - Cães
    { termo: 'guabi natural cachorro 15kg', categoria: 'Ração', marca: 'Guabi Natural' },
    { termo: 'guabi natural adulto medio grande', categoria: 'Ração', marca: 'Guabi Natural' },
    { termo: 'guabi natural frango arroz', categoria: 'Ração', marca: 'Guabi Natural' },
    { termo: 'guabi natural cordeiro aveia', categoria: 'Ração', marca: 'Guabi Natural' },
    { termo: 'guabi natural filhote', categoria: 'Ração', marca: 'Guabi Natural' },

    // GUABI NATURAL - Gatos
    { termo: 'guabi natural gato adulto', categoria: 'Ração', marca: 'Guabi Natural' },
    { termo: 'guabi natural gato castrado', categoria: 'Ração', marca: 'Guabi Natural' },
    { termo: 'guabi natural gato salmao', categoria: 'Ração', marca: 'Guabi Natural' },
]

async function buscarNaAmazon(page, termo) {
    console.log(`\n🔎 Buscando: "${termo}"...`)

    try {
        const url = `https://www.amazon.com.br/s?k=${encodeURIComponent(termo)}`
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 })
        await delay(3000)

        // Tenta múltiplos seletores
        const produtos = await page.evaluate(() => {
            const results = []

            // Seletor principal
            const items = document.querySelectorAll('[data-component-type="s-search-result"]')

            for (const item of Array.from(items).slice(0, 4)) {
                try {
                    // Nome
                    const nomeEl = item.querySelector('h2 span') || item.querySelector('.a-text-normal')
                    if (!nomeEl) continue

                    // Preço - múltiplos seletores
                    let preco = null
                    const precoWhole = item.querySelector('.a-price-whole')
                    const precoFraction = item.querySelector('.a-price-fraction')

                    if (precoWhole) {
                        const whole = precoWhole.textContent.replace(/\D/g, '')
                        const fraction = precoFraction?.textContent || '00'
                        preco = parseFloat(`${whole}.${fraction}`)
                    }

                    if (!preco || isNaN(preco)) continue

                    // Imagem
                    const imgEl = item.querySelector('.s-image')

                    // Link
                    const linkEl = item.querySelector('h2 a') || item.querySelector('a.a-link-normal')
                    let link = null
                    if (linkEl) {
                        const href = linkEl.getAttribute('href')
                        link = href.startsWith('http') ? href : 'https://www.amazon.com.br' + href
                    }

                    results.push({
                        nome: nomeEl.textContent.trim().slice(0, 200),
                        preco,
                        imagem: imgEl?.src || null,
                        link
                    })
                } catch (e) {
                    continue
                }
            }

            return results
        })

        if (produtos.length > 0) {
            console.log(`   ✅ Encontrados: ${produtos.length} produtos`)
            produtos.forEach((p, i) => {
                console.log(`      ${i + 1}. R$ ${p.preco.toFixed(2)} - ${p.nome.slice(0, 50)}...`)
            })
        } else {
            console.log(`   ⚠️ Nenhum produto encontrado`)
        }

        return produtos

    } catch (error) {
        console.log(`   ❌ Erro: ${error.message}`)
        return []
    }
}

async function salvarProduto(produto, categoria, marca) {
    // Verifica se já existe
    const { data: existente } = await supabase
        .from('produtos')
        .select('id')
        .ilike('nome', `%${produto.nome.slice(0, 30)}%`)
        .single()

    if (existente) {
        // Apenas adiciona preço da Amazon
        const { data: precoExiste } = await supabase
            .from('precos')
            .select('id')
            .eq('produto_id', existente.id)
            .eq('loja', 'Amazon')
            .single()

        if (!precoExiste) {
            await supabase.from('precos').insert({
                produto_id: existente.id,
                loja: 'Amazon',
                preco: produto.preco,
                link_afiliado: produto.link,
                ultima_atualizacao: new Date().toISOString()
            })
            console.log(`   💾 Preço Amazon adicionado ao produto existente`)
            return 'preco_adicionado'
        }
        return null
    }

    // Cria novo produto
    const { data: novoProduto, error } = await supabase
        .from('produtos')
        .insert({
            nome: produto.nome,
            marca,
            categoria,
            imagem_url: produto.imagem,
            palavras_chave: `${produto.nome} ${categoria} ${marca}`
        })
        .select()
        .single()

    if (error) {
        console.log(`   ❌ Erro ao criar produto: ${error.message}`)
        return null
    }

    // Adiciona preço
    await supabase.from('precos').insert({
        produto_id: novoProduto.id,
        loja: 'Amazon',
        preco: produto.preco,
        link_afiliado: produto.link,
        ultima_atualizacao: new Date().toISOString()
    })

    console.log(`   ✅ Novo produto criado com preço Amazon`)
    return 'novo_produto'
}

async function main() {
    console.log('=== SCRAPING AMAZON - FÓRMULA NATURAL E GUABI NATURAL ===\n')
    console.log('⚠️ Abrindo navegador...\n')

    const browser = await puppeteer.launch({
        headless: false, // Modo visível para debug
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,800']
    })

    const page = await browser.newPage()
    await page.setViewport({ width: 1280, height: 800 })
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')

    let totalNovos = 0
    let totalPrecos = 0

    for (const busca of TERMOS_BUSCA) {
        const produtos = await buscarNaAmazon(page, busca.termo)

        for (const produto of produtos) {
            const resultado = await salvarProduto(produto, busca.categoria, busca.marca)
            if (resultado === 'novo_produto') totalNovos++
            if (resultado === 'preco_adicionado') totalPrecos++
        }

        // Delay entre buscas
        const delayTime = 4000 + Math.random() * 2000
        console.log(`   ⏳ Aguardando ${(delayTime / 1000).toFixed(1)}s...`)
        await delay(delayTime)
    }

    await browser.close()
    console.log(`\n🏁 Finalizado!`)
    console.log(`   📦 ${totalNovos} novos produtos adicionados`)
    console.log(`   💰 ${totalPrecos} preços adicionados a produtos existentes`)
}

main().catch(console.error)
