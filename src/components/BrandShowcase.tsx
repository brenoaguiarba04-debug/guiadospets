'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useState, useRef } from 'react'
import { Brand } from '@/lib/brandData'

interface BrandShowcaseProps {
    brands: Brand[]
    title?: string
    subtitle?: string
}

// Componente de Logo com Fallback
function BrandLogo({ brand }: { brand: Brand }) {
    const [imgError, setImgError] = useState(false)

    if (imgError) {
        // Fallback: mostrar inicial da marca com cor de fundo
        return (
            <div
                className="w-full h-full rounded-lg flex items-center justify-center text-white font-black text-2xl"
                style={{ backgroundColor: brand.color }}
            >
                {brand.logoFallback || brand.name.charAt(0)}
            </div>
        )
    }

    return (
        <Image
            src={brand.logo}
            alt={brand.name}
            fill
            className="object-contain transition-all duration-300"
            onError={() => setImgError(true)}
            unoptimized
        />
    )
}

export default function BrandShowcase({ brands, title = "Marcas que Amamos", subtitle = "As melhores marcas do mercado pet em um só lugar" }: BrandShowcaseProps) {
    const scrollRef = useRef<HTMLDivElement>(null)
    const [canScrollLeft, setCanScrollLeft] = useState(false)
    const [canScrollRight, setCanScrollRight] = useState(true)

    const checkScroll = () => {
        if (scrollRef.current) {
            const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current
            setCanScrollLeft(scrollLeft > 0)
            setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10)
        }
    }

    const scroll = (direction: 'left' | 'right') => {
        if (scrollRef.current) {
            const scrollAmount = 300
            scrollRef.current.scrollBy({
                left: direction === 'left' ? -scrollAmount : scrollAmount,
                behavior: 'smooth'
            })
            setTimeout(checkScroll, 300)
        }
    }

    return (
        <section className="py-12 bg-gradient-to-b from-purple-50 to-white">
            <div className="max-w-7xl mx-auto px-4">
                {/* Header */}
                <div className="text-center mb-8">
                    <h2 className="text-3xl font-extrabold text-gray-900 mb-2">
                        {title}
                    </h2>
                    <p className="text-gray-600">
                        {subtitle}
                    </p>
                </div>

                {/* Carrossel de Marcas */}
                <div className="relative group">
                    {/* Botão Esquerda */}
                    <button
                        onClick={() => scroll('left')}
                        className={`absolute left-0 top-1/2 -translate-y-1/2 z-10 w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center transition-all hover:bg-purple-50 hover:scale-110 ${canScrollLeft ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                    >
                        <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>

                    {/* Container de Scroll */}
                    <div
                        ref={scrollRef}
                        onScroll={checkScroll}
                        className="flex gap-6 overflow-x-auto scrollbar-hide pb-4 px-2 -mx-2 scroll-smooth"
                        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                    >
                        {brands.map((brand) => (
                            <Link
                                key={brand.slug}
                                href={`/marca/${brand.slug}`}
                                className="flex-shrink-0 group/card"
                            >
                                <div className="w-48 h-48 bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 flex flex-col items-center justify-center p-6 border border-gray-100 hover:border-purple-200 hover:-translate-y-1">
                                    {/* Logo Container */}
                                    <div className="relative w-28 h-20 mb-4 flex items-center justify-center overflow-hidden rounded-lg">
                                        <BrandLogo brand={brand} />
                                    </div>

                                    {/* Nome da Marca */}
                                    <h3 className="font-bold text-gray-700 group-hover/card:text-purple-600 transition-colors text-center">
                                        {brand.name}
                                    </h3>

                                    {/* Badge de Categoria */}
                                    <span className={`mt-2 text-xs px-2 py-1 rounded-full font-medium ${brand.category === 'premium' ? 'bg-amber-100 text-amber-700' :
                                        brand.category === 'natural' ? 'bg-green-100 text-green-700' :
                                            brand.category === 'veterinary' ? 'bg-blue-100 text-blue-700' :
                                                'bg-gray-100 text-gray-600'
                                        }`}>
                                        {brand.category === 'premium' ? '⭐ Premium' :
                                            brand.category === 'natural' ? '🌿 Natural' :
                                                brand.category === 'veterinary' ? '🏥 Veterinária' :
                                                    '📦 Standard'}
                                    </span>
                                </div>
                            </Link>
                        ))}
                    </div>

                    {/* Botão Direita */}
                    <button
                        onClick={() => scroll('right')}
                        className={`absolute right-0 top-1/2 -translate-y-1/2 z-10 w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center transition-all hover:bg-purple-50 hover:scale-110 ${canScrollRight ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                    >
                        <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                    </button>
                </div>

                {/* Link para ver todas */}
                <div className="text-center mt-8">
                    <Link
                        href="/marcas"
                        className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 text-white font-bold rounded-full hover:bg-purple-700 transition-colors shadow-lg hover:shadow-xl"
                    >
                        Ver Todas as Marcas
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                        </svg>
                    </Link>
                </div>
            </div>
        </section>
    )
}
