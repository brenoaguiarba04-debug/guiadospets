// Script para atualizar imagens dos produtos com URLs que realmente funcionam
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://wgyosfpkctbpeoyxddec.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndneW9zZnBrY3RicGVveXhkZGVjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg2MTMzMTEsImV4cCI6MjA4NDE4OTMxMX0.uQhOqsiVj2JUEjSyIBT5x1wzEMNIzHBzWk5m4L8XX8w'

const supabase = createClient(supabaseUrl, supabaseKey)

// Imagens de unsplash que funcionam (imagens de pets/produtos)
const imagens = {
    'racao': 'https://images.unsplash.com/photo-1589924691995-400dc9ecc119?w=400&h=400&fit=crop',
    'antipulgas': 'https://images.unsplash.com/photo-1628009368231-7bb7cfcb0def?w=400&h=400&fit=crop',
    'golden': 'https://images.unsplash.com/photo-1589924691995-400dc9ecc119?w=400&h=400&fit=crop',
    'premier': 'https://images.unsplash.com/photo-1568640347023-a616a30bc3bd?w=400&h=400&fit=crop',
    'bravecto': 'https://images.unsplash.com/photo-1512237798647-84b57b22b517?w=400&h=400&fit=crop',
    'nexgard': 'https://images.unsplash.com/photo-1583511655826-05700d52f4d9?w=400&h=400&fit=crop',
    'simparic': 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=400&h=400&fit=crop',
}

async function updateImages() {
    console.log('🖼️ Atualizando imagens dos produtos com URLs válidas...')

    const { data: produtos, error } = await supabase
        .from('produtos')
        .select('id, nome, marca, categoria')

    if (error) {
        console.error('❌ Erro:', error.message)
        return
    }

    for (const produto of produtos) {
        let novaImagem = null
        const nome = produto.nome.toLowerCase()

        // Determina a imagem baseada no nome ou marca
        if (nome.includes('golden')) {
            novaImagem = imagens['golden']
        } else if (nome.includes('premier')) {
            novaImagem = imagens['premier']
        } else if (nome.includes('bravecto')) {
            novaImagem = imagens['bravecto']
        } else if (nome.includes('nexgard')) {
            novaImagem = imagens['nexgard']
        } else if (nome.includes('simparic')) {
            novaImagem = imagens['simparic']
        } else if (produto.categoria === 'Ração') {
            novaImagem = imagens['racao']
        } else if (produto.categoria === 'Antipulgas') {
            novaImagem = imagens['antipulgas']
        }

        if (novaImagem) {
            const { error: updateError } = await supabase
                .from('produtos')
                .update({ imagem_url: novaImagem })
                .eq('id', produto.id)

            if (updateError) {
                console.error(`❌ Erro ao atualizar ${produto.nome}:`, updateError.message)
            } else {
                console.log(`✅ Atualizado: ${produto.nome}`)
            }
        }
    }

    console.log('🎉 Imagens atualizadas com sucesso!')
}

updateImages()
