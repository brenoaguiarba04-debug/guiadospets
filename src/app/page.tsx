import Header from '@/components/Header'
import Footer from '@/components/Footer'
import HomeContent from '@/components/HomeContent'
import BenefitsBar from '@/components/BenefitsBar'
import BrandShowcase from '@/components/BrandShowcase'
import ProductCard from '@/components/ProductCard'
import PetloveCategories from '@/components/PetloveCategories'
import HeroCarousel from '@/components/HeroCarousel'
import ProductCarousel from '@/components/ProductCarousel'
import { supabase } from '@/lib/supabase'
import { definirGrupo, extrairPesoParaBotao, getProdutos, getCachedProdutos, agruparProdutos } from '@/lib/utils'
import { getFeaturedBrands } from '@/lib/brandData'

// Força renderização dinâmica APENAS se necessário, mas queremos cache por padrão agora
// export const dynamic = 'force-dynamic' 

interface SearchParams {
  q?: string
}

export default async function HomePage({
  searchParams
}: {
  searchParams: Promise<SearchParams>
}) {
  const params = await searchParams
  const searchTerm = params?.q || ''

  // Use cached version for default view (no search), dynamic for search results
  const produtos = searchTerm
    ? await getProdutos(searchTerm)
    : await getCachedProdutos()
  const grupos = agruparProdutos(produtos)

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />

      <main className="flex-1 w-full bg-gradient-to-b from-gray-50 to-white">

        {!searchTerm && (
          <>
            {/* Hero Banner */}
            {/* Hero Carousel */}
            <div className="py-6">
              <HeroCarousel />
            </div>

            <BenefitsBar />

            {/* Categories */}
            <PetloveCategories />

            {/* Daily Offers - Product Cards */}
            <section className="bg-gray-50 py-10">
              <div className="max-w-7xl mx-auto px-4">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-black text-gray-800 flex items-center gap-2">
                    <span className="text-2xl">🔥</span> Ofertas do Dia
                  </h2>
                  <a href="/ofertas" className="text-purple-700 font-bold text-sm hover:underline">Ver todas &gt;</a>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {grupos.slice(0, 4).map((grupo) => (
                    <ProductCard
                      key={grupo.nomePrincipal}
                      id={grupo.variacoes[0]?.id}
                      title={grupo.nomePrincipal}
                      image={grupo.imagemCapa}
                      price={grupo.menorPrecoCapa}
                      slug={`ofertas?q=${encodeURIComponent(grupo.nomePrincipal)}`}
                      rating={4.8}
                      reviews={120}
                      store={grupo.variacoes[0]?.loja}
                      offerBadge={true}
                    />
                  ))}
                </div>
              </div>
            </section>

            {/* Carrossel de Marcas */}
            <BrandShowcase
              brands={getFeaturedBrands()}
              title="Marcas em Destaque"
              subtitle="As melhores marcas do mercado pet em um só lugar"
            />

            {/* Quem viu, comprou também */}
            <ProductCarousel
              title="Destaques para você"
              products={grupos.slice(4, 14).map(g => ({
                id: g.variacoes[0]?.id,
                title: g.nomePrincipal,
                image: g.imagemCapa,
                price: g.menorPrecoCapa,
                store: g.variacoes[0]?.loja,
                rating: 4.8,
                reviews: 120,
                slug: g.nomePrincipal
              }))}
            />

          </>
        )}

        <div className="max-w-7xl mx-auto px-4 py-8">
          <HomeContent grupos={grupos} searchTerm={searchTerm} />
        </div>
      </main>

      <Footer />
    </div >
  )
}
