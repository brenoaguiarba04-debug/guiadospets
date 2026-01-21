import Header from '@/components/Header'
import Footer from '@/components/Footer'
import HomeContent from '@/components/HomeContent'
import BenefitsBar from '@/components/BenefitsBar'
import BrandShowcase from '@/components/BrandShowcase'
import ProductCard from '@/components/ProductCard'
import CategoryCircle from '@/components/CategoryCircle'
import { supabase } from '@/lib/supabase'
import { definirGrupo, extrairPesoParaBotao, getProdutos, agruparProdutos } from '@/lib/utils'
import { getFeaturedBrands } from '@/lib/brandData'

// Força renderização dinâmica
export const dynamic = 'force-dynamic'

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
  const produtos = await getProdutos(searchTerm)
  const grupos = agruparProdutos(produtos)

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />

      <main className="flex-1 w-full bg-gradient-to-b from-gray-50 to-white">

        {!searchTerm && (
          <>
            {/* Hero Banner - Petlove Style */}
            <div className="max-w-7xl mx-auto px-4 py-6">
              <div className="relative bg-gradient-to-r from-[#6b21a8] via-[#7c3aed] to-[#a855f7] rounded-3xl overflow-hidden shadow-xl">
                {/* Decorative Elements */}
                <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/3 blur-3xl"></div>
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-900/30 rounded-full translate-y-1/2 -translate-x-1/3 blur-2xl"></div>
                <div className="absolute top-1/2 right-1/4 w-32 h-32 bg-yellow-400/20 rounded-full blur-2xl"></div>

                <div className="relative z-10 px-8 py-8 sm:px-12 sm:py-10 flex flex-col lg:flex-row items-center justify-between gap-4">
                  {/* Text Content */}
                  <div className="max-w-2xl">
                    <span className="inline-block px-4 py-1.5 bg-yellow-400 text-yellow-900 text-sm font-bold rounded-full mb-4 shadow-lg">
                      🔥 Compare e Economize
                    </span>
                    <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white mb-4 leading-tight">
                      Encontre o <span className="text-yellow-300">melhor preço</span> para seu pet
                    </h1>
                    <p className="text-purple-100 text-lg sm:text-xl mb-8 max-w-lg">
                      Compare preços de rações, medicamentos e acessórios em Petz, Cobasi, Petlove e mais lojas.
                    </p>
                    <div className="flex flex-wrap gap-4">
                      <a href="/categoria/racoes" className="px-8 py-3.5 bg-white text-purple-700 font-bold rounded-full hover:bg-yellow-300 hover:text-purple-900 transition-all shadow-lg hover:shadow-xl hover:scale-105">
                        Comparar Preços
                      </a>
                      <a href="/marcas" className="px-8 py-3.5 bg-transparent border-2 border-white/50 text-white font-bold rounded-full hover:bg-white/20 transition-all">
                        Ver Marcas
                      </a>
                    </div>
                  </div>

                  {/* Pet Image */}
                  <div className="hidden lg:block relative">
                    <img
                      src="/—Pngtree—dog and cat white backgroud_13489516.png"
                      alt="Cachorro e gato fofos"
                      className="w-[450px] h-[450px] object-contain drop-shadow-2xl"
                    />
                  </div>
                </div>
              </div>
            </div>

            <BenefitsBar />

            {/* Categories Carousel - Buscapé Style */}
            <section className="bg-white py-8 border-b border-gray-100">
              <div className="max-w-7xl mx-auto px-4">
                <h2 className="text-lg font-bold text-gray-800 mb-6">Explore por categorias</h2>
                <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-4">
                  {/* Note: In a real app, map this array */}
                  <CategoryCircle label="Rações" icon="🦴" href="/categoria/racoes" active />
                  <CategoryCircle label="Farmácia" icon="💊" href="/categoria/medicamentos" badge="-15%" />
                  <CategoryCircle label="Brinquedos" icon="🎾" href="/categoria/brinquedos" />
                  <CategoryCircle label="Camas" icon="🛏️" href="/categoria/camas" />
                  <CategoryCircle label="Higiene" icon="🚿" href="/categoria/higiene" />
                  <CategoryCircle label="Gatos" icon="🐱" href="/categoria/gatos" />
                  <CategoryCircle label="Cães" icon="🐶" href="/categoria/caes" />
                  <CategoryCircle label="Pássaros" icon="🦜" href="/categoria/passaros" />
                  <CategoryCircle label="Peixes" icon="🐠" href="/categoria/peixes" />
                </div>
              </div>
            </section>

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
