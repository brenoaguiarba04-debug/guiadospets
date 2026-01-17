// Script para inserir produtos iniciais no Supabase
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://wgyosfpkctbpeoyxddec.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndneW9zZnBrY3RicGVveXhkZGVjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg2MTMzMTEsImV4cCI6MjA4NDE4OTMxMX0.uQhOqsiVj2JUEjSyIBT5x1wzEMNIzHBzWk5m4L8XX8w'

const supabase = createClient(supabaseUrl, supabaseKey)

const produtos = [
    { nome: 'Ração Golden Special Cães Adultos Frango e Carne 15kg', marca: 'Golden', categoria: 'Ração', imagem_url: 'https://images.tcdn.com.br/img/img_prod/785887/racao_golden_special_caes_adultos_frango_e_carne_15kg_1_c3f8db8fcd79aeb18d60c3b2c6c3c97f.jpg' },
    { nome: 'Ração Golden Special Cães Adultos Frango e Carne 10.1kg', marca: 'Golden', categoria: 'Ração', imagem_url: 'https://images.tcdn.com.br/img/img_prod/785887/racao_golden_special_caes_adultos_frango_e_carne_15kg_1_c3f8db8fcd79aeb18d60c3b2c6c3c97f.jpg' },
    { nome: 'Ração Golden Special Cães Adultos Frango e Carne 3kg', marca: 'Golden', categoria: 'Ração', imagem_url: 'https://images.tcdn.com.br/img/img_prod/785887/racao_golden_special_caes_adultos_frango_e_carne_15kg_1_c3f8db8fcd79aeb18d60c3b2c6c3c97f.jpg' },
    { nome: 'Ração Premier Formula Cães Adultos Raças Pequenas 15kg', marca: 'Premier', categoria: 'Ração', imagem_url: 'https://www.petz.com.br/fotos/1607703832519.jpg' },
    { nome: 'Ração Premier Formula Cães Adultos Raças Grandes 15kg', marca: 'Premier', categoria: 'Ração', imagem_url: 'https://www.petz.com.br/fotos/1607703832519.jpg' },
    { nome: 'Bravecto Cães 10 a 20kg 1 Comprimido', marca: 'MSD', categoria: 'Antipulgas', imagem_url: 'https://www.petz.com.br/fotos/1607703832520.jpg' },
    { nome: 'Bravecto Cães 20 a 40kg 1 Comprimido', marca: 'MSD', categoria: 'Antipulgas', imagem_url: 'https://www.petz.com.br/fotos/1607703832520.jpg' },
    { nome: 'Bravecto Cães 4.5 a 10kg 1 Comprimido', marca: 'MSD', categoria: 'Antipulgas', imagem_url: 'https://www.petz.com.br/fotos/1607703832520.jpg' },
    { nome: 'NexGard Spectra Cães 3.6 a 7.5kg 1 Tablete', marca: 'Boehringer', categoria: 'Antipulgas', imagem_url: 'https://www.petz.com.br/fotos/1585080054187.jpg' },
    { nome: 'NexGard Spectra Cães 7.6 a 15kg 1 Tablete', marca: 'Boehringer', categoria: 'Antipulgas', imagem_url: 'https://www.petz.com.br/fotos/1585080054187.jpg' },
    { nome: 'NexGard Spectra Cães 15 a 30kg 1 Tablete', marca: 'Boehringer', categoria: 'Antipulgas', imagem_url: 'https://www.petz.com.br/fotos/1585080054187.jpg' },
    { nome: 'Simparic 20mg Cães 5 a 10kg 1 Comprimido', marca: 'Zoetis', categoria: 'Antipulgas', imagem_url: 'https://images.tcdn.com.br/img/img_prod/785887/simparic_20mg_1_comprimido_caes_5_a_10kg_1_1_20190614153203.jpg' },
    { nome: 'Simparic 40mg Cães 10 a 20kg 1 Comprimido', marca: 'Zoetis', categoria: 'Antipulgas', imagem_url: 'https://images.tcdn.com.br/img/img_prod/785887/simparic_20mg_1_comprimido_caes_5_a_10kg_1_1_20190614153203.jpg' },
]

