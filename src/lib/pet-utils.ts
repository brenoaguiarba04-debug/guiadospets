// Funções para calcular custo por kg e classificar produtos por tipo de pet

/**
 * Extrai o peso em kg do nome do produto
 * Exemplos: "Ração Golden 15kg" → 15, "Ração Premier 3KG" → 3
 */
export function extrairPesoKg(nomeProduto: string): number | null {
    if (!nomeProduto) return null;

    // Padrões comuns: "15kg", "15 kg", "15KG", "15 Kg"
    const regex = /(\d+(?:[.,]\d+)?)\s*kg/i;
    const match = nomeProduto.match(regex);

    if (match) {
        return parseFloat(match[1].replace(',', '.'));
    }

    // Tenta gramas: "500g" → 0.5
    const regexGramas = /(\d+)\s*g(?!r)/i;
    const matchGramas = nomeProduto.match(regexGramas);
    if (matchGramas) {
        return parseFloat(matchGramas[1]) / 1000;
    }

    return null;
}

/**
 * Calcula o preço por kg
 */
export function calcularPrecoPorKg(preco: number, pesoKg: number | null): number | null {
    if (!pesoKg || pesoKg <= 0) return null;
    return preco / pesoKg;
}

/**
 * Formata o preço por kg para exibição
 */
export function formatarPrecoPorKg(precoPorKg: number | null): string {
    if (precoPorKg === null) return '';
    return `R$ ${precoPorKg.toFixed(2).replace('.', ',')}/kg`;
}

// =====================
// CLASSIFICAÇÃO DE PETS
// =====================

export type TipoPet = 'cão' | 'gato' | 'outros';
export type FasePet = 'filhote' | 'adulto' | 'idoso';
export type PortePet = 'pequeno' | 'médio' | 'grande' | 'gigante';

export interface FiltroPet {
    tipo: TipoPet;
    fase: FasePet;
    porte?: PortePet; // Só para cães
}

/**
 * Detecta o tipo de pet a partir do nome do produto
 */
export function detectarTipoPet(nomeProduto: string): TipoPet {
    const nome = nomeProduto.toLowerCase();

    if (nome.includes('cão') || nome.includes('cães') || nome.includes('cachorro') ||
        nome.includes('dog') || nome.includes('canino')) {
        return 'cão';
    }

    if (nome.includes('gato') || nome.includes('gatos') || nome.includes('cat') ||
        nome.includes('felino') || nome.includes('feline')) {
        return 'gato';
    }

    return 'outros';
}

/**
 * Detecta a fase do pet (filhote, adulto, idoso) a partir do nome
 */
export function detectarFasePet(nomeProduto: string): FasePet {
    const nome = nomeProduto.toLowerCase();

    // Filhote
    if (nome.includes('filhote') || nome.includes('puppy') || nome.includes('kitten') ||
        nome.includes('junior') || nome.includes('starter') || nome.includes('baby')) {
        return 'filhote';
    }

    // Idoso
    if (nome.includes('senior') || nome.includes('idoso') || nome.includes('mature') ||
        nome.includes('+7') || nome.includes('7+') || nome.includes('7 anos') ||
        nome.includes('+8') || nome.includes('8+') || nome.includes('10+')) {
        return 'idoso';
    }

    return 'adulto';
}

/**
 * Detecta o porte do cão a partir do nome
 */
export function detectarPortePet(nomeProduto: string): PortePet | null {
    const nome = nomeProduto.toLowerCase();

    if (nome.includes('mini') || nome.includes('pequeno') || nome.includes('small') ||
        nome.includes('toy') || nome.includes('x-small')) {
        return 'pequeno';
    }

    if (nome.includes('médio') || nome.includes('medio') || nome.includes('medium')) {
        return 'médio';
    }

    if (nome.includes('gigante') || nome.includes('giant') || nome.includes('maxi')) {
        return 'gigante';
    }

    if (nome.includes('grande') || nome.includes('large')) {
        return 'grande';
    }

    return null;
}

/**
 * Verifica se um produto corresponde ao filtro do pet
 */
export function produtoCorrespondeAoPet(nomeProduto: string, filtro: FiltroPet): boolean {
    const tipoProduto = detectarTipoPet(nomeProduto);
    const faseProduto = detectarFasePet(nomeProduto);

    // Tipo deve corresponder
    if (tipoProduto !== filtro.tipo && tipoProduto !== 'outros') {
        return false;
    }

    // Fase deve corresponder
    if (faseProduto !== filtro.fase) {
        return false;
    }

    // Porte (só para cães)
    if (filtro.porte && filtro.tipo === 'cão') {
        const porteProduto = detectarPortePet(nomeProduto);
        if (porteProduto && porteProduto !== filtro.porte) {
            return false;
        }
    }

    return true;
}

/**
 * Filtra lista de produtos por perfil do pet
 */
export function filtrarProdutosPorPet<T extends { nome: string }>(
    produtos: T[],
    filtro: FiltroPet
): T[] {
    return produtos.filter(p => produtoCorrespondeAoPet(p.nome, filtro));
}
