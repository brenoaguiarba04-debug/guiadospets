// Dados das marcas TOP para o diretório de marcas
export interface Brand {
    name: string
    slug: string
    logo: string
    logoFallback?: string
    color: string
    description: string
    category: 'premium' | 'standard' | 'natural' | 'veterinary'
    featured: boolean
}

export const topBrands: Brand[] = [
    // Marcas Premium/Super Premium
    {
        name: 'Golden',
        slug: 'golden',
        logo: '/brands/golden.png',
        logoFallback: 'G',
        color: '#D4AF37',
        description: 'Marca da PremieRpet, empresa brasileira fundada em 1995, pioneira em alimentos Super Premium no Brasil. Formulação 100% desenvolvida no Brasil com ingredientes cuidadosamente selecionados. Uma das maiores e mais respeitadas marcas de nutrição pet da América Latina.',
        category: 'premium',
        featured: true
    },
    {
        name: 'Fórmula Natural',
        slug: 'formula-natural',
        logo: '/brands/formula-natural-logo2.png',
        logoFallback: 'FN',
        color: '#228B22',
        description: 'Linha Super Premium da Adimax, desenvolvida por médicos-veterinários. Formulada com carne fresca, ingredientes selecionados e antioxidantes naturais. Sem conservantes artificiais ou transgênicos. Embalagem com polietileno verde sustentável da cana-de-açúcar brasileira.',
        category: 'natural',
        featured: true
    },
    {
        name: 'Royal Canin',
        slug: 'royal-canin',
        logo: '/brands/royal canin logo.jpg',
        logoFallback: 'RC',
        color: '#C41E3A',
        description: 'Fundada em 1967 na França pelo veterinário Jean Cathary, que descobriu a relação entre alimentação e saúde da pele. Lema "Saúde Através da Nutrição". Pioneira em alimentos secos para pets, presente em +120 países. Nutrição específica por raça, tamanho e necessidade.',
        category: 'premium',
        featured: true
    },
    {
        name: 'Premier',
        slug: 'premier',
        logo: '/brands/premier.png',
        logoFallback: 'P',
        color: '#8B0000',
        description: 'Linha Super Premium da PremieRpet, empresa brasileira com mais de 25 anos de experiência. Ingredientes nobres e alta digestibilidade para cães e gatos exigentes. Referência em qualidade e inovação no mercado brasileiro de nutrição animal.',
        category: 'premium',
        featured: true
    },
    {
        name: 'Gran Plus',
        slug: 'gran-plus',
        logo: '/brands/granplus logo.png',
        logoFallback: 'GP',
        color: '#FF6B35',
        description: 'Linha Premium Especial da Guabi, reconhecida pelo excelente custo-benefício. Sem corantes ou aromatizantes artificiais. Rica em ômega 3 e 6 para pele saudável e pelagem brilhante. Antioxidantes naturais e alta palatabilidade.',
        category: 'standard',
        featured: true
    },
    {
        name: 'Pedigree',
        slug: 'pedigree',
        logo: '/brands/pedigree.png',
        logoFallback: 'P',
        color: '#FFD700',
        description: 'Uma das marcas mais conhecidas do mundo, pertencente à Mars Inc. Oferece nutrição completa e acessível para cães de todas as idades e tamanhos. Presente em dezenas de países com fórmulas desenvolvidas por nutricionistas especializados.',
        category: 'standard',
        featured: true
    },
    {
        name: 'Whiskas',
        slug: 'whiskas',
        logo: '/brands/whiskas-logo.png',
        logoFallback: 'W',
        color: '#7B68EE',
        description: 'Marca líder mundial em alimentação para gatos, também da Mars Inc. Fórmulas desenvolvidas para atender ao paladar exigente dos felinos. Disponível em rações secas e sachês úmidos com alta palatabilidade e nutrição balanceada.',
        category: 'standard',
        featured: true
    },
    // Marcas Veterinárias/Terapêuticas
    {
        name: 'Hill\'s',
        slug: 'hills',
        logo: '/brands/Hills-Logo.png',
        logoFallback: 'H',
        color: '#003366',
        description: 'Líder mundial em nutrição clínica veterinária. Science Diet para prevenção e Prescription Diet para tratamento de condições específicas. Desenvolvida por veterinários, zootecnistas e nutricionistas. Fórmulas para cuidado renal, urinário, digestivo, peso e pele.',
        category: 'veterinary',
        featured: true
    },
    {
        name: 'Farmina',
        slug: 'farmina',
        logo: '/brands/farmina logo.png',
        logoFallback: 'F',
        color: '#2E8B57',
        description: 'Marca italiana que combina ciência e natureza. Ingredientes de fazendas certificadas: frango caipira italiano, cordeiro neozelandês, javali toscano. Tecnologia de infusão a frio para preservar vitaminas. Sem GMO, corantes ou conservantes artificiais.',
        category: 'natural',
        featured: true
    },
    {
        name: 'N&D',
        slug: 'nd',
        logo: '/brands/logo nd.jpg',
        logoFallback: 'N&D',
        color: '#228B22',
        description: 'Natural & Delicious - Linha premium da Farmina com 70-98% de proteína animal. Dieta ancestral que respeita a natureza carnívora de cães e gatos. Linhas Grain-Free, Ancestral Grain, Pumpkin, Quinoa e Ocean. Frutas, vegetais e plantas medicinais.',
        category: 'natural',
        featured: true
    },
    {
        name: 'Biofresh',
        slug: 'biofresh',
        logo: '/brands/bio fresh logo.png',
        logoFallback: 'BF',
        color: '#32CD32',
        description: 'Linha Super Premium da Hercosul com foco em ingredientes frescos e naturais. Proteínas de alta qualidade, frutas e vegetais selecionados. Sem conservantes ou corantes artificiais. Formulada para uma nutrição completa e equilibrada.',
        category: 'natural',
        featured: true
    },
    {
        name: 'Guabi Natural',
        slug: 'guabi-natural',
        logo: '/brands/guabi logo.png',
        logoFallback: 'GN',
        color: '#006400',
        description: 'Linha Super Premium da Guabi, livre de transgênicos, corantes e conservantes artificiais. Carnes selecionadas e arroz integral para digestão saudável. Excelente equilíbrio entre qualidade e preço na categoria super premium brasileira.',
        category: 'natural',
        featured: true
    }
]

// Função para obter marcas em destaque
export function getFeaturedBrands(): Brand[] {
    return topBrands.filter(brand => brand.featured)
}

// Função para obter marca por slug
export function getBrandBySlug(slug: string): Brand | undefined {
    return topBrands.find(brand => brand.slug === slug)
}

// Função para obter todas as marcas agrupadas por letra
export function getBrandsGroupedByLetter(): Record<string, Brand[]> {
    const grouped: Record<string, Brand[]> = {}

    topBrands.forEach(brand => {
        const letter = brand.name.charAt(0).toUpperCase()
        if (!grouped[letter]) {
            grouped[letter] = []
        }
        grouped[letter].push(brand)
    })

    // Ordenar por letra
    return Object.keys(grouped)
        .sort()
        .reduce((acc, letter) => {
            acc[letter] = grouped[letter].sort((a, b) => a.name.localeCompare(b.name))
            return acc
        }, {} as Record<string, Brand[]>)
}
