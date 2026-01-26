import { supabase } from '@/lib/supabase'
import { unstable_cache } from 'next/cache'

/**
 * Funções utilitárias migradas do Flask para Next.js
 */

/**
 * Detecta peso inteligente do nome do produto para exibição no botão.
 */
export function extrairPesoParaBotao(nome: string): string {
    if (!nome) return "Ver"

    const n = nome.toLowerCase()

    // REGRA 1: Faixas de peso (Ex: "2 a 4kg", "4.5-10 kg", "10.1kg a 25kg")
    const matchFaixa = n.match(/(\d+[.,]?\d*)\s*(?:a|-|à|ate|té)\s*(\d+[.,]?\d*)\s*kg/)
    if (matchFaixa) {
        const p1 = parseFloat(matchFaixa[1].replace(',', '.'))
        const p2 = parseFloat(matchFaixa[2].replace(',', '.'))

        // Aumentado o limite de diferença de peso para capturar faixas maiores como 30-60kg
        if (Math.abs(p2 - p1) < 60) {
            return `${p1}-${p2}kg`
        }
    }

    // REGRA 2: Peso único em KG (Ex: "15kg", "10 kg", "10.1kg")
    const matchKg = n.match(/(\d+[.,]?\d*)\s*kg/)
    if (matchKg) {
        const peso = matchKg[1].replace(',', '.')
        return `${peso}kg`
    }

    // REGRA 3: Quantidade (Unidades/Tabletes)
    if (['comprimido', 'tablete', 'un'].some(termo => n.includes(termo))) {
        const matchQtd = n.match(/(\d+)\s*(?:un|comp|tab)/)
        if (matchQtd) {
            return `${matchQtd[1]} Un.`
        }
    }

    // REGRA 4: MG (Miligramas)
    const marcasComPeso = ['bravecto', 'nexgard']
    if (n.includes('mg') && !marcasComPeso.some(marca => n.includes(marca))) {
        const matchMg = n.match(/(\d+)\s*mg/)
        if (matchMg) {
            return `${matchMg[1]}mg`
        }
    }

    // REGRA 5: Tamanhos (P, M, G, XG, GG) - Útil para coleiras ou variações sem peso explícito
    // Deve ser a última regra antes do fallback para não sobrescrever pesos reais
    const tamanhos = [
        { regex: /\b(p|pp|pequeno|mini)\b/, label: "P" },
        { regex: /\b(m|medio|medium)\b/, label: "M" },
        { regex: /\b(g|grande|large|maxi)\b/, label: "G" },
        { regex: /\b(gg|xg|gigante|giant)\b/, label: "GG" }
    ]

    for (const t of tamanhos) {
        if (t.regex.test(n)) {
            // Se já não encontramos KG ou MG, usaremos o tamanho
            // Mas apenas se não conflitar com regras anteriores que já retornaram
            return t.label
        }
    }

    return "Ver"
}

/**
 * Define o grupo de agrupamento para produtos similares.
 * VERSÃO MELHORADA: Inclui sabor, espécie, porte e fase
 */
