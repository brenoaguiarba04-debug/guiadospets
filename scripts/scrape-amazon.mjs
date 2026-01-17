/**
 * Script de scraping da Amazon Brasil - Versão 2
 * Usa seletores mais robustos e modo headful para debug
 */
import puppeteer from 'puppeteer-extra'
import StealthPlugin from 'puppeteer-extra-plugin-stealth'
import { createClient } from '@supabase/supabase-js'

puppeteer.use(StealthPlugin())

const SUPABASE_URL = 'https://wgyosfpkctbpeoyxddec.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndneW9zZnBrY3RicGVveXhkZGVjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg2MTMzMTEsImV4cCI6MjA4NDE4OTMxMX0.uQhOqsiVj2JUEjSyIBT5x1wzEMNIzHBzWk5m4L8XX8w'

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms))

// Termos de busca para produtos pet populares
const TERMOS_BUSCA = [
    { termo: 'racao golden cachorro 15kg', categoria: 'Ração', marca: 'Golden' },
    { termo: 'racao premier cachorro adulto', categoria: 'Ração', marca: 'Premier' },
    { termo: 'racao royal canin cachorro', categoria: 'Ração', marca: 'Royal Canin' },
    { termo: 'racao pedigree adulto', categoria: 'Ração', marca: 'Pedigree' },
    { termo: 'bravecto 10 a 20kg', categoria: 'Antipulgas', marca: 'MSD' },
    { termo: 'nexgard spectra cachorro', categoria: 'Antipulgas', marca: 'Boehringer' },
    { termo: 'simparic cachorro', categoria: 'Antipulgas', marca: 'Zoetis' },
    { termo: 'areia gato pipicat', categoria: 'Higiene', marca: 'Pipicat' },
    { termo: 'areia sanitaria gato silica', categoria: 'Higiene', marca: 'Vários' },
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

            for (const item of Array.from(items).slice(0, 3)) {
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
            return true
        }
        return false
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
        return false
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
    return true
}

async function main() {
    console.log('=== SCRAPING AMAZON BRASIL ===\n')
    console.log('⚠️ Abrindo navegador em modo visível para debug...\n')

    const browser = await puppeteer.launch({
        headless: false, // Modo visível para debug
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,800']
    })

    const page = await browser.newPage()
    await page.setViewport({ width: 1280, height: 800 })
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')

    let totalAdicionados = 0

    for (const busca of TERMOS_BUSCA) {
        const produtos = await buscarNaAmazon(page, busca.termo)

        for (const produto of produtos) {
            const adicionado = await salvarProduto(produto, busca.categoria, busca.marca)
            if (adicionado) totalAdicionados++
        }

        // Delay entre buscas
        const delayTime = 4000 + Math.random() * 2000
        console.log(`   ⏳ Aguardando ${(delayTime / 1000).toFixed(1)}s...`)
        await delay(delayTime)
    }

    await browser.close()
    console.log(`\n🏁 Finalizado! ${totalAdicionados} produtos/preços adicionados.`)
}

main().catch(console.error)
