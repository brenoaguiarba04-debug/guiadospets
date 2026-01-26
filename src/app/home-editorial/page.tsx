import Header from '@/components/Header'
import Footer from '@/components/Footer'
import HomeContent from '@/components/HomeContent'
import ProductCarousel from '@/components/ProductCarousel'
import BrandShowcase from '@/components/BrandShowcase'
import { getFeaturedBrands } from '@/lib/brandData'
import { getCachedProdutos, agruparProdutos, getProdutos } from '@/lib/utils'
import Image from 'next/image'

interface SearchParams {
    q?: string
}

export default async function EditorialHome({
    searchParams
}: {
    searchParams: Promise<SearchParams>
}) {
    const params = await searchParams
    const searchTerm = params?.q || ''

    const produtos = searchTerm
        ? await getProdutos(searchTerm)
        : await getCachedProdutos()

    const grupos = agruparProdutos(produtos)

    // Curated collections for Editorial feel
    const featuredBrands = getFeaturedBrands()

    return (
        <div className="min-h-screen flex flex-col bg-[#FDFBF7]"> {/* Warmer background */}
            <Header />

            <main className="flex-1 w-full">

                {/* Editorial Hero - Large Typography & Image */}
                {!searchTerm && (
                    <>
                        <section className="relative h-[600px] flex items-center justify-center overflow-hidden bg-purple-900 text-white">
                            <div className="absolute inset-0 z-0 opacity-40">
                                {/* Abstract background or heavy image */}
                                <Image
                                    src="https://images.unsplash.com/photo-1450778869180-41d0601e046e?q=80&w=2686&auto=format&fit=crop"
                                    alt="Background"
                                    fill
                                    className="object-cover"
                                />
                            </div>
                            <div className="relative z-10 text-center max-w-4xl px-4">
                                <span className="inline-block py-1 px-3 border border-white/30 rounded-full text-xs font-bold tracking-widest uppercase mb-6 backdrop-blur-sm">
                                    Edição da Semana
                                </span>
                                <h1 className="text-5xl md:text-7xl font-serif italic mb-6 leading-tight">
                                    O melhor para o <br /> seu melhor amigo.
                                </h1>
                                <p className="text-xl md:text-2xl text-purple-100 font-light max-w-2xl mx-auto mb-10">
                                    Curadoria de ofertas premium das maiores lojas do Brasil.
                                </p>
                                <a href="#discover" className="inline-block bg-white text-purple-900 px-8 py-4 rounded-full font-bold hover:bg-purple-50 transition-all hover:scale-105">
                                    Explorar Coleção
                                </a>
                            </div>
                        </section>

                        {/* Collection: Essentials */}
                        <section id="discover" className="py-20 px-4 bg-white">
                            <div className="max-w-7xl mx-auto">
                                <div className="flex items-end justify-between mb-12 border-b border-gray-100 pb-4">
                                    <div>
                                        <h2 className="text-4xl font-serif text-gray-900 mb-2">Essenciais do Dia</h2>
                                        <p className="text-gray-500">Produtos que todo tutor precisa ter em casa.</p>
                                    </div>
                                    <a href="/ofertas" className="text-purple-600 font-bold hover:underline">Ver tudo &rarr;</a>
                                </div>
                                <ProductCarousel title="" />
                            </div>
                        </section>

                        {/* Featured Story / Brand Focus */}
                        <section className="py-20 bg-[#FFFEF0]"> {/* Cream yellow */}
                            <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
                                <div className="order-2 md:order-1">
                                    <h2 className="text-4xl font-serif text-gray-900 mb-6">Marcas que amamos</h2>
                                    <p className="text-gray-600 text-lg mb-8 leading-relaxed">
                                        Selecionamos apenas as melhores marcas do mercado para garantir a saúde e felicidade do seu pet.
                                        De Royal Canin a Bravecto, encontre qualidade com o melhor preço.
                                    </p>
                                    <BrandShowcase brands={featuredBrands.slice(0, 4)} title="" subtitle="" />
                                </div>
                                <div className="order-1 md:order-2 h-[500px] relative rounded-2xl overflow-hidden shadow-2xl rotate-2 hover:rotate-0 transition-all duration-700">
                                    <Image
                                        src="https://images.unsplash.com/photo-1601758228041-f3b2795255db?q=80&w=2670&auto=format&fit=crop"
                                        alt="Happy Dog"
                                        fill
                                        className="object-cover"
                                    />
                                </div>
                            </div>
                        </section>
                    </>
                )}

                {/* Main Grid - Editorial Style Header */}
                <section className="py-20 px-4 max-w-7xl mx-auto">
                    <div className="text-center mb-16">
                        <span className="text-purple-600 font-bold tracking-widest uppercase text-sm">Catálogo Completo</span>
                        <h2 className="text-4xl md:text-5xl font-serif mt-4 text-gray-900">Todas as Ofertas</h2>
                    </div>
                    <HomeContent grupos={grupos} searchTerm={searchTerm} />
                </section>

            </main>

            <Footer />
        </div>
    )
}