export function definirGrupo(nome: string): string {
    if (!nome) return "Produto Sem Nome"

    const n = nome.toLowerCase()

    // =====================
    // DETECTAR COMPONENTES
    // =====================

    // Espécie
    let especie = ''
    if (n.includes('gato') || n.includes('felino') || n.includes('cat ') || n.includes('feline')) {
        especie = 'Gatos'
    } else if (n.includes('cão') || n.includes('cães') || n.includes('cachorro') || n.includes('dog') || n.includes('canino')) {
        especie = 'Cães'
    }

    // Fase
    let fase = ''
    if (n.includes('filhote') || n.includes('puppy') || n.includes('kitten') || n.includes('junior')) {
        fase = 'Filhotes'
    } else if (n.includes('senior') || n.includes('idoso') || n.includes('7+') || n.includes('mature')) {
        fase = 'Sênior'
    } else if (n.includes('castrado') || n.includes('sterili')) {
        fase = 'Castrados'
    } else if (n.includes('light') || n.includes('obeso') || n.includes('peso')) {
        fase = 'Light'
    } else if (n.includes('adult')) {
        fase = 'Adultos'
    }

    // Porte (cães)
    let porte = ''
    if (n.includes('pequeno') || n.includes('small') || n.includes('mini') || n.includes('toy')) {
        porte = 'Peq.'
    } else if (n.includes('médio') || n.includes('medio') || n.includes('medium')) {
        porte = 'Méd.'
    } else if (n.includes('gigante') || n.includes('giant') || n.includes('maxi')) {
        porte = 'Gig.'
    } else if (n.includes('grande') || n.includes('large')) {
        porte = 'Gde.'
    }

    // Sabor
    let sabor = ''
    const sabores = [
        { termo: 'frango', label: 'Frango' },
        { termo: 'carne', label: 'Carne' },
        { termo: 'salmão', label: 'Salmão' },
        { termo: 'salmon', label: 'Salmão' },
        { termo: 'cordeiro', label: 'Cordeiro' },
        { termo: 'peru', label: 'Peru' },
        { termo: 'peixe', label: 'Peixe' },
        { termo: 'vegetal', label: 'Vegetais' },
        { termo: 'arroz', label: 'Arroz' }
    ]
    for (const s of sabores) {
        if (n.includes(s.termo)) {
            sabor = s.label
            break
        }
    }

    // =====================
    // ANTIPULGAS
    // =====================

    if (n.includes('nexgard')) {
        const tipo = n.includes('spectra') ? "Spectra" : ""
        // Improved regex to catch "3 tabletes", "c/3", "cx 3", "3un", "3 un", "3 unidades", "3 doses"
        const is3Pack = /(?:3\s*(?:uni|tab|comp|dos|caps)|cx\s*3|pack\s*3|c\/\s*3|c\/3)/i.test(n)
        const qtd = is3Pack ? "3 Comp." : "1 Comp."

        // Normalização extra para Nexgard: Garante que todos Nexgard Spectra Cães caiam no mesmo grupo
        if (tipo === "Spectra") {
            return `NexGard Spectra ${qtd}`
        }
        return `NexGard ${qtd}`.trim()
    }

    if (n.includes('bravecto')) {
        const tipo = ['transdermal', 'pipeta', 'topico'].some(t => n.includes(t))
            ? "Transdermal"
            : "Mastigável"
        const animal = especie ? `para ${especie}` : ''
        return `Bravecto ${tipo} ${animal}`.trim()
    }

    if (n.includes('simparic')) {
        const is3Pack = /(?:3\s*(?:uni|tab|comp|dos|caps)|cx\s*3|pack\s*3|c\/\s*3|c\/3)/i.test(n)
        const qtd = is3Pack ? "3 Comp." : "1 Comp."
        return `Simparic ${qtd}`
    }

    // =====================
    // RAÇÕES GOLDEN
    // =====================

    if (n.includes('golden')) {
        let linha = ''
        if (n.includes('special')) linha = 'Special'
        else if (n.includes('formula') || n.includes('fórmula')) linha = 'Fórmula'
        else if (n.includes('selecao') || n.includes('seleção')) linha = 'Seleção Natural'
        else if (n.includes('mega')) linha = 'Mega'

        const partes = ['Ração Golden', linha, sabor, fase, porte, especie ? `para ${especie}` : '']
        return partes.filter(p => p).join(' ')
    }

    // =====================
    // RAÇÕES PREMIER
    // =====================

    if (n.includes('premier')) {
        let linha = ''
        if (n.includes('formula') || n.includes('fórmula')) linha = 'Fórmula'
        else if (n.includes('especifica') || n.includes('raça')) linha = 'Raças Específicas'
        else if (n.includes('nattu')) linha = 'Nattu'
        else if (n.includes('cookie')) linha = 'Cookie'

        const partes = ['Ração Premier', linha, sabor, fase, porte, especie ? `para ${especie}` : '']
        return partes.filter(p => p).join(' ')
    }

    // =====================
    // RAÇÕES ROYAL CANIN
    // =====================

    if (n.includes('royal canin')) {
        // Tentar pegar a linha específica
        let linha = ''
        const linhas = ['urinary', 'satiety', 'hypoallergenic', 'gastro', 'renal', 'hepatic', 'indoor', 'outdoor', 'fit']
        for (const l of linhas) {
            if (n.includes(l)) {
                linha = l.charAt(0).toUpperCase() + l.slice(1)
                break
            }
        }

        const partes = ['Ração Royal Canin', linha, fase, porte, especie ? `para ${especie}` : '']
        return partes.filter(p => p).join(' ')
    }

    // =====================
    // FÓRMULA NATURAL (Adimax)
    // =====================

    if (n.includes('formula natural') || n.includes('fórmula natural')) {
        let linha = ''
        if (n.includes('life')) linha = 'Life'
        else if (n.includes('fresh meat')) linha = 'Fresh Meat'
        else if (n.includes('pro')) linha = 'Pro'

        // Detecção de sabor específico Fórmula Natural
        let saborFN = ''
        if (n.includes('frango')) saborFN = 'Frango'
        else if (n.includes('cordeiro')) saborFN = 'Cordeiro'
        else if (n.includes('salmão') || n.includes('salmon')) saborFN = 'Salmão'
        else if (n.includes('carne')) saborFN = 'Carne'
        else if (n.includes('peru')) saborFN = 'Peru'

        const partes = ['Ração Fórmula Natural', linha, saborFN, fase, porte, especie ? `para ${especie}` : '']
        return partes.filter(p => p).join(' ')
    }

    // =====================
    // GUABI NATURAL
    // =====================

    if (n.includes('guabi natural')) {
        // Detecção de sabor específico Guabi Natural
        let saborGN = ''
        if (n.includes('frango') && n.includes('arroz')) saborGN = 'Frango e Arroz'
        else if (n.includes('cordeiro') && n.includes('aveia')) saborGN = 'Cordeiro e Aveia'
        else if (n.includes('salmão') || n.includes('salmon')) saborGN = 'Salmão'
        else if (n.includes('frango')) saborGN = 'Frango'
        else if (n.includes('cordeiro')) saborGN = 'Cordeiro'
        else if (n.includes('carne')) saborGN = 'Carne'

        const partes = ['Ração Guabi Natural', saborGN, fase, porte, especie ? `para ${especie}` : '']
        return partes.filter(p => p).join(' ')
    }

    // =====================
    // GRAN PLUS (Guabi)
    // =====================

    if (n.includes('gran plus')) {
        let linha = ''
        if (n.includes('choice')) linha = 'Choice'
        else if (n.includes('menu')) linha = 'Menu'

        let saborGP = ''
        if (n.includes('frango') && n.includes('carne')) saborGP = 'Frango e Carne'
        else if (n.includes('frango')) saborGP = 'Frango'
        else if (n.includes('carne')) saborGP = 'Carne'
        else if (n.includes('salmão') || n.includes('salmon')) saborGP = 'Salmão'

        const partes = ['Ração Gran Plus', linha, saborGP, fase, porte, especie ? `para ${especie}` : '']
        return partes.filter(p => p).join(' ')
    }

    // =====================
    // HILL'S
    // =====================

    if (n.includes('hill') || n.includes("hill's")) {
        let linha = ''
        if (n.includes('prescription')) linha = 'Prescription Diet'
        else if (n.includes('science diet')) linha = 'Science Diet'
        else if (n.includes('vet essentials')) linha = 'Vet Essentials'

        // Condições específicas
        let condicao = ''
        if (n.includes('urinary')) condicao = 'Urinary'
        else if (n.includes('renal') || n.includes('k/d')) condicao = 'Renal'
        else if (n.includes('gastro') || n.includes('i/d')) condicao = 'Gastrointestinal'
        else if (n.includes('weight') || n.includes('r/d')) condicao = 'Weight'
        else if (n.includes('metabolic')) condicao = 'Metabolic'

        const partes = ["Ração Hill's", linha, condicao, fase, porte, especie ? `para ${especie}` : '']
        return partes.filter(p => p).join(' ')
    }

    // =====================
    // N&D / FARMINA
    // =====================

    if (n.includes('n&d') || n.includes('farmina') || n.includes('n & d')) {
        let linha = ''
        if (n.includes('prime')) linha = 'Prime'
        else if (n.includes('ancestral')) linha = 'Ancestral Grain'
        else if (n.includes('pumpkin') || n.includes('abóbora')) linha = 'Pumpkin'
        else if (n.includes('quinoa')) linha = 'Quinoa'
        else if (n.includes('ocean')) linha = 'Ocean'
        else if (n.includes('grain free')) linha = 'Grain Free'

        let saborND = ''
        if (n.includes('frango')) saborND = 'Frango'
        else if (n.includes('cordeiro')) saborND = 'Cordeiro'
        else if (n.includes('javali') || n.includes('boar')) saborND = 'Javali'
        else if (n.includes('peixe') || n.includes('fish')) saborND = 'Peixe'
        else if (n.includes('bacalhau') || n.includes('cod')) saborND = 'Bacalhau'

        const partes = ['Ração N&D', linha, saborND, fase, porte, especie ? `para ${especie}` : '']
        return partes.filter(p => p).join(' ')
    }

    // =====================
    // AREIA
    // =====================

    if (n.includes('areia')) {
        if (n.includes('viva verde')) return 'Areia Viva Verde para Gatos'
        if (n.includes('pipicat')) return 'Areia Pipicat para Gatos'
        return 'Areia Higiênica para Gatos'
    }

    // =====================
    // PEDIGREE
    // =====================

    if (n.includes('pedigree')) {
        const partes = ['Ração Pedigree', sabor, fase, porte, especie ? `para ${especie}` : '']
        return partes.filter(p => p).join(' ')
    }

    // =====================
    // WHISKAS
    // =====================

    if (n.includes('whiskas')) {
        const partes = ['Ração Whiskas', sabor, fase, 'para Gatos']
        return partes.filter(p => p).join(' ')
    }

    // =====================
    // FALLBACK: Retornar nome original limpo
    // =====================

    // Remove peso do nome para agrupar variações
    let nomeGrupo = nome
        .replace(/\d+[.,]?\d*\s*kg/gi, '') // Remove "15kg"
        .replace(/\d+[.,]?\d*\s*g\b/gi, '') // Remove "500g"
        .replace(/\s+/g, ' ') // Remove espaços extras
        .trim()

    // Se ficou muito curto, retorna original
    if (nomeGrupo.length < 10) return nome

    return nomeGrupo
}

