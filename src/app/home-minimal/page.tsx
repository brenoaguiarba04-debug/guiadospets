import Header from '@/components/Header'
import Footer from '@/components/Footer'
import HomeContent from '@/components/HomeContent'
import { getCachedProdutos, agruparProdutos, getProdutos } from '@/lib/utils'

interface SearchParams {
    q?: string
}

export default async function MinimalHome({
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
            {/* Simplified Header just for context (reusing main for now but could be simpler) */}
            <Header />

            <main className="flex-1 w-full max-w-7xl mx-auto px-4 py-8">

                {/* Minimalist Header Section */}
                {!searchTerm && (
                    <div className="text-center py-12 mb-8 border-b border-gray-100">
                        <h1 className="text-4xl font-black text-gray-800 tracking-tighter mb-4">
                            O que você procura?
                        </h1>
                        <p className="text-gray-500 max-w-md mx-auto">
                            Busque preços em Amazon, Shopee e Mercado Livre instantaneamente.
                        </p>
                        {/* Visual Quick Links */}
                        <div className="flex justify-center gap-4 mt-8 flex-wrap">
                            {/* Using text links instead of heavy icons */}
                            {['Rações', 'Antipulgas', 'Areia', 'Brinquedos'].map(cat => (
                                <a key={cat} href={`/?q=${cat}`} className="px-4 py-2 bg-gray-50 hover:bg-gray-100 rounded-lg text-sm font-bold text-gray-600 transition-colors">
                                    {cat}
                                </a>
                            ))}
                        </div>
                    </div>
                )}

                <HomeContent grupos={grupos} searchTerm={searchTerm} />
            </main>

            {/* Minimal Footer */}
            <footer className="border-t border-gray-100 py-8 text-center text-gray-400 text-sm">
                <p>© 2024 Guia do Pet (Versão Minimalista)</p>
            </footer>
        </div>
    )
}
