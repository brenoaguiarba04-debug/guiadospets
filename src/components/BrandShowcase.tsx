'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'
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
        return (
            <div
                className="w-full h-full rounded-lg flex items-center justify-center text-white font-black text-xl"
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
            className="object-contain"
            onError={() => setImgError(true)}
            unoptimized
        />
    )
}

// Componente de Item da Marca para o Marquee
function BrandItem({ brand }: { brand: Brand }) {
    return (
        <Link
            href={`/marca/${brand.slug}`}
            className="flex items-center gap-3 px-6 py-3 bg-white rounded-full shadow-md hover:shadow-lg transition-all hover:scale-105 border border-gray-100 hover:border-purple-300 group whitespace-nowrap"
        >
            <div className="relative w-10 h-10 flex-shrink-0 rounded-lg overflow-hidden">
                <BrandLogo brand={brand} />
            </div>
            <span className="font-bold text-gray-700 group-hover:text-purple-600 transition-colors">
                {brand.name}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${brand.category === 'premium' ? 'bg-amber-100 text-amber-700' :
                    brand.category === 'natural' ? 'bg-green-100 text-green-700' :
                        brand.category === 'veterinary' ? 'bg-blue-100 text-blue-700' :
                            'bg-gray-100 text-gray-600'
                }`}>
                {brand.category === 'premium' ? '⭐' :
                    brand.category === 'natural' ? '🌿' :
                        brand.category === 'veterinary' ? '🏥' : '📦'}
            </span>
        </Link>
    )
}

export default function BrandShowcase({ brands, title = "Marcas que Amamos", subtitle = "As melhores marcas do mercado pet em um só lugar" }: BrandShowcaseProps) {
    // Duplicar as marcas para loop infinito
    const duplicatedBrands = [...brands, ...brands, ...brands]

    return (
        <section className="py-12 bg-gradient-to-b from-purple-50 to-white overflow-hidden">
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
            </div>

            {/* Marquee Container - Full Width */}
            <div className="relative w-full">
                {/* Gradient Fade Left */}
                <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-purple-50 to-transparent z-10 pointer-events-none"></div>

                {/* Gradient Fade Right */}
                <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-purple-50 to-transparent z-10 pointer-events-none"></div>

                {/* Marquee Track */}
                <div className="flex animate-marquee hover:pause-animation">
                    {duplicatedBrands.map((brand, index) => (
                        <div key={`${brand.slug}-${index}`} className="flex-shrink-0 mx-3">
                            <BrandItem brand={brand} />
                        </div>
                    ))}
                </div>
            </div>

            {/* Link para ver todas */}
            <div className="text-center mt-10">
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

            {/* CSS Animation */}
            <style jsx>{`
                @keyframes marquee {
                    0% {
                        transform: translateX(0);
                    }
                    100% {
                        transform: translateX(-33.333%);
                    }
                }
                .animate-marquee {
                    animation: marquee 30s linear infinite;
                }
                .animate-marquee:hover {
                    animation-play-state: paused;
                }
            `}</style>
        </section>
    )
}