const precos = [
    { produto_idx: 0, loja: 'Amazon', preco: 179.90, link_afiliado: 'https://amazon.com.br' },
    { produto_idx: 0, loja: 'Petz', preco: 189.90, link_afiliado: 'https://petz.com.br' },
    { produto_idx: 0, loja: 'Shopee', preco: 169.90, link_afiliado: 'https://shopee.com.br' },
    { produto_idx: 1, loja: 'Amazon', preco: 139.90, link_afiliado: 'https://amazon.com.br' },
    { produto_idx: 1, loja: 'Petz', preco: 149.90, link_afiliado: 'https://petz.com.br' },
    { produto_idx: 2, loja: 'Amazon', preco: 59.90, link_afiliado: 'https://amazon.com.br' },
    { produto_idx: 2, loja: 'Shopee', preco: 54.90, link_afiliado: 'https://shopee.com.br' },
    { produto_idx: 3, loja: 'Petz', preco: 249.90, link_afiliado: 'https://petz.com.br' },
    { produto_idx: 3, loja: 'Petlove', preco: 239.90, link_afiliado: 'https://petlove.com.br' },
    { produto_idx: 4, loja: 'Petz', preco: 259.90, link_afiliado: 'https://petz.com.br' },
    { produto_idx: 4, loja: 'Cobasi', preco: 254.90, link_afiliado: 'https://cobasi.com.br' },
    { produto_idx: 5, loja: 'Amazon', preco: 159.90, link_afiliado: 'https://amazon.com.br' },
    { produto_idx: 5, loja: 'Petz', preco: 169.90, link_afiliado: 'https://petz.com.br' },
    { produto_idx: 5, loja: 'Shopee', preco: 149.90, link_afiliado: 'https://shopee.com.br' },
    { produto_idx: 6, loja: 'Amazon', preco: 179.90, link_afiliado: 'https://amazon.com.br' },
    { produto_idx: 6, loja: 'Petlove', preco: 189.90, link_afiliado: 'https://petlove.com.br' },
    { produto_idx: 7, loja: 'Amazon', preco: 139.90, link_afiliado: 'https://amazon.com.br' },
    { produto_idx: 7, loja: 'Petz', preco: 149.90, link_afiliado: 'https://petz.com.br' },
    { produto_idx: 8, loja: 'Amazon', preco: 119.90, link_afiliado: 'https://amazon.com.br' },
    { produto_idx: 8, loja: 'Petz', preco: 129.90, link_afiliado: 'https://petz.com.br' },
    { produto_idx: 8, loja: 'Shopee', preco: 109.90, link_afiliado: 'https://shopee.com.br' },
    { produto_idx: 9, loja: 'Amazon', preco: 129.90, link_afiliado: 'https://amazon.com.br' },
    { produto_idx: 9, loja: 'Petlove', preco: 139.90, link_afiliado: 'https://petlove.com.br' },
    { produto_idx: 10, loja: 'Petz', preco: 149.90, link_afiliado: 'https://petz.com.br' },
    { produto_idx: 10, loja: 'Cobasi', preco: 144.90, link_afiliado: 'https://cobasi.com.br' },
    { produto_idx: 11, loja: 'Amazon', preco: 89.90, link_afiliado: 'https://amazon.com.br' },
    { produto_idx: 11, loja: 'Petz', preco: 99.90, link_afiliado: 'https://petz.com.br' },
    { produto_idx: 12, loja: 'Amazon', preco: 109.90, link_afiliado: 'https://amazon.com.br' },
    { produto_idx: 12, loja: 'Shopee', preco: 99.90, link_afiliado: 'https://shopee.com.br' },
]

async function seed() {
    console.log('🌱 Inserindo produtos...')

    // Inserir produtos
    const { data: produtosInseridos, error: erroProdutos } = await supabase
        .from('produtos')
        .insert(produtos)
        .select()

    if (erroProdutos) {
        console.error('❌ Erro ao inserir produtos:', erroProdutos.message)
        return
    }

    console.log(`✅ ${produtosInseridos.length} produtos inseridos!`)

    // Mapear preços com IDs reais
    const precosComIds = precos.map(p => ({
        produto_id: produtosInseridos[p.produto_idx].id,
        loja: p.loja,
        preco: p.preco,
        link_afiliado: p.link_afiliado,
        ultima_atualizacao: new Date().toISOString()
    }))

    // Inserir preços
    const { data: precosInseridos, error: erroPrecos } = await supabase
        .from('precos')
        .insert(precosComIds)
        .select()

    if (erroPrecos) {
        console.error('❌ Erro ao inserir preços:', erroPrecos.message)
        return
    }

    console.log(`✅ ${precosInseridos.length} preços inseridos!`)
    console.log('🎉 Seed completo!')
}

seed()