/**
 * Formata preço para exibição em BRL
 */
export function formatarPreco(valor: number): string {
    return valor.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    })
}

/**
 * Retorna o emoji/badge da loja
 */
export function getStoreBadge(loja: string): { emoji: string; className: string } {
    const stores: Record<string, { emoji: string; className: string }> = {
        'Petz': { emoji: '🐾', className: 'bg-blue-100 text-blue-700' },
        'Petlove': { emoji: '💜', className: 'bg-purple-100 text-purple-700' },
        'Cobasi': { emoji: '🏪', className: 'bg-green-100 text-green-700' },
        'Amazon': { emoji: '📦', className: 'bg-orange-100 text-orange-700' },
        'Manual': { emoji: '📦', className: 'bg-orange-100 text-orange-700' },
        'Shopee': { emoji: '🧡', className: 'bg-orange-100 text-orange-600' },
        'Mercado Livre': { emoji: '🛒', className: 'bg-yellow-100 text-yellow-700' },
    }

    return stores[loja] || { emoji: '🏪', className: 'bg-gray-100 text-gray-700' }
}

export interface Variacao {
    id: number
    label: string
    imagem: string
    preco: number
    loja: string
}

export interface Grupo {
    nomePrincipal: string
    imagemCapa: string
    lojaCapa?: string
    menorPrecoCapa: number
    variacoes: Variacao[]
    labelsUsados: Set<string>
}

