/**
 * Script de scraping da Petlove - Versão Corrigida
 * Espera JavaScript carregar completamente
 */
import puppeteer from 'puppeteer-extra'
import StealthPlugin from 'puppeteer-extra-plugin-stealth'
import { createClient } from '@supabase/supabase-js'

puppeteer.use(StealthPlugin())

const SUPABASE_URL = 'https://wgyosfpkctbpeoyxddec.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndneW9zZnBrY3RicGVveXhkZGVjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg2MTMzMTEsImV4cCI6MjA4NDE4OTMxMX0.uQhOqsiVj2JUEjSyIBT5x1wzEMNIzHBzWk5m4L8XX8w'

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms))

const TERMOS_BUSCA = [
    { termo: 'ração golden', categoria: 'Ração', marca: 'Golden' },
    { termo: 'ração premier', categoria: 'Ração', marca: 'Premier' },
    { termo: 'bravecto', categoria: 'Antipulgas', marca: 'MSD' },
    { termo: 'nexgard', categoria: 'Antipulgas', marca: 'Boehringer' },
    { termo: 'simparic', categoria: 'Antipulgas', marca: 'Zoetis' },
    { termo: 'areia gato', categoria: 'Higiene', marca: 'Vários' },
]

async function buscarNaPetlove(page, termo) {
    console.log(`\n🔎 Petlove: "${termo}"...`)

    try {
        const url = `https://www.petlove.com.br/busca?q=${encodeURIComponent(termo)}`
        await page.goto(url, { waitUntil: 'networkidle0', timeout: 45000 })

        // Espera JS carregar
        await delay(5000)

        // Scroll para lazy loading
        await page.evaluate(() => window.scrollBy(0, 600))
        await delay(2000)

        const produtos = await page.evaluate(() => {
            const results = []

            // Seletores para Petlove
            const seletores = [
                '[data-testid="product-card"]',
                '[class*="ProductCard"]',
                '[class*="product-card"]',
                'article',
                '[class*="shelf"] li',
                '.product-item'
            ]

            let items = []
            for (const sel of seletores) {
                items = document.querySelectorAll(sel)
                if (items.length > 0) break
            }

            if (items.length === 0) {
                // Fallback
                return []
            }

            for (const item of Array.from(items).slice(0, 5)) {
                try {
                    const nomeEl = item.querySelector('h2, h3, [class*="name"], [class*="title"], [class*="Name"], p')
                    const precoEl = item.querySelector('[class*="price"], [class*="Price"], [class*="valor"], span[class*="price"]')

                    if (!nomeEl || !precoEl) continue

                    let precoText = precoEl.textContent
                    // Extrai apenas números
                    const match = precoText.match(/([\d.,]+)/)
                    if (!match) continue

                    const precoStr = match[1].replace(/\./g, '').replace(',', '.')
                    const preco = parseFloat(precoStr)

                    if (!preco || isNaN(preco) || preco < 5) continue

                    const imgEl = item.querySelector('img')
                    const linkEl = item.querySelector('a')

                    let link = null
                    if (linkEl) {
                        const href = linkEl.getAttribute('href') || ''
                        link = href.startsWith('http') ? href : 'https://www.petlove.com.br' + href
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
            console.log(`   ✅ Encontrados: ${produtos.length}`)
            produtos.forEach((p, i) => console.log(`      ${i + 1}. R$ ${p.preco.toFixed(2)} - ${p.nome.slice(0, 40)}...`))
        } else {
            console.log(`   ⚠️ Nenhum encontrado`)
            await page.screenshot({ path: `debug-petlove-${Date.now()}.png` })
        }

        return produtos
    } catch (error) {
        console.log(`   ❌ Erro: ${error.message}`)
        return []
    }
}

async function salvarProduto(produto, categoria, marca) {
    const { data: existente } = await supabase
        .from('produtos')
        .select('id')
        .ilike('nome', `%${produto.nome.slice(0, 25)}%`)
        .single()

    if (existente) {
        const { data: precoExiste } = await supabase
            .from('precos')
            .select('id')
            .eq('produto_id', existente.id)
            .eq('loja', 'Petlove')
            .single()

        if (!precoExiste) {
            await supabase.from('precos').insert({
                produto_id: existente.id,
                loja: 'Petlove',
                preco: produto.preco,
                link_afiliado: produto.link,
                ultima_atualizacao: new Date().toISOString()
            })
            console.log(`   💾 Preço Petlove adicionado`)
            return true
        }
        return false
    }

    const { data: novoProduto, error } = await supabase
        .from('produtos')
        .insert({
            nome: produto.nome,
            marca,
            categoria,
            imagem_url: produto.imagem
        })
        .select()
        .single()

    if (error) return false

    await supabase.from('precos').insert({
        produto_id: novoProduto.id,
        loja: 'Petlove',
        preco: produto.preco,
        link_afiliado: produto.link
    })

    console.log(`   ✅ Novo produto criado`)
    return true
}

async function main() {
    console.log('=== SCRAPING PETLOVE (Modo Debug) ===\n')

    const browser = await puppeteer.launch({
        headless: false,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1400,900'],
        defaultViewport: { width: 1400, height: 900 }
    })

    const page = await browser.newPage()
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36')

    let totalAdicionados = 0

    for (const busca of TERMOS_BUSCA) {
        const produtos = await buscarNaPetlove(page, busca.termo)

        for (const produto of produtos) {
            const adicionado = await salvarProduto(produto, busca.categoria, busca.marca)
            if (adicionado) totalAdicionados++
        }

        await delay(4000)
    }

    await browser.close()
    console.log(`\n🏁 Finalizado! ${totalAdicionados} produtos/preços Petlove adicionados.`)
}

main().catch(console.error)
