/**
 * Script de Limpeza e Normalização do Banco de Dados
 * 
 * Este script:
 * 1. Normaliza nomes de produtos (pesos, sabores, espécie)
 * 2. Remove duplicatas óbvias
 * 3. Mescla preços de produtos similares
 * 4. Identifica e marca cachorro/gato
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://wgyosfpkctbpeoyxddec.supabase.co"
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndneW9zZnBrY3RicGVveXhkZGVjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg2MTMzMTEsImV4cCI6MjA4NDE4OTMxMX0.uQhOqsiVj2JUEjSyIBT5x1wzEMNIzHBzWk5m4L8XX8w"

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// =====================
// FUNÇÕES DE NORMALIZAÇÃO
// =====================

/**
 * Normaliza peso para formato padrão
 * "15.0kg" -> "15kg"
 * "15 kg" -> "15kg"
 * "10.1kg" -> "10kg"
 */
function normalizarPeso(texto) {
    if (!texto) return texto

    // Remove espaços e normaliza
    let result = texto
        // "15.0kg" ou "15.1kg" -> "15kg" (remove decimal desnecessário)
        .replace(/(\d+)\.[0-1]\s*kg/gi, '$1kg')
        // "15 kg" -> "15kg"
        .replace(/(\d+)\s+kg/gi, '$1kg')
        // "15KG" -> "15kg"
        .replace(/(\d+)KG/g, '$1kg')
    // "1.5kg" mantém (é significativo)
    // "500g" -> "0.5kg"? Não, mantém gramas

    return result
}

/**
 * Detecta se é para cachorro ou gato
 */
function detectarEspecie(nome) {
    const lower = nome.toLowerCase()

    // Gato
    if (lower.includes('gato') || lower.includes('felino') || lower.includes('cat ') ||
        lower.includes('feline') || lower.includes('kitten')) {
        return 'gato'
    }

    // Cachorro
    if (lower.includes('cão') || lower.includes('cães') || lower.includes('cachorro') ||
        lower.includes('dog ') || lower.includes('canino') || lower.includes('puppy')) {
        return 'cão'
    }

    // Tentar inferir pelo produto
    if (lower.includes('golden') || lower.includes('pedigree') || lower.includes('premier')) {
        // Essas marcas geralmente são para cães, mas podem ter linha de gatos
        if (!lower.includes('gato')) return 'cão'
    }

    return 'ambos'
}

/**
 * Extrai informações completas do nome do produto
 */
function extrairInfoProduto(nome) {
    const lower = nome.toLowerCase()

    // Marca
    const marcas = ['golden', 'premier', 'royal canin', 'pedigree', 'whiskas', 'magnus',
        'hills', 'purina', 'nestlé', 'bravecto', 'nexgard', 'simparic', 'viva verde']
    let marca = null
    for (const m of marcas) {
        if (lower.includes(m)) {
            marca = m.charAt(0).toUpperCase() + m.slice(1)
            break
        }
    }

    // Peso
    const pesoMatch = lower.match(/(\d+(?:[.,]\d+)?)\s*(kg|g)\b/i)
    const peso = pesoMatch ? `${pesoMatch[1]}${pesoMatch[2].toLowerCase()}` : null

    // Sabor
    const sabores = ['frango', 'carne', 'peixe', 'salmão', 'cordeiro', 'peru', 'bacon',
        'vegetais', 'arroz', 'chicken', 'beef', 'fish']
    let sabor = null
    for (const s of sabores) {
        if (lower.includes(s)) {
            sabor = s.charAt(0).toUpperCase() + s.slice(1)
            break
        }
    }

    // Fase
    let fase = 'adulto'
    if (lower.includes('filhote') || lower.includes('puppy') || lower.includes('kitten')) {
        fase = 'filhote'
    } else if (lower.includes('senior') || lower.includes('idoso') || lower.includes('7+') || lower.includes('mature')) {
        fase = 'senior'
    }

    // Porte (para cães)
    let porte = null
    if (lower.includes('pequeno') || lower.includes('small') || lower.includes('mini')) {
        porte = 'pequeno'
    } else if (lower.includes('médio') || lower.includes('medium')) {
        porte = 'médio'
    } else if (lower.includes('grande') || lower.includes('large')) {
        porte = 'grande'
    } else if (lower.includes('gigante') || lower.includes('giant')) {
        porte = 'gigante'
    }

    return { marca, peso, sabor, fase, porte, especie: detectarEspecie(nome) }
}

/**
 * Gera nome normalizado completo
 */
function gerarNomeNormalizado(nomeOriginal) {
    const info = extrairInfoProduto(nomeOriginal)
    const partes = []

    // Tipo de produto
    if (nomeOriginal.toLowerCase().includes('ração') || nomeOriginal.toLowerCase().includes('racao')) {
        partes.push('Ração')
    } else if (nomeOriginal.toLowerCase().includes('areia')) {
        partes.push('Areia')
    } else if (nomeOriginal.toLowerCase().includes('antipulgas') || nomeOriginal.toLowerCase().includes('bravecto') ||
        nomeOriginal.toLowerCase().includes('nexgard') || nomeOriginal.toLowerCase().includes('simparic')) {
        partes.push('Antipulgas')
    }

    // Marca
    if (info.marca) partes.push(info.marca)

    // Linha/Sabor
    if (info.sabor) partes.push(info.sabor)

    // Fase
    if (info.fase !== 'adulto') {
        partes.push(info.fase.charAt(0).toUpperCase() + info.fase.slice(1))
    }

    // Porte
    if (info.porte) {
        partes.push(`Porte ${info.porte.charAt(0).toUpperCase() + info.porte.slice(1)}`)
    }

    // Espécie
    if (info.especie === 'cão') {
        partes.push('para Cães')
    } else if (info.especie === 'gato') {
        partes.push('para Gatos')
    }

    // Peso
    if (info.peso) {
        partes.push(normalizarPeso(info.peso))
    }

    // Se não conseguiu extrair muito, retorna original normalizado
    if (partes.length < 3) {
        return normalizarPeso(nomeOriginal)
    }

    return partes.join(' ')
}

