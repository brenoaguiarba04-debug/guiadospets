'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'

export interface VariantData {
    id: number
    label: string
    imagem: string
    preco: number
    loja: string
}

interface ProductCardProps {
    title: string
    image: string
    price?: number
    installments?: string
    store?: string
    rating?: number
    reviews?: number
    id?: number
    slug?: string
    offerBadge?: boolean
    cashback?: string
    // Legacy props support (optional)
    nomePrincipal?: string
    variants?: VariantData[]
}

export default function ProductCard({
    title,
    image,
    price,
    installments,
    store = 'Melhor Oferta',
    rating = 4.8,
    reviews = 0,
    id,
    slug = '#',
    offerBadge,
    cashback,
    nomePrincipal,
    variants
}: ProductCardProps) {
    // State for interactive variants
    const [selectedVariant, setSelectedVariant] = useState<VariantData | null>(null)
    const [imageError, setImageError] = useState(false)

    // Reset selection when title changes (new product loaded in same slot)
    useEffect(() => {
        setSelectedVariant(null)
    }, [title, nomePrincipal])

    // Determine values to display (Selected Variant OR Default Props)
    const activeImage = selectedVariant?.imagem || image
    const activeTitle = title || nomePrincipal || 'Produto sem nome'
    const activePrice = selectedVariant?.preco || price
    const activeStore = selectedVariant?.loja || store
    const activeId = selectedVariant?.id || id

    // Safe price display
    const formattedPrice = (typeof activePrice === 'number')
        ? activePrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })
        : '0,00'

    // Generate accurate link
    let productLink = '#'
    if (activeId) {
        productLink = `/produto/${activeId}`
    } else if (slug && slug !== '#') {
        if (slug.startsWith('ofertas') || slug.startsWith('/') || slug.startsWith('http')) {
            productLink = slug.startsWith('ofertas') ? `/${slug}` : slug
        } else {
            productLink = `/?q=${slug}`
        }
    } else {
        productLink = `/?q=${encodeURIComponent(activeTitle)}`
    }

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
                {activeImage && !imageError ? (
                    <img
                        src={activeImage}
                        alt={activeTitle}
                        className="max-h-full max-w-full object-contain"
                        onError={() => setImageError(true)}
                    />
                ) : (
                    <div className="w-full h-full bg-gray-50 rounded-lg flex flex-col items-center justify-center text-gray-300 gap-2">
                        <span className="text-4xl">🐾</span>
                        <span className="text-[10px] font-medium">Sem foto</span>
                    </div>
                )}
            </div>

            {/* Content */}
            <div className="flex-1 flex flex-col">
                {/* Title */}
                <h3 className="text-sm font-medium text-gray-800 line-clamp-2 mb-2 min-h-[40px] group-hover:text-[#6b21a8] transition-colors">{activeTitle}</h3>

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

                {/* Variants (Weights) */}
                {variants && variants.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                        {variants.slice(0, 3).map((variant, i) => {
                            const isSelected = selectedVariant?.id === variant.id
                            return (
                                <button
                                    key={i}
                                    onClick={(e) => {
                                        e.preventDefault()
                                        e.stopPropagation()
                                        setSelectedVariant(variant)
                                    }}
                                    className={`text-[10px] px-2 py-1 rounded border transition-colors ${isSelected
                                        ? 'bg-purple-100 border-purple-300 text-purple-700 font-bold'
                                        : 'bg-white text-gray-600 border-gray-200 hover:border-purple-200'
                                        }`}
                                >
                                    {variant.label}
                                </button>
                            )
                        })}
                        {variants.length > 3 && (
                            <span className="text-[10px] text-gray-500 px-1 py-0.5 self-center">
                                +{variants.length - 3}
                            </span>
                        )}
                    </div>
                )}

                {/* Price Block */}
                <div className="mt-auto">

                    {/* Store Badge */}
                    <div className="text-[10px] text-gray-500 mb-1 flex items-center gap-1">
                        Menor preço via <span className="font-bold text-[#522166]">{activeStore}</span>
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

            {/* Footer - "Compare" Link (Visible by default) */}
            <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between group-hover:opacity-0 transition-opacity duration-200">
                <span className="text-xs text-gray-500">Compare ofertas</span>
                <span className="text-xs text-[#6b21a8] font-bold">Ver preços &gt;</span>
            </div>

            {/* Hover Action Button (Slides up) */}
            <div className="absolute bottom-0 left-0 right-0 p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out bg-white/95 backdrop-blur-sm border-t border-purple-100">
                <button className="w-full bg-[#6b21a8] text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 hover:bg-[#5a1b8e] transition-colors shadow-lg">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                        <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                    </svg>
                    Ver Ofertas
                </button>
            </div>
        </Link>
    )
}
