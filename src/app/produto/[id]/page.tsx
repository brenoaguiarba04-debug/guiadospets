import Header from '@/components/Header'
import Footer from '@/components/Footer'
import Image from 'next/image'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { getStoreBadge } from '@/lib/utils'
import { notFound } from 'next/navigation'
import { Metadata } from 'next'

// Força renderização dinâmica
export const dynamic = 'force-dynamic'

interface PageProps {
    params: Promise<{ id: string }>
}

interface Preco {
    id: number
    loja: string
    preco: number
    link_afiliado: string | null
    ultima_atualizacao: string | null
}

async function getProduto(id: number) {
    const { data: produto, error: produtoError } = await supabase
        .from('produtos')
        .select('*')
        .eq('id', id)
        .single()

    if (produtoError || !produto) {
        return null
    }

    const { data: precos } = await supabase
        .from('precos')
        .select('*')
        .eq('produto_id', id)
        .order('preco', { ascending: true })

    return { produto, precos: (precos || []) as Preco[] }
}

// Meta tags dinâmicas para SEO
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { id } = await params
    const produtoId = parseInt(id)

    if (isNaN(produtoId)) {
        return { title: 'Produto não encontrado | GuiaDoPet' }
    }

    const data = await getProduto(produtoId)

    if (!data) {
        return { title: 'Produto não encontrado | GuiaDoPet' }
    }

    const { produto, precos } = data
    const menorPreco = precos[0]?.preco
    const precoFormatado = menorPreco ? `R$ ${menorPreco.toFixed(2).replace('.', ',')}` : ''

    return {
        title: `${produto.nome} | Compare Preços | GuiaDoPet`,
        description: `Encontre o melhor preço para ${produto.nome}${precoFormatado ? ` a partir de ${precoFormatado}` : ''}. Compare ofertas de Shopee, Amazon e outras lojas.`,
        openGraph: {
            title: `${produto.nome} - Melhor Preço`,
            description: `Compare preços de ${produto.nome} em várias lojas. ${precos.length} ofertas disponíveis.`,
            images: produto.imagem_url ? [{ url: produto.imagem_url }] : [],
            type: 'website',
        },
        twitter: {
            card: 'summary_large_image',
            title: produto.nome,
            description: `Compare preços de ${produto.nome}`,
            images: produto.imagem_url ? [produto.imagem_url] : [],
        },
    }
}

// Componente de Schema.org JSON-LD para SEO
function ProductSchema({ produto, precos }: { produto: { nome: string; marca: string | null; imagem_url: string | null; categoria: string | null }; precos: Preco[] }) {
    const menorPreco = precos[0]?.preco
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://guiadopet.com.br'

    const schema = {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: produto.nome,
        brand: produto.marca || undefined,
        image: produto.imagem_url || undefined,
        category: produto.categoria || 'Produtos Pet',
        offers: menorPreco ? {
            '@type': 'AggregateOffer',
            lowPrice: menorPreco,
            highPrice: precos[precos.length - 1]?.preco || menorPreco,
            priceCurrency: 'BRL',
            offerCount: precos.length,
            url: `${baseUrl}/produto/${produto}`,
        } : undefined,
    }

    return (
        <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
    )
}

