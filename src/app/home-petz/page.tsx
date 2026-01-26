import Header from '@/components/Header'
import Footer from '@/components/Footer'
import HomeContent from '@/components/HomeContent'
import ProductCard from '@/components/ProductCard'
import { getCachedProdutos, agruparProdutos, getProdutos } from '@/lib/utils'
import { getFeaturedBrands } from '@/lib/brandData'
import BrandShowcase from '@/components/BrandShowcase'
import { Clock, ShoppingCart, Menu, Search, MapPin } from 'lucide-react'
import Image from 'next/image'

interface SearchParams {
    q?: string
}

export default async function HomePetz({
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

    // Custom Petz-style categories
    const categories = [
        { name: 'Cães', icon: '🐕' },
        { name: 'Gatos', icon: '🐈' },
        { name: 'Pássaros', icon: '🦜' },
        { name: 'Peixes', icon: '🐠' },
        { name: 'Outros Pets', icon: '🐰' },
        { name: 'Casa e Jardim', icon: '🏡' },
        { name: 'Promoções', icon: '🔥' },
    ]

    return (
        <div className="min-h-screen flex flex-col bg-[#f3f3f3]">
            {/* Top Bar - Supermarket Style */}
            <div className="bg-[#004990] text-white text-xs py-2 px-4 hidden md:block">
                <div className="max-w-[1440px] mx-auto flex justify-between items-center">
                    <div className="flex gap-4">
                        <span className="flex items-center gap-1"><MapPin size={12} /> Informe seu CEP para ver os melhores preços</span>
                    </div>
                    <div className="flex gap-4">
                        <a href="#" className="hover:underline">As melhores ofertas</a>
                        <a href="#" className="hover:underline">Lojas</a>
                        <a href="#" className="hover:underline">Blog</a>
                    </div>
                </div>
            </div>

            {/* Main Header - Petz Style (Yellow/Blue) */}
            <header className="bg-[#FFD000] py-4 sticky top-0 z-50 shadow-md">
                <div className="max-w-[1440px] mx-auto px-4 flex items-center gap-4 md:gap-8">
                    {/* Logo Placeholder */}
                    <div className="font-black text-[#004990] text-3xl tracking-tighter shrink-0 cursor-pointer">
                        GuiaDoPet<span className="text-white text-lg">.z</span>
                    </div>

                    {/* Search Bar - Dense */}
                    <div className="flex-1 relative hidden md:block">
                        <div className="flex">
                            <input
                                type="text"
                                placeholder="O que seu pet precisa?"
                                className="w-full py-3 px-4 rounded-l-md border-0 focus:ring-2 focus:ring-blue-800 text-gray-800"
                            />
                            <button className="bg-[#004990] text-white px-6 rounded-r-md font-bold hover:bg-[#003366] transition-colors">
                                <Search size={20} />
                            </button>
                        </div>
                    </div>

                    {/* User Actions */}
                    <div className="flex items-center gap-6 text-[#004990] font-bold text-sm shrink-0">
                        <div className="hidden md:flex items-center gap-2 cursor-pointer hover:bg-white/20 p-2 rounded-lg transition">
                            <Clock size={24} />
                            <div className="flex flex-col leading-tight">
                                <span>Assinatura</span>
                                <span className="text-xs font-normal">Repet</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 cursor-pointer hover:bg-white/20 p-2 rounded-lg transition">
                            <ShoppingCart size={24} />
                            <span className="hidden md:inline">Carrinho</span>
                        </div>
                    </div>
                </div>
            </header>

            {/* Secondary Nav - Categories */}
            <div className="bg-white border-b border-gray-200 shadow-sm overflow-x-auto">
                <div className="max-w-[1440px] mx-auto px-4 flex gap-8 py-3 min-w-max">
                    <div className="flex items-center gap-2 font-bold text-[#004990] cursor-pointer mr-4">
                        <Menu size={20} />
                        <span>Departamentos</span>
                    </div>
                    {categories.map(cat => (
                        <a key={cat.name} href="#" className="text-gray-600 font-bold hover:text-[#004990] text-sm flex items-center gap-2 transition-colors">
                            <span>{cat.icon}</span> {cat.name}
                        </a>
                    ))}
                </div>
            </div>

            <main className="flex-1 w-full max-w-[1440px] mx-auto px-4 py-6">

                {!searchTerm && (
                    <>
                        {/* Hero Banners Grid - Retail Style */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                            <div className="md:col-span-2 h-[300px] bg-blue-100 rounded-xl overflow-hidden relative group cursor-pointer">
                                <Image
                                    src="https://images.unsplash.com/photo-1548199973-03cce0bbc87b?q=80&w=2669&auto=format&fit=crop"
                                    alt="Banner Principal"
                                    fill
                                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                                />
                                <div className="absolute inset-0 bg-gradient-to-r from-[#004990]/80 to-transparent flex flex-col justify-center px-12 text-white">
                                    <span className="bg-[#FFD000] text-[#004990] font-black text-xs px-2 py-1 inline-block w-fit rounded mb-2">SEMANA DO CONSUMIDOR</span>
                                    <h2 className="text-4xl font-black mb-4">Todo o site com <br /> até 50% OFF</h2>
                                    <button className="bg-[#FFD000] text-[#004990] font-bold py-3 px-8 rounded-full w-fit hover:bg-white transition-colors">
                                        Aproveitar Ofertas
                                    </button>
                                </div>
                            </div>
                            <div className="h-[300px] flex flex-col gap-4">
                                <div className="flex-1 bg-yellow-100 rounded-xl relative overflow-hidden flex items-center px-6">
                                    <div className="z-10">
                                        <h3 className="font-black text-[#004990] text-xl mb-1">Assine e ganhe</h3>
                                        <p className="text-sm text-gray-700 mb-2">10% OFF na 1ª compra</p>
                                        <button className="text-sm font-bold text-[#004990] underline">Ver mais</button>
                                    </div>
                                    <Image src="https://images.unsplash.com/photo-1537151625747-768eb6cf92b2?q=80&w=2568&auto=format&fit=crop" alt="" fill className="object-cover opacity-50 -z-0" />
                                </div>
                                <div className="flex-1 bg-purple-100 rounded-xl relative overflow-hidden flex items-center px-6">
                                    <div className="z-10">
                                        <h3 className="font-black text-purple-900 text-xl mb-1">Retire na Loja</h3>
                                        <p className="text-sm text-gray-700 mb-2">Frete Grátis acima de R$100</p>
                                        <button className="text-sm font-bold text-purple-900 underline">Confira regras</button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Ofertas Relâmpago Section */}
                        <div className="bg-white p-6 rounded-xl shadow-sm mb-8 border-t-4 border-[#FFD000]">
                            <div className="flex justify-between items-center mb-6">
                                <div className="flex items-center gap-2">
                                    <Clock className="text-red-600 animate-pulse" />
                                    <h2 className="text-2xl font-black text-[#004990] uppercase italic">Ofertas Relâmpago</h2>
                                    <span className="hidden md:inline bg-red-100 text-red-600 text-xs font-bold px-2 py-1 rounded">ACABA EM 02:14:59</span>
                                </div>
                                <a href="#" className="font-bold text-blue-600 hover:underline text-sm">Ver todas as ofertas</a>
                            </div>

                            {/* Horizontal Scroller for Offers */}
                            <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
                                {/* Manually placed high-value items just for demo visuals */}
                                <div className="min-w-[200px] border border-gray-100 rounded-lg p-3 hover:shadow-md transition bg-white">
                                    <div className="w-full h-32 relative mb-2">
                                        <span className="absolute top-0 left-0 bg-red-600 text-white text-xs font-bold px-2 py-1 rounded">-30%</span>
                                        <Image src="https://images.petz.com.br/fotos/1699967180573.jpg" alt="Bravec" fill className="object-contain" unoptimized />
                                    </div>
                                    <p className="text-sm text-gray-600 line-clamp-2 mb-1">Bravecto Antipulgas 20-40kg</p>
                                    <div className="text-xs text-gray-400 line-through">R$ 280,00</div>
                                    <div className="text-xl font-black text-[#004990]">R$ 189,90</div>
                                    <div className="text-xs text-[#004990] font-bold">ou 5x de R$ 37,98</div>
                                </div>
                                {/* ... repeated items for filler would go here, but using HomeContent below for real density */}
                            </div>
                        </div>

                        {/* Marcas */}
                        <BrandShowcase
                            brands={getFeaturedBrands()}
                            title="Nossas Marcas Parceiras"
                            subtitle=""
                        />
                    </>
                )}

                {/* Main Product Grid - High Density */}
                <div className="mt-8">
                    <h2 className="text-xl font-bold text-[#004990] mb-4 border-l-4 border-[#FFD000] pl-3">
                        {searchTerm ? `Resultados para "${searchTerm}"` : 'Recomendado para você'}
                    </h2>
                    <HomeContent grupos={grupos} searchTerm={searchTerm} />
                </div>

            </main>

            <Footer />
        </div>
    )
}
