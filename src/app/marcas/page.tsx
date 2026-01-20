import Header from '@/components/Header'
import Footer from '@/components/Footer'
import BrandShowcase from '@/components/BrandShowcase'
import Link from 'next/link'
import Image from 'next/image'
import { Metadata } from 'next'
import { topBrands, getFeaturedBrands, getBrandsGroupedByLetter } from '@/lib/brandData'
import { supabase } from '@/lib/supabase'

export const metadata: Metadata = {
    title: 'Marcas de Produtos Pet | Compare Preços | GuiaDoPet',
    description: 'Conheça as melhores marcas de produtos para pets. Golden, Fórmula Natural, Royal Canin, Premier e muito mais. Compare preços e encontre as melhores ofertas.',
    openGraph: {
        title: 'Marcas de Produtos Pet - GuiaDoPet',
        description: 'As melhores marcas do mercado pet em um só lugar. Compare preços e economize.',
        type: 'website'
    }
}

// Função para buscar marcas do banco de dados
async function getMarcasFromDB() {
    const { data, error } = await supabase
        .from('produtos')
        .select('marca')
        .not('marca', 'is', null)

    if (error || !data) return []

    // Conta produtos por marca e retorna lista única ordenada
    const marcaCount: Record<string, number> = {}
    data.forEach((item: { marca: string }) => {
        if (item.marca) {
            marcaCount[item.marca] = (marcaCount[item.marca] || 0) + 1
        }
    })

    return Object.entries(marcaCount)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
}

export default async function MarcasPage() {
    const featuredBrands = getFeaturedBrands()
    const groupedBrands = getBrandsGroupedByLetter()
    const dbMarcas = await getMarcasFromDB()

    return (
        <div className="min-h-screen flex flex-col bg-gray-50">
            <Header />

            {/* Hero Section */}
            <section className="bg-gradient-to-r from-purple-700 via-purple-600 to-indigo-600 text-white py-16">
                <div className="max-w-7xl mx-auto px-4 text-center">
                    <h1 className="text-4xl md:text-5xl font-extrabold mb-4">
                        🏆 Marcas que Amamos
                    </h1>
                    <p className="text-xl text-purple-100 max-w-2xl mx-auto">
                        As melhores marcas do mercado pet reunidas em um só lugar.
                        Compare preços e encontre as melhores ofertas.
                    </p>
                    <div className="mt-8 flex flex-wrap justify-center gap-4">
                        <span className="px-4 py-2 bg-white/20 rounded-full text-sm font-medium backdrop-blur-sm">
                            ✨ {topBrands.length}+ Marcas Cadastradas
                        </span>
                        <span className="px-4 py-2 bg-white/20 rounded-full text-sm font-medium backdrop-blur-sm">
                            🔍 Compare Preços
                        </span>
                        <span className="px-4 py-2 bg-white/20 rounded-full text-sm font-medium backdrop-blur-sm">
                            💰 Economize Mais
                        </span>
                    </div>
                </div>
            </section>

            {/* Carrossel de Marcas em Destaque */}
            <BrandShowcase
                brands={featuredBrands}
                title="Marcas em Destaque"
                subtitle="As marcas mais amadas pelos tutores brasileiros"
            />

            {/* Marcas do Banco de Dados */}
            {dbMarcas.length > 0 && (
                <section className="max-w-7xl mx-auto px-4 py-12">
                    <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                        <span>📊</span> Marcas no Nosso Catálogo
                    </h2>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                        {dbMarcas.slice(0, 24).map((marca) => (
                            <Link
                                key={marca.name}
                                href={`/categoria/racoes?marca=${encodeURIComponent(marca.name)}`}
                                className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-all border border-gray-100 hover:border-purple-200 hover:-translate-y-0.5 group"
                            >
                                <h3 className="font-semibold text-gray-800 group-hover:text-purple-600 transition-colors truncate">
                                    {marca.name}
                                </h3>
                                <p className="text-sm text-gray-500 mt-1">
                                    {marca.count} produtos
                                </p>
                            </Link>
                        ))}
                    </div>
                </section>
            )}

            {/* Grid Alfabético */}
            <section className="max-w-7xl mx-auto px-4 py-12">
                <h2 className="text-2xl font-bold text-gray-900 mb-8 flex items-center gap-2">
                    <span>📚</span> Todas as Marcas A-Z
                </h2>

                {/* Navegação Alfabética */}
                <div className="flex flex-wrap gap-2 mb-8 sticky top-20 bg-gray-50 py-4 z-10">
                    {Object.keys(groupedBrands).map((letter) => (
                        <a
                            key={letter}
                            href={`#letter-${letter}`}
                            className="w-10 h-10 flex items-center justify-center bg-white rounded-lg font-bold text-purple-600 hover:bg-purple-600 hover:text-white transition-colors shadow-sm border border-gray-200"
                        >
                            {letter}
                        </a>
                    ))}
                </div>

                {/* Lista de Marcas por Letra */}
                <div className="space-y-8">
                    {Object.entries(groupedBrands).map(([letter, brands]) => (
                        <div key={letter} id={`letter-${letter}`} className="scroll-mt-32">
                            <div className="flex items-center gap-4 mb-4">
                                <span className="w-12 h-12 flex items-center justify-center bg-purple-600 text-white text-xl font-bold rounded-xl">
                                    {letter}
                                </span>
                                <div className="h-px flex-1 bg-gradient-to-r from-purple-200 to-transparent"></div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {brands.map((brand) => (
                                    <Link
                                        key={brand.slug}
                                        href={`/marca/${brand.slug}`}
                                        className="flex items-center gap-4 bg-white rounded-xl p-4 shadow-sm hover:shadow-lg transition-all border border-gray-100 hover:border-purple-200 group"
                                    >
                                        <div className="w-16 h-16 relative flex-shrink-0 bg-gray-50 rounded-lg overflow-hidden">
                                            <Image
                                                src={brand.logo}
                                                alt={brand.name}
                                                fill
                                                className="object-contain p-2"
                                                unoptimized
                                            />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-bold text-gray-800 group-hover:text-purple-600 transition-colors">
                                                {brand.name}
                                            </h3>
                                            <p className="text-sm text-gray-500 line-clamp-2">
                                                {brand.description}
                                            </p>
                                            <span className={`inline-block mt-1 text-xs px-2 py-0.5 rounded-full font-medium ${brand.category === 'premium' ? 'bg-amber-100 text-amber-700' :
                                                    brand.category === 'natural' ? 'bg-green-100 text-green-700' :
                                                        brand.category === 'veterinary' ? 'bg-blue-100 text-blue-700' :
                                                            'bg-gray-100 text-gray-600'
                                                }`}>
                                                {brand.category === 'premium' ? 'Premium' :
                                                    brand.category === 'natural' ? 'Natural' :
                                                        brand.category === 'veterinary' ? 'Veterinária' :
                                                            'Standard'}
                                            </span>
                                        </div>
                                        <svg className="w-5 h-5 text-gray-400 group-hover:text-purple-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                        </svg>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            <Footer />
        </div>
    )
}
