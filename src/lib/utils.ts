/**
 * Funções utilitárias migradas do Flask para Next.js
 */

/**
 * Detecta peso inteligente do nome do produto para exibição no botão.
 */
export function extrairPesoParaBotao(nome: string): string {
    if (!nome) return "Ver"

    const n = nome.toLowerCase()

    // REGRA 1: Faixas de peso (Ex: "2 a 4kg", "4.5-10 kg")
    const matchFaixa = n.match(/(\d+[.,]?\d*)\s*(?:a|-|à|ate)\s*(\d+[.,]?\d*)\s*kg/)
    if (matchFaixa) {
        const p1 = matchFaixa[1].replace(',', '.')
        const p2 = matchFaixa[2].replace(',', '.')
        return `${p1}-${p2}kg`
    }

    // REGRA 2: Peso único em KG (Ex: "15kg", "10 kg")
    const matchKg = n.match(/(\d+[.,]?\d*)\s*kg/)
    if (matchKg) {
        return `${matchKg[1].replace(',', '.')}kg`
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
        const qtd = /(?:3\s*uni|3\s*tab|3\s*comp|cx\s*3|pack\s*3)/.test(n) ? "3 Comp." : "1 Comp."
        return `NexGard ${tipo} ${qtd}`.trim()
    }

    if (n.includes('bravecto')) {
        const tipo = ['transdermal', 'pipeta', 'topico'].some(t => n.includes(t))
            ? "Transdermal"
            : "Mastigável"
        const animal = especie ? `para ${especie}` : ''
        return `Bravecto ${tipo} ${animal}`.trim()
    }

    if (n.includes('simparic')) {
        const qtd = /(?:3\s*uni|3\s*tab|3\s*comp)/.test(n) ? "3 Comp." : "1 Comp."
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
