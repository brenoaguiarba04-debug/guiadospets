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
 */
export function definirGrupo(nome: string): string {
    if (!nome) return "Produto Sem Nome"

    const n = nome.toLowerCase()

    // Antipulgas NexGard
    if (n.includes('nexgard')) {
        const tipo = n.includes('spectra') ? "Spectra" : "Tradicional"
        const qtd = /(?:3\s*uni|3\s*tab|3\s*comp|cx\s*3|pack\s*3)/.test(n) ? "Pack com 3" : "1 Tablete"
        return `NexGard ${tipo} - ${qtd}`
    }

    // Antipulgas Bravecto
    if (n.includes('bravecto')) {
        const tipo = ['transdermal', 'pipeta', 'topico'].some(t => n.includes(t))
            ? "Transdermal (Pipeta)"
            : "Mastigável"
        return `Bravecto ${tipo}`
    }

    // Antipulgas Simparic
    if (n.includes('simparic')) {
        const qtd = /(?:3\s*uni|3\s*tab|3\s*comp)/.test(n) ? "Pack com 3" : "1 Comp."
        return `Simparic - ${qtd}`
    }

    // Rações Golden
    if (n.includes('golden special')) return 'Ração Golden Special'
    if (n.includes('golden formula')) return 'Ração Golden Fórmula'
    if (n.includes('golden selecao') || n.includes('seleção natural')) return 'Ração Golden Sel. Natural'

    // Rações Premier
    if (n.includes('premier')) {
        if (n.includes('formula')) return 'Ração Premier Fórmula'
        if (n.includes('especifica')) return 'Ração Premier Raças'
    }

    return nome
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
    }

    return stores[loja] || { emoji: '🏪', className: 'bg-gray-100 text-gray-700' }
}
