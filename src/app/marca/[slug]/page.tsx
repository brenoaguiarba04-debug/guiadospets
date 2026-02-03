import Header from '@/components/Header'
import Footer from '@/components/Footer'
import Image from 'next/image'
import Link from 'next/link'
import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getBrandBySlug, topBrands } from '@/lib/brandData'
import { supabase } from '@/lib/supabase'
import { definirGrupo, extrairPesoParaBotao } from '@/lib/utils'
import HomeContent from '@/components/HomeContent'

interface PageProps {
    params: Promise<{ slug: string }>
}

// Gerar páginas estáticas para marcas conhecidas
export async function generateStaticParams() {
    return topBrands.map((brand) => ({
        slug: brand.slug
    }))
}

// Meta tags dinâmicas
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { slug } = await params
    const brand = getBrandBySlug(slug)

    if (!brand) {
        return { title: 'Marca não encontrada | GuiaDoPet' }
    }

    return {
        title: `${brand.name} | Produtos e Preços | GuiaDoPet`,
        description: `${brand.description} Compare preços de produtos ${brand.name} e economize.`,
        openGraph: {
            title: `${brand.name} - Compare Preços | GuiaDoPet`,
            description: brand.description,
            images: [{ url: brand.logo }]
        }
    }
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

// Buscar e agrupar produtos da marca
async function getProductsByBrand(brandName: string) {
    const { data, error } = await supabase
        .from('produtos')
        .select(`
            id,
            nome,
            marca,
            categoria,
            imagem_url,
            precos (
                preco,
                loja
            )
        `)
        .ilike('marca', `%${brandName}%`)
        .limit(100)

    if (error || !data) return []

    return data
}

// Agrupar produtos usando a mesma lógica da home
function agruparProdutos(produtos: any[]) {
    const grupos: Record<string, Grupo> = {}

    for (const p of produtos) {
        if (!p.nome) continue

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
                lojaCapa: loja,
                menorPrecoCapa: preco,
                variacoes: [],
                labelsUsados: new Set()
            }
        }

        const grupoAtual = grupos[nomeGrupo]

        // Evita duplicatas
        if (!grupoAtual.labelsUsados.has(textoBotao)) {
            // Lógica de Melhor Imagem
            const lojasConfiaveis = ['Amazon', 'Magalu']
            const imagemAtualEhConfiavel = lojasConfiaveis.some(l => grupoAtual.lojaCapa?.includes(l))
            const novaImagemEhConfiavel = lojasConfiaveis.some(l => loja.includes(l))

            let deveAtualizarCapa = false

            if (img && img.length > 10) {
                if (novaImagemEhConfiavel && !imagemAtualEhConfiavel) {
                    deveAtualizarCapa = true
                } else if (imagemAtualEhConfiavel && !novaImagemEhConfiavel) {
                    deveAtualizarCapa = false
                } else {
                    if (grupoAtual.menorPrecoCapa === 0 || preco < grupoAtual.menorPrecoCapa) {
                        deveAtualizarCapa = true
                    }
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

    // Ordena variações por preço
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

export default async function MarcaPage({ params }: PageProps) {
    const { slug } = await params
    const brand = getBrandBySlug(slug)

    if (!brand) {
        notFound()
    }

    const produtos = await getProductsByBrand(brand.name)
    const grupos = agruparProdutos(produtos)

    return (
        <div className="min-h-screen flex flex-col bg-gray-50">
            <Header />

            {/* Hero da Marca */}
            <section className={`py-16 ${brand.category === 'premium' ? 'bg-gradient-to-r from-amber-500 via-amber-600 to-orange-600' :
                brand.category === 'natural' ? 'bg-gradient-to-r from-green-500 via-green-600 to-emerald-600' :
                    brand.category === 'veterinary' ? 'bg-gradient-to-r from-blue-500 via-blue-600 to-indigo-600' :
                        'bg-gradient-to-r from-purple-500 via-purple-600 to-indigo-600'
                } text-white`}>
                <div className="max-w-7xl mx-auto px-4">
                    <div className="flex flex-col md:flex-row items-center gap-8">
                        {/* Logo */}
                        <div className="w-40 h-40 bg-white rounded-2xl shadow-2xl flex items-center justify-center p-6">
                            <div className="relative w-full h-full">
                                <Image
                                    src={brand.logo}
                                    alt={brand.name}
                                    fill
                                    className="object-contain"
                                    unoptimized
                                />
                            </div>
                        </div>

                        {/* Info */}
                        <div className="text-center md:text-left flex-1">
                            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mb-3">
                                <h1 className="text-4xl font-extrabold">{brand.name}</h1>
                                <span className={`px-3 py-1 rounded-full text-sm font-bold ${brand.category === 'premium' ? 'bg-amber-900/30' :
                                    brand.category === 'natural' ? 'bg-green-900/30' :
                                        brand.category === 'veterinary' ? 'bg-blue-900/30' :
                                            'bg-purple-900/30'
                                    }`}>
                                    {brand.category === 'premium' ? '⭐ Premium' :
                                        brand.category === 'natural' ? '🌿 Natural' :
                                            brand.category === 'veterinary' ? '🏥 Veterinária' :
                                                '📦 Standard'}
                                </span>
                            </div>
                            <p className="text-xl opacity-90 max-w-2xl">
                                {brand.description}
                            </p>
                            <div className="mt-6 flex flex-wrap gap-4 justify-center md:justify-start">
                                <span className="px-4 py-2 bg-white/20 rounded-full text-sm font-medium backdrop-blur-sm">
                                    {grupos.length} Produtos Agrupados
                                </span>
                                <span className="px-4 py-2 bg-white/20 rounded-full text-sm font-medium backdrop-blur-sm">
                                    🔍 Compare Preços
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Breadcrumb */}
            <nav className="max-w-7xl mx-auto px-4 py-4">
                <ol className="flex items-center gap-2 text-sm text-gray-600">
                    <li>
                        <Link href="/" className="hover:text-purple-600 transition-colors">
                            Início
                        </Link>
                    </li>
                    <li>›</li>
                    <li>
                        <Link href="/marcas" className="hover:text-purple-600 transition-colors">
                            Marcas
                        </Link>
                    </li>
                    <li>›</li>
                    <li className="font-semibold text-purple-600">{brand.name}</li>
                </ol>
            </nav>

            {/* Grid de Produtos Agrupados */}
            <main className="flex-1 max-w-7xl mx-auto px-4 py-8 w-full">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">
                    Produtos {brand.name}
                </h2>

                {grupos.length > 0 ? (
                    <HomeContent grupos={grupos} searchTerm="" />
                ) : (
                    <div className="text-center py-16 bg-white rounded-2xl border-2 border-dashed border-gray-200">
                        <div className="text-5xl mb-4">📦</div>
                        <h3 className="text-xl font-bold text-gray-700 mb-2">
                            Nenhum produto encontrado
                        </h3>
                        <p className="text-gray-500 mb-6">
                            Ainda não temos produtos dessa marca no nosso catálogo.
                        </p>
                        <Link
                            href="/"
                            className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 text-white font-bold rounded-full hover:bg-purple-700 transition-colors"
                        >
                            Ver Todos os Produtos
                        </Link>
                    </div>
                )}
            </main>

            <Footer />
        </div>
    )
}
