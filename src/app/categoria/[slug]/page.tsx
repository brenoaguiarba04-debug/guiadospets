import Header from '@/components/Header'
import Footer from '@/components/Footer'
import BenefitsBar from '@/components/BenefitsBar'
import HomeContent from '@/components/HomeContent'
import { supabase } from '@/lib/supabase'
import { definirGrupo, extrairPesoParaBotao } from '@/lib/utils'
import { notFound } from 'next/navigation'
import { Metadata } from 'next'

// Revalidar a cada 1 hora para melhor performance
export const revalidate = 3600

// Definição de categorias com SEO
const CATEGORIAS: Record<string, {
    nome: string
    titulo: string
    descricao: string
    keywords: string[]
    emoji: string
    cor: string
}> = {
    'racoes': {
        nome: 'Ração',
        titulo: 'Rações para Pets',
        descricao: 'Compare preços de rações para cães e gatos. Encontre as melhores ofertas de rações premium, super premium e naturais.',
        keywords: ['ração', 'ração para cachorro', 'ração para gato', 'ração premium', 'ração golden', 'ração royal canin'],
        emoji: '🦴',
        cor: '#fa8c16'
    },
    'higiene': {
        nome: 'Higiene',
        titulo: 'Higiene e Limpeza Pet',
        descricao: 'Shampoos, condicionadores, tapetes higiênicos e produtos de limpeza para seu pet. Compare preços e economize.',
        keywords: ['shampoo pet', 'tapete higiênico', 'higiene cachorro', 'limpeza pet'],
        emoji: '🚿',
        cor: '#1890ff'
    },
    'medicamentos': {
        nome: 'Antipulgas',
        titulo: 'Medicamentos e Antipulgas',
        descricao: 'Antipulgas, vermífugos, vitaminas e medicamentos veterinários. Melhores preços em farmácia pet.',
        keywords: ['antipulgas', 'vermífugo', 'nexgard', 'bravecto', 'simparic', 'frontline'],
        emoji: '💊',
        cor: '#52c41a'
    },
    'brinquedos': {
        nome: 'Brinquedo',
        titulo: 'Brinquedos para Pets',
        descricao: 'Brinquedos interativos, mordedores, bolinhas e muito mais para diversão do seu pet.',
        keywords: ['brinquedo cachorro', 'brinquedo gato', 'mordedor', 'bolinha pet'],
        emoji: '🎾',
        cor: '#eb2f96'
    },
    'gatos': {
        nome: 'Gatos',
        titulo: 'Produtos para Gatos',
        descricao: 'Tudo para gatos: rações, areias, arranhadores, brinquedos e muito mais. Compare preços.',
        keywords: ['produtos gato', 'ração gato', 'areia gato', 'arranhador', 'whiskas', 'felix'],
        emoji: '🐱',
        cor: '#722ed1'
    },
    'caes': {
        nome: 'Cães',
        titulo: 'Produtos para Cães',
        descricao: 'Tudo para cachorros: rações, petiscos, coleiras, camas e acessórios. Os melhores preços.',
        keywords: ['produtos cachorro', 'ração cachorro', 'petisco', 'coleira', 'pedigree'],
        emoji: '🐶',
        cor: '#ffd000'
    },
    'petiscos': {
        nome: 'Petisco',
        titulo: 'Petiscos e Snacks',
        descricao: 'Petiscos, biscoitos, ossos e snacks para cães e gatos. Compare preços dos melhores petiscos.',
        keywords: ['petisco cachorro', 'petisco gato', 'biscoito pet', 'osso cachorro', 'snack pet'],
        emoji: '🍖',
        cor: '#f5222d'
    },
    'acessorios': {
        nome: 'Acessório',
        titulo: 'Acessórios Pet',
        descricao: 'Coleiras, guias, camas, comedouros e bebedouros para seu pet. Encontre ofertas.',
        keywords: ['coleira', 'guia pet', 'cama cachorro', 'comedouro', 'bebedouro'],
        emoji: '🎀',
        cor: '#13c2c2'
    }
}

interface PageProps {
    params: Promise<{ slug: string }>
}

interface Variacao {
    id: number
    label: string
    imagem: string
    preco: number
    loja: string
}

interface Grupo {
    nomePrincipal: string
    imagemCapa: string
    lojaCapa?: string
    menorPrecoCapa: number
    variacoes: Variacao[]
    labelsUsados: Set<string>
}

// Buscar produtos por categoria
async function getProdutosPorCategoria(searchTerm: string) {
    const { data, error } = await supabase
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
        .ilike('nome', `%${searchTerm}%`)

    if (error) {
        console.error('Erro ao buscar produtos:', error)
        return []
    }

    return data || []
}

