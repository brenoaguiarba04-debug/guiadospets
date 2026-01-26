'use client'

import { useState, useEffect, memo } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

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
    nomePrincipal?: string
    variants?: VariantData[]
}

function ProductCard({
    title, image, price, installments, store = 'Melhor Oferta',
    rating = 4.8, reviews = 0, id, slug = '#',
    offerBadge, cashback, nomePrincipal, variants
}: ProductCardProps) {
    const [selectedVariant, setSelectedVariant] = useState<VariantData | null>(null)
    const [imageError, setImageError] = useState(false)

    useEffect(() => { setSelectedVariant(null) }, [title, nomePrincipal])

    const activeImage = selectedVariant?.imagem || image
    const activeTitle = title || nomePrincipal || 'Produto sem nome'
    const activePrice = selectedVariant?.preco || price
    const activeStore = selectedVariant?.loja || store
    const activeId = selectedVariant?.id || id

    const formattedPrice = (typeof activePrice === 'number')
        ? activePrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })
        : '0,00'

    let productLink = '#'
    if (activeId) productLink = `/produto/${activeId}`
    else if (slug && slug !== '#') {
        productLink = (slug.startsWith('ofertas') || slug.startsWith('/') || slug.startsWith('http'))
            ? (slug.startsWith('ofertas') ? `/${slug}` : slug)
            : `/?q=${slug}`
    } else {
        productLink = `/?q=${encodeURIComponent(activeTitle)}`
    }

    return (
        <Link href={productLink} className="group relative block h-full">
            <div
                className="h-full bg-white rounded-2xl p-4 flex flex-col relative overflow-hidden transition-all duration-300 border border-transparent hover:border-purple-100 hover:shadow-lg hover:-translate-y-1 ring-1 ring-gray-100 ring-offset-0"
            >

                {/* Badges */}
                <div className="absolute top-0 left-0 p-3 z-10 flex flex-col gap-2">
                    {offerBadge && (
                        <span className="bg-yellow-400 text-yellow-900 text-[10px] font-black uppercase px-2 py-1 rounded-lg shadow-sm">
                            🔥 Oferta
                        </span>
                    )}
                    {cashback && (
                        <span className="bg-blue-500 text-white text-[10px] font-bold px-2 py-1 rounded-lg shadow-sm">
                            {cashback} cashback
                        </span>
                    )}
                </div>

                {/* Favorite Heart - Simplified */}
                <div className="absolute top-3 right-3 z-20 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="p-2 rounded-full bg-white text-gray-300 hover:text-red-500 shadow-sm" onClick={(e) => e.preventDefault()}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                        </svg>
                    </button>
                </div>

                {/* Image */}
                <div className="relative w-full aspect-square mb-4 flex items-center justify-center p-2 bg-white">
                    {activeImage && !imageError ? (
                        <div className="relative w-full h-full">
                            <Image
                                src={activeImage}
                                alt={activeTitle}
                                fill
                                sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
                                className="object-contain drop-shadow-sm group-hover:scale-105 transition-transform duration-300"
                                onError={() => setImageError(true)}
                                loading="lazy"
                                unoptimized={activeImage?.includes('petz') || activeImage?.includes('cobasi')}
                            />
                        </div>
                    ) : (
                        <div className="w-full h-full bg-gray-50 rounded-xl flex flex-col items-center justify-center text-gray-300 gap-2">
                            <span className="text-4xl filter grayscale opacity-50">🐾</span>
                        </div>
                    )}

                    {/* Quick Action Overlay (Moved to Image) */}
                    <div className="absolute bottom-2 left-2 right-2 translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300 z-20">
                        <button className="w-full bg-white/90 backdrop-blur-sm text-purple-700 font-bold py-2.5 rounded-xl shadow-lg border border-purple-100 flex items-center justify-center gap-2 hover:bg-purple-600 hover:text-white transition-all">
                            Ver Preços
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 flex flex-col">
                    <h3 className="text-sm font-semibold text-gray-700 leading-snug line-clamp-2 mb-2 group-hover:text-purple-700 transition-colors">
                        {activeTitle}
                    </h3>

                    {/* Meta Rating & Store */}
                    <div className="flex items-center justify-between mb-3 text-xs">
                        <div className="flex items-center gap-1 text-yellow-400">
                            <span>★</span>
                            <span className="font-bold text-gray-600">{rating}</span>
                        </div>
                        <div className="text-gray-400 font-medium truncate max-w-[50%]">
                            {activeStore}
                        </div>
                    </div>

                    {/* Variants */}
                    {variants && variants.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-3">
                            {variants.slice(0, 4).map((variant, i) => (
                                <button
                                    key={i}
                                    onClick={(e) => {
                                        e.preventDefault(); e.stopPropagation(); setSelectedVariant(variant)
                                    }}
                                    className={twMerge(
                                        "text-[10px] px-1.5 py-0.5 rounded border transition-all",
                                        selectedVariant?.id === variant.id
                                            ? "bg-purple-600 text-white border-purple-600 font-bold shadow-md"
                                            : "bg-gray-50 text-gray-500 border-gray-100 hover:border-purple-200 hover:text-purple-600"
                                    )}
                                >
                                    {variant.label}
                                </button>
                            ))}
                            {variants.length > 4 && (
                                <span className="text-[10px] text-gray-400 px-1 py-0.5">+</span>
                            )}
                        </div>
                    )}

                    {/* Price */}
                    <div className="mt-auto pt-2 border-t border-dashed border-gray-100">
                        <div className="flex flex-col">
                            <span className="text-xs text-gray-400 font-medium">a partir de</span>
                            <div className="flex items-baseline gap-1">
                                <span className="text-sm text-purple-600 font-bold">R$</span>
                                <span className="text-2xl font-black text-gray-800 tracking-tight group-hover:text-purple-700 transition-colors">
                                    {formattedPrice.split(',')[0]}
                                </span>
                                <span className="text-xs text-gray-800 font-bold">
                                    ,{formattedPrice.split(',')[1]}
                                </span>
                            </div>
                        </div>
                        {installments && (
                            <div className="text-[10px] text-green-600 font-medium mt-1 truncate">
                                {installments}
                            </div>
                        )}
                    </div>
                </div>

                {/* Quick Action Overlay (CSS Only) */}

            </div>
        </Link>
    )
}

export default memo(ProductCard)
