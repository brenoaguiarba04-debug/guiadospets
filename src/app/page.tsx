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
            {/* Hero Banner - Petlove Style */}
            {/* Hero Carousel - Petlove Style */}
            <div className="py-6">
              <HeroCarousel />
            </div>

            <BenefitsBar />

            {/* Petlove Style Categories */}
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
                  <ProductCard
                    title="Ração Royal Canin Medium Adulto - 15kg"
                    image="https://cobasi.vteximg.com.br/arquivos/ids/1090509/Racao-Royal-Canin-Medium-Adult-para-Caes-Adultos-Porte-Medio.webp.webp?v=638978659389800000"
                    price={289.90}
                    installments="até 3x de R$ 96,63"
                    store="Petz"
                    rating={4.8}
                    reviews={1240}
                    slug="Ração Royal Canin Medium"
                    offerBadge
                    cashback="2%"
                  />
                  <ProductCard
                    title="Bravecto MSD Antipulgas para Cães 20 a 40 kg"
                    image="https://images.petz.com.br/fotos/1699967180573.jpg"
                    price={219.90}
                    installments="até 2x de R$ 109,95"
                    store="Cobasi"
                    rating={4.9}
                    reviews={856}
                    slug="Bravecto 20 a 40 kg"
                    offerBadge
                    cashback="5%"
                  />
                  <ProductCard
                    title="Areia Higiênica Pipicat Classic para Gatos - 4kg"
                    image="https://cobasi.vteximg.com.br/arquivos/ids/1022341/frente.jpg?v=638022127171900000"
                    price={22.90}
                    store="Amazon"
                    rating={4.5}
                    reviews={2100}
                    slug="Areia Pipicat Classic"
                  />
                  <ProductCard
                    title="Fonte Bebedouro Amicus Aqua Mini Bivolt"
                    image="https://images.petz.com.br/fotos/1641905625433.jpg"
                    price={149.90}
                    installments="até 2x de R$ 74,95"
                    store="Mercado Livre"
                    rating={4.2}
                    reviews={150}
                    slug="Fonte Bebedouro Aqua"
                    cashback="3%"
                  />
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
            <ProductCarousel />
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