// Função de agrupamento (mesma lógica do page.tsx principal)
function agruparProdutos(produtos: any[]) {
    const grupos: Record<string, Grupo> = {}

    for (const p of produtos) {
        if (!p.nome) continue

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
                lojaCapa: loja,
                menorPrecoCapa: preco,
                variacoes: [],
                labelsUsados: new Set()
            }
        }

        const grupoAtual = grupos[nomeGrupo]

        if (!grupoAtual.labelsUsados.has(textoBotao)) {
            const lojasConfiaveis = ['Amazon', 'Magalu']
            const imagemAtualEhConfiavel = lojasConfiaveis.some(l => grupoAtual.lojaCapa?.includes(l))
            const novaImagemEhConfiavel = lojasConfiaveis.some(l => loja.includes(l))

            let deveAtualizarCapa = false

            if (img && img.length > 10) {
                if (novaImagemEhConfiavel && !imagemAtualEhConfiavel) {
                    deveAtualizarCapa = true
                } else if (!imagemAtualEhConfiavel || preco < grupoAtual.menorPrecoCapa) {
                    deveAtualizarCapa = grupoAtual.menorPrecoCapa === 0 || preco < grupoAtual.menorPrecoCapa
                }
            }

            if (deveAtualizarCapa) {
                grupoAtual.imagemCapa = img
                grupoAtual.lojaCapa = loja
            }

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

    for (const g of Object.values(grupos)) {
        g.variacoes.sort((a, b) => a.preco - b.preco)
    }

    return Object.values(grupos).map(g => ({
        nomePrincipal: g.nomePrincipal,
        imagemCapa: g.imagemCapa,
        menorPrecoCapa: g.menorPrecoCapa,
        variacoes: g.variacoes
    }))
}

// Meta tags dinâmicas para SEO
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { slug } = await params
    const categoria = CATEGORIAS[slug]

    if (!categoria) {
        return { title: 'Categoria não encontrada | GuiaDoPet' }
    }

    return {
        title: `${categoria.titulo} | Compare Preços | GuiaDoPet`,
        description: categoria.descricao,
        keywords: categoria.keywords.join(', '),
        openGraph: {
            title: `${categoria.titulo} - Melhores Preços`,
            description: categoria.descricao,
            type: 'website',
        },
        twitter: {
            card: 'summary_large_image',
            title: categoria.titulo,
            description: categoria.descricao,
        },
    }
}

// Gerar páginas estáticas para todas as categorias
export async function generateStaticParams() {
    return Object.keys(CATEGORIAS).map((slug) => ({ slug }))
}

export default async function CategoriaPage({ params }: PageProps) {
    const { slug } = await params
    const categoria = CATEGORIAS[slug]

    if (!categoria) {
        notFound()
    }

    const produtos = await getProdutosPorCategoria(categoria.nome)
    const grupos = agruparProdutos(produtos)

    // Schema.org para SEO
    const schema = {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: categoria.titulo,
        description: categoria.descricao,
        numberOfItems: grupos.length,
    }

    return (
        <div className="min-h-screen flex flex-col bg-white">
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
            />

            <Header />

            <main className="flex-1 w-full">
                {/* Hero da Categoria */}
                <div
                    className="text-white py-10 sm:py-14 relative overflow-hidden"
                    style={{ background: `linear-gradient(135deg, ${categoria.cor} 0%, ${categoria.cor}dd 100%)` }}
                >
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl"></div>
                    <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2 blur-xl"></div>

                    <div className="max-w-7xl mx-auto px-4 relative z-10 text-center">
                        <span className="text-6xl mb-4 block">{categoria.emoji}</span>
                        <h1 className="font-titan text-3xl sm:text-5xl mb-4 leading-tight">
                            {categoria.titulo}
                        </h1>
                        <p className="text-white/90 text-lg sm:text-xl max-w-2xl mx-auto">
                            {categoria.descricao}
                        </p>
                        <div className="mt-6 inline-flex items-center gap-2 bg-white/20 backdrop-blur px-4 py-2 rounded-full text-sm font-bold">
                            <span>📦</span>
                            <span>{grupos.length} produtos encontrados</span>
                        </div>
                    </div>
                </div>

                <BenefitsBar />

                {/* Breadcrumb */}
                <div className="max-w-7xl mx-auto px-4 py-4">
                    <nav className="text-sm text-gray-500">
                        <a href="/" className="hover:text-purple-600">Home</a>
                        <span className="mx-2">›</span>
                        <span className="text-gray-800 font-medium">{categoria.titulo}</span>
                    </nav>
                </div>

                {/* Produtos */}
                <div className="max-w-7xl mx-auto px-4 pb-12">
                    <HomeContent grupos={grupos} searchTerm={categoria.nome} />
                </div>
            </main>

            <Footer />
        </div>
    )
}
