import Header from '@/components/Header'
import Footer from '@/components/Footer'
import HomeContent from '@/components/HomeContent'
import { getCachedProdutos, agruparProdutos, getProdutos } from '@/lib/utils'
import PetloveCategories from '@/components/PetloveCategories'
import HeroCarousel from '@/components/HeroCarousel'
import { Check, Truck, ShieldCheck, Heart } from 'lucide-react'
import Image from 'next/image'

interface SearchParams {
    q?: string
}

export default async function HomePetlove({
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

    return (
        <div className="min-h-screen flex flex-col bg-white">
            {/* Petlove-style Header: Reusing main header as it's already close, but could customize */}
            <Header />

            <main className="flex-1 w-full">

                {!searchTerm && (
                    <>
                        {/* Hero Carousel */}
                        <div className="bg-[#522166] pb-12 pt-4">
                            <div className="max-w-[1200px] mx-auto px-4">
                                <HeroCarousel />
                            </div>
                        </div>

                        {/* Trust/Benefits Bar - Specific to Petlove style */}
                        <div className="border-b border-gray-100 bg-white relative -mt-6 z-10 max-w-6xl mx-auto rounded-xl shadow-lg px-8 py-6 flex flex-wrap justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-purple-100 rounded-full text-purple-700"><Truck size={20} /></div>
                                <div className="flex flex-col">
                                    <span className="font-bold text-gray-800 text-sm">Frete Grátis</span>
                                    <span className="text-xs text-gray-500">Confira as regras</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-purple-100 rounded-full text-purple-700"><Clock size={20} /></div>
                                <div className="flex flex-col">
                                    <span className="font-bold text-gray-800 text-sm">Entrega Expressa</span>
                                    <span className="text-xs text-gray-500">Receba hoje mesmo</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-purple-100 rounded-full text-purple-700"><ShieldCheck size={20} /></div>
                                <div className="flex flex-col">
                                    <span className="font-bold text-gray-800 text-sm">Compra Segura</span>
                                    <span className="text-xs text-gray-500">100% Protegida</span>
                                </div>
                            </div>
                        </div>

                        {/* Categories */}
                        <div className="py-8">
                            <PetloveCategories />
                        </div>

                        {/* Repet Banner (Subscription) */}
                        <section className="bg-[#F4F2F6] py-16">
                            <div className="max-w-[1200px] mx-auto px-4 flex flex-col md:flex-row items-center gap-12">
                                <div className="flex-1 space-y-6">
                                    <div className="inline-block bg-[#522166] text-white px-3 py-1 rounded text-xs font-bold tracking-widest uppercase">
                                        Assinatura Repet
                                    </div>
                                    <h2 className="text-4xl md:text-5xl font-black text-[#522166] leading-tight">
                                        Ganhe 10% OFF em <br /> todas as compras.
                                    </h2>
                                    <ul className="space-y-4">
                                        {['Desconto em todos os produtos', 'Sem taxa de adesão ou cancelamento', 'Personalize a frequência de entrega'].map((item, i) => (
                                            <li key={i} className="flex items-center gap-3 text-gray-700 font-medium">
                                                <div className="h-6 w-6 rounded-full bg-green-100 flex items-center justify-center text-green-600 shrink-0">
                                                    <Check size={14} strokeWidth={4} />
                                                </div>
                                                {item}
                                            </li>
                                        ))}
                                    </ul>
                                    <button className="bg-[#522166] text-white px-8 py-4 rounded-full font-bold text-lg hover:bg-purple-800 transition-all shadow-xl hover:scale-105">
                                        Quero economizar agora
                                    </button>
                                </div>
                                <div className="flex-1 relative h-[400px] w-full">
                                    <Image
                                        src="https://images.unsplash.com/photo-1583511655826-05700d52f4d9?q=80&w=2576&auto=format&fit=crop"
                                        alt="Dog Repet"
                                        fill
                                        className="object-cover rounded-3xl shadow-2xl"
                                    />
                                    {/* Floating Card */}
                                    <div className="absolute -bottom-6 -left-6 bg-white p-4 rounded-xl shadow-xl flex items-center gap-4 animate-bounce duration-[3000ms]">
                                        <div className="h-12 w-12 bg-yellow-100 rounded-full flex items-center justify-center text-2xl">💰</div>
                                        <div className="flex flex-col">
                                            <span className="font-bold text-gray-800">Economia real</span>
                                            <span className="text-xs text-green-600 font-black">+R$ 150/ano</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </section>
                    </>
                )}

                <div className="max-w-[1200px] mx-auto px-4 py-16">
                    <h2 className="text-3xl font-black text-[#522166] mb-8 text-center">
                        Destaques para você 🐾
                    </h2>
                    <HomeContent grupos={grupos} searchTerm={searchTerm} />
                </div>

            </main>

            <Footer />
        </div>
    )
}

// Helper icon import (need to check imports if missing)
import { Clock } from 'lucide-react'