export async function getProdutos(searchTerm?: string) {
    let query = supabase
        .from('produtos')
        .select(`
      id,
      nome,
      marca,
      imagem_url,
      precos (
        preco,
        loja,
        link_afiliado
      )
    `)

    if (searchTerm) {
        query = query.ilike('nome', `%${searchTerm}%`)
    }

    const { data, error } = await query

    if (error) {
        console.error('Erro ao buscar produtos:', error)
        return []
    }

    return data || []
}

export const getCachedProdutos = unstable_cache(
    async () => getProdutos(),
    ['produtos-cache-key'],
    {
        revalidate: 3600, // 1 hour
        tags: ['produtos']
    }
)

export function agruparProdutos(produtos: any[]) {
    const grupos: Record<string, Grupo> = {}

    for (const p of produtos) {
        if (!p.nome) continue

        // Debug logging for NexGard
        if (p.nome.toLowerCase().includes('nexgard')) {
            console.log(`[DEBUG] Product: ${p.nome} -> Label: ${extrairPesoParaBotao(p.nome)} -> Group: ${definirGrupo(p.nome)}`)
        }

        // Pegar menor preço do produto
        const precos = p.precos || []
        const menorPrecoObj = precos.reduce((min: any, curr: any) =>
            (!min || (curr.preco > 0 && curr.preco < min.preco)) ? curr : min
            , null)

        const preco = menorPrecoObj?.preco || 0
        const loja = menorPrecoObj?.loja || ''
        const img = p.imagem_url || ''

        const nomeGrupo = definirGrupo(p.nome)
        const textoBotao = extrairPesoParaBotao(p.nome)

        if (!grupos[nomeGrupo]) {
            grupos[nomeGrupo] = {
                nomePrincipal: nomeGrupo,
                imagemCapa: img,
                lojaCapa: loja, // Track store for image priority
                menorPrecoCapa: preco,
                variacoes: [],
                labelsUsados: new Set()
            }
        }

        const grupoAtual = grupos[nomeGrupo]

        // Evita duplicatas
        if (!grupoAtual.labelsUsados.has(textoBotao)) {

            // Lógica de Melhor Imagem (Prioriza Lojas Confiáveis)
            const lojasConfiaveis = ['Petz', 'Amazon', 'Petlove', 'Cobasi', 'Magalu']
            const imagemAtualEhConfiavel = lojasConfiaveis.some(l => grupoAtual.lojaCapa?.includes(l))
            const novaImagemEhConfiavel = lojasConfiaveis.some(l => loja.includes(l))

            // Decisão de atualizar a capa (Imagem e Preço são tratados separadamente idealmente, mas aqui simplificamos)
            // Se não temos capa "confiável" ainda, e a nova é confiável -> ATUALIZA LINDA
            // Se ambas são confiáveis (ou ambas não), usa o menor preço como critério.

            let deveAtualizarCapa = false

            if (img && img.length > 10) {
                if (novaImagemEhConfiavel && !imagemAtualEhConfiavel) {
                    deveAtualizarCapa = true
                } else if (imagemAtualEhConfiavel && !novaImagemEhConfiavel) {
                    deveAtualizarCapa = false
                } else {
                    // Critério de desempate: Menor Preço
                    if (grupoAtual.menorPrecoCapa === 0 || preco < grupoAtual.menorPrecoCapa) {
                        deveAtualizarCapa = true
                    }
                }
            }

            if (deveAtualizarCapa) {
                grupoAtual.imagemCapa = img
                grupoAtual.lojaCapa = loja
            }

            // Atualiza sempre o menor preço visualizado (para o badge de preço)
            if (preco > 0 && (grupoAtual.menorPrecoCapa === 0 || preco < grupoAtual.menorPrecoCapa)) {
                grupoAtual.menorPrecoCapa = preco
            }

            grupoAtual.variacoes.push({
                id: p.id,
                label: textoBotao,
                imagem: img,
                preco: preco,
                loja: loja
            })
            grupoAtual.labelsUsados.add(textoBotao)
        }
    }

    // Normalização de Imagens: Se o grupo tem uma capa "Confiável", aplica ela nas variações "Não Confiáveis"
    const lojasConfiaveis = ['Petz', 'Amazon', 'Petlove', 'Cobasi', 'Magalu']

    for (const g of Object.values(grupos)) {
        // Ordena por preço
        g.variacoes.sort((a, b) => a.preco - b.preco)

        // Verifica se a capa é confiável
        const capaEhConfiavel = lojasConfiaveis.some(l => (g.lojaCapa || '').toLowerCase().includes(l.toLowerCase()))

        if (capaEhConfiavel) {
            g.variacoes.forEach(v => {
                const varEhConfiavel = lojasConfiaveis.some(l => (v.loja || '').toLowerCase().includes(l.toLowerCase()))
                // Se a variação não é confiável (ex: Shopee), usa a capa confiável (Petz/Amazon)
                if (!varEhConfiavel) {
                    v.imagem = g.imagemCapa
                }
            })
        }
    }

    return Object.values(grupos).map(g => ({
        nomePrincipal: g.nomePrincipal,
        imagemCapa: g.imagemCapa,
        menorPrecoCapa: g.menorPrecoCapa,
        variacoes: g.variacoes
    }))
}