export default async function ProdutoPage({ params }: PageProps) {
    const { id } = await params
    const produtoId = parseInt(id)

    if (isNaN(produtoId)) {
        notFound()
    }

    const data = await getProduto(produtoId)

    if (!data) {
        notFound()
    }

    const { produto, precos } = data

    return (
        <div className="min-h-screen flex flex-col bg-gray-100">
            {/* Schema.org para SEO */}
            <ProductSchema produto={produto} precos={precos} />

            <Header />

            <main className="flex-1 max-w-6xl mx-auto px-4 py-6 w-full">
                {/* Back Link */}
                <Link
                    href="/"
                    className="inline-flex items-center gap-2 text-purple-600 font-bold mb-6 hover:text-purple-700 transition-colors"
                >
                    ← Voltar para ofertas
                </Link>

                {/* Product Container */}
                <div className="bg-white rounded-2xl shadow-lg overflow-hidden flex flex-col lg:flex-row">
                    {/* Image Column */}
                    <div className="lg:w-2/5 p-8 bg-white border-b lg:border-b-0 lg:border-r border-gray-100">
                        <div className="text-center">
                            <span className="inline-block px-4 py-1.5 bg-purple-100 text-purple-700 rounded-full font-bold text-sm mb-4">
                                {produto.marca || 'Marca'}
                            </span>

                            <div className="relative aspect-square max-w-sm mx-auto">
                                <Image
                                    src={produto.imagem_url || 'https://via.placeholder.com/300?text=Sem+Imagem'}
                                    alt={produto.nome}
                                    fill
                                    className="object-contain"
                                />
                            </div>

                            <h1 className="text-xl font-extrabold text-gray-800 mt-6 leading-tight">
                                {produto.nome}
                            </h1>
                        </div>
                    </div>

                    {/* Offers Column */}
                    <div className="lg:w-3/5 p-6 bg-gray-50">
                        <div className="flex items-center gap-2 text-lg font-extrabold text-gray-800 border-b-2 border-gray-200 pb-3 mb-4">
                            <span className="text-purple-600">⚡</span>
                            Melhores ofertas
                        </div>

                        {precos.length > 0 ? (
                            <div className="space-y-3">
                                {precos.map((oferta, index) => {
                                    const isWinner = index === 0
                                    const storeBadge = getStoreBadge(oferta.loja)
                                    const dataAtualizacao = oferta.ultima_atualizacao
                                        ? new Date(oferta.ultima_atualizacao).toLocaleDateString('pt-BR')
                                        : 'N/A'

                                    return (
                                        <div
                                            key={oferta.id}
                                            className={`relative p-4 rounded-xl border-2 transition-all hover:shadow-md ${isWinner
                                                ? 'border-green-500 bg-green-50'
                                                : 'border-gray-200 bg-white hover:-translate-y-0.5'
                                                }`}
                                        >
                                            {isWinner && (
                                                <div className="absolute -top-2.5 left-4 px-3 py-1 bg-green-500 text-white text-xs font-bold rounded-full uppercase tracking-wide">
                                                    🏆 Melhor Preço
                                                </div>
                                            )}

                                            <div className="flex items-center justify-between flex-wrap gap-4">
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-2 text-lg font-bold text-gray-800">
                                                        <span>{storeBadge.emoji}</span>
                                                        <span>{oferta.loja === 'Manual' ? 'Amazon' : oferta.loja}</span>
                                                    </div>
                                                    <div className="text-xs text-gray-500">
                                                        Atualizado: {dataAtualizacao}
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-4">
                                                    <div className={`text-2xl font-extrabold ${isWinner ? 'text-green-600' : 'text-gray-800'}`}>
                                                        R$ {oferta.preco.toFixed(2).replace('.', ',')}
                                                    </div>

                                                    <a
                                                        href={oferta.link_afiliado || '#'}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className={`px-6 py-3 rounded-full font-bold text-base transition-all ${isWinner
                                                            ? 'bg-green-500 text-white hover:bg-green-600 shadow-lg shadow-green-200 animate-pulse'
                                                            : 'border-2 border-purple-600 text-purple-600 hover:bg-purple-600 hover:text-white'
                                                            }`}
                                                    >
                                                        🛒 Comprar Agora
                                                    </a>
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        ) : (
                            <div className="text-center py-12 bg-white rounded-xl">
                                <div className="text-4xl mb-3">📦</div>
                                <p className="text-gray-500">
                                    Nenhuma oferta encontrada para este produto ainda.
                                </p>
                                <p className="text-gray-400 text-sm mt-1">
                                    Rode o sincronizador para atualizar.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    )
}
