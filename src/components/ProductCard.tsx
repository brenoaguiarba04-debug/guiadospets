'use client'

import Image from 'next/image'
import Link from 'next/link'

interface ProductCardProps {
    title: string
    image: string
    price?: number
    installments?: string
    store?: string
    rating?: number
    reviews?: number
    slug?: string
    offerBadge?: boolean
    cashback?: string
    // Legacy props support (optional)
    nomePrincipal?: string
}

export default function ProductCard({
    title,
    image,
    price,
    installments,
    store = 'Melhor Oferta',
    rating = 4.8,
    reviews = 0,
    slug = '#',
    offerBadge,
    cashback,
    nomePrincipal
}: ProductCardProps) {
    // Fallback for title if using legacy prop
    const displayTitle = title || nomePrincipal || 'Produto sem nome'

    // Safe price display
    const formattedPrice = (typeof price === 'number')
        ? price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })
        : '0,00'

    const productLink = slug && slug !== '#' ? `/produto/${slug}` : `/ofertas?q=${encodeURIComponent(displayTitle)}`

    return (
        <Link href={productLink} className="group bg-white rounded-xl border border-gray-200 p-4 hover:shadow-xl transition-all hover:border-purple-300 flex flex-col h-full relative overflow-hidden">

            {/* Offer Badge (Buscapé Style Fire) */}
            {offerBadge && (
                <div className="absolute top-0 left-0 bg-[#ffd000] text-[#522166] text-xs font-bold px-3 py-1 rounded-br-lg z-10 flex items-center gap-1">
                    🔥 Oferta do dia
                </div>
            )}

            {/* Favorite Button */}
            <button className="absolute top-3 right-3 text-gray-300 hover:text-red-500 transition-colors z-10" onClick={(e) => e.preventDefault()}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
            </button>

            {/* Image Area */}
            <div className="relative w-full h-48 mb-4 flex items-center justify-center p-2 group-hover:scale-105 transition-transform duration-300">
                {/* Using unoptimized img for demo if external, or next/image usually */}
                {image ? (
                    <img src={image} alt={displayTitle} className="max-h-full max-w-full object-contain" />
                ) : (
                    <div className="w-full h-full bg-gray-100 flex items-center justify-center text-2xl">🐾</div>
                )}
            </div>

            {/* Content */}
            <div className="flex-1 flex flex-col">
                {/* Title */}
                <h3 className="text-sm font-medium text-gray-800 line-clamp-2 mb-2 min-h-[40px] group-hover:text-[#6b21a8] transition-colors">{displayTitle}</h3>

                {/* Rating */}
                <div className="flex items-center gap-1 mb-3">
                    <div className="flex text-yellow-400 text-xs">
                        {[...Array(5)].map((_, i) => (
                            <svg key={i} xmlns="http://www.w3.org/2000/svg" className={`h-3 w-3 ${i < Math.floor(rating) ? 'fill-current' : 'text-gray-200'}`} viewBox="0 0 20 20" fill="currentColor">
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                        ))}
                    </div>
                    <span className="text-xs text-gray-400">({reviews})</span>
                </div>

                {/* Price Block */}
                <div className="mt-auto">

                    {/* Store Badge */}
                    <div className="text-[10px] text-gray-500 mb-1 flex items-center gap-1">
                        Menor preço via <span className="font-bold text-[#522166]">{store}</span>
                    </div>

                    <div className="flex items-end gap-2 mb-1">
                        <span className="text-2xl font-extrabold text-[#522166]">
                            R$ {formattedPrice}
                        </span>
                        {/* Cashback Tag */}
                        {cashback && (
                            <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded flex items-center gap-0.5 mb-1.5">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                </svg>
                                {cashback} volta
                            </span>
                        )}
                    </div>

                    {installments && (
                        <div className="text-xs text-green-600 font-medium truncate">
                            {installments}
                        </div>
                    )}
                </div>
            </div>

            {/* Footer - "Compare" Link */}
            <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
                <span className="text-xs text-gray-500">Compare ofertas</span>
                <span className="text-xs text-[#6b21a8] font-bold group-hover:underline">Ver preços &gt;</span>
            </div>
        </Link>
    )
}