// =====================
// FUNÇÕES DE LIMPEZA
// =====================

async function buscarTodosProdutos() {
    const { data, error } = await supabase
        .from('produtos')
        .select('*, precos(*)')
        .order('nome')

    if (error) {
        console.error('Erro ao buscar produtos:', error)
        return []
    }
    return data || []
}

async function atualizarProduto(id, updates) {
    const { error } = await supabase
        .from('produtos')
        .update(updates)
        .eq('id', id)

    if (error) {
        console.error(`Erro ao atualizar produto ${id}:`, error)
        return false
    }
    return true
}

async function excluirProduto(id) {
    // Primeiro exclui preços
    await supabase.from('precos').delete().eq('produto_id', id)
    // Depois exclui produto
    const { error } = await supabase.from('produtos').delete().eq('id', id)
    if (error) {
        console.error(`Erro ao excluir produto ${id}:`, error)
        return false
    }
    return true
}

async function moverPrecos(produtoOrigemId, produtoDestinoId) {
    const { error } = await supabase
        .from('precos')
        .update({ produto_id: produtoDestinoId })
        .eq('produto_id', produtoOrigemId)

    if (error) {
        console.error(`Erro ao mover preços:`, error)
        return false
    }
    return true
}

// =====================
// PROCESSO PRINCIPAL
// =====================

async function main() {
    console.log('🧹 LIMPEZA DO BANCO DE DADOS')
    console.log('============================\n')

    const produtos = await buscarTodosProdutos()
    console.log(`📦 Total de produtos: ${produtos.length}\n`)

    // 1. Analisar e categorizar
    const analise = produtos.map(p => ({
        id: p.id,
        nomeOriginal: p.nome,
        nomeNormalizado: gerarNomeNormalizado(p.nome),
        info: extrairInfoProduto(p.nome),
        precos: p.precos?.length || 0
    }))

    // 2. Identificar duplicatas (nomes muito similares)
    const duplicatas = []
    for (let i = 0; i < analise.length; i++) {
        for (let j = i + 1; j < analise.length; j++) {
            const a = analise[i]
            const b = analise[j]

            // Se mesma marca + mesmo peso + mesma espécie = provável duplicata
            if (a.info.marca && a.info.marca === b.info.marca &&
                a.info.peso && a.info.peso === b.info.peso &&
                a.info.especie === b.info.especie &&
                a.info.fase === b.info.fase) {
                duplicatas.push({ a, b })
            }
        }
    }

    console.log(`🔍 Duplicatas potenciais encontradas: ${duplicatas.length}`)
    duplicatas.slice(0, 10).forEach(d => {
        console.log(`   - "${d.a.nomeOriginal}" ↔ "${d.b.nomeOriginal}"`)
    })

    // 3. Mostrar sugestões de normalização
    console.log('\n📝 Sugestões de normalização:')
    analise.slice(0, 20).forEach(a => {
        if (a.nomeOriginal !== a.nomeNormalizado && a.nomeNormalizado.length > 10) {
            console.log(`   "${a.nomeOriginal}"`)
            console.log(`   → "${a.nomeNormalizado}"`)
            console.log('')
        }
    })

    // 4. Contagem por espécie
    const porEspecie = analise.reduce((acc, a) => {
        acc[a.info.especie] = (acc[a.info.especie] || 0) + 1
        return acc
    }, {})
    console.log('\n🐾 Produtos por espécie:')
    Object.entries(porEspecie).forEach(([esp, count]) => {
        console.log(`   ${esp}: ${count}`)
    })

    // 5. Perguntar se quer aplicar
    console.log('\n⚠️  Para aplicar as normalizações, rode com --apply')
    console.log('    node scripts/cleanup-database.mjs --apply')

    // Se flag --apply foi passada
    if (process.argv.includes('--apply')) {
        console.log('\n🔧 APLICANDO NORMALIZAÇÕES...\n')

        let atualizados = 0
        let excluidos = 0

        for (const a of analise) {
            // Atualizar nome se diferente e melhor
            if (a.nomeNormalizado !== a.nomeOriginal && a.nomeNormalizado.length > 10) {
                const sucesso = await atualizarProduto(a.id, {
                    nome: a.nomeNormalizado,
                    especie: a.info.especie !== 'ambos' ? a.info.especie : null
                })
                if (sucesso) {
                    atualizados++
                    console.log(`✅ Atualizado: ${a.nomeOriginal.slice(0, 40)}...`)
                }
            }
        }

        // Mesclar duplicatas (mover preços e excluir)
        for (const dup of duplicatas) {
            // Manter o que tem mais preços
            const manter = dup.a.precos >= dup.b.precos ? dup.a : dup.b
            const excluir = dup.a.precos >= dup.b.precos ? dup.b : dup.a

            await moverPrecos(excluir.id, manter.id)
            const sucesso = await excluirProduto(excluir.id)
            if (sucesso) {
                excluidos++
                console.log(`🗑️  Mesclado: "${excluir.nomeOriginal.slice(0, 30)}..." → "${manter.nomeOriginal.slice(0, 30)}..."`)
            }
        }

        console.log(`\n✨ Resumo: ${atualizados} atualizados, ${excluidos} mesclados/excluídos`)
    }
}

main().catch(console.error)
