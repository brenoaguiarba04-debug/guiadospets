'use client'

import { useRef } from 'react'
import Link from 'next/link'
import ProductCard from './ProductCard'
import { ChevronLeft, ChevronRight } from 'lucide-react'

// Mock Data for the Carousel
const RECOMMENDED_PRODUCTS = [
    {
        id: 101,
        title: 'Bravecto Antipulgas para Cães de 2 a 4.5kg',
        image: 'https://placehold.co/400x400/522166/ffffff?text=Bravecto',
        price: 189.90,
        store: 'Petz',
        rating: 4.9,
        reviews: 3200,
        slug: 'bravecto-2-4kg',
        offerBadge: true,
        cashback: '5%'
    },
    {
        id: 102,
        title: 'Ração Golden Special Frango e Carne para Cães Adultos',
        image: 'https://placehold.co/400x400/ffd000/522166?text=Golden+Special',
        price: 139.90,
        store: 'Amazon',
        rating: 4.7,
        reviews: 1540,
        slug: 'golden-special-15kg',
        installments: 'até 4x de R$ 34,97'
    },
    {
        id: 103,
        title: 'Tapete Higiênico Super Secão - 30 Unidades',
        image: 'https://placehold.co/400x400/522166/ffffff?text=Tapete+Higienico',
        price: 64.90,
        store: 'Cobasi',
        rating: 4.6,
        reviews: 890,
        slug: 'tapete-super-secao',
        cashback: '2%'
    },
    {
        id: 104,
        title: 'Vermífugo Drontal Plus Sabor Carne para Cães - 10kg',
        image: 'https://placehold.co/400x400/e5e7eb/522166?text=Drontal+Plus',
        price: 89.90,
        store: 'Petlove',
        rating: 4.9,
        reviews: 2100,
        slug: 'drontal-plus',
        installments: 'até 2x de R$ 44,95'
    },
    {
        id: 105,
        title: 'Areia Sanitária Pipicat Classic 4kg',
        image: 'https://placehold.co/400x400/ffd000/522166?text=Pipicat',
        price: 19.90,
        store: 'Magalu',
        rating: 4.8,
        reviews: 5400,
        slug: 'pipicat-4kg'
    },
    {
        id: 106,
        title: 'Arranhador para Gatos Torre 3 Andares',
        image: 'https://placehold.co/400x400/522166/ffffff?text=Arranhador',
        price: 249.90,
        store: 'Mercado Livre',
        rating: 4.5,
        reviews: 320,
        slug: 'arranhador-torre',
        installments: 'até 6x de R$ 41,65'
    }
]

interface ProductCarouselProps {
    title?: string
    products?: typeof RECOMMENDED_PRODUCTS
}

export default function ProductCarousel({ title = 'Quem viu, comprou também', products = RECOMMENDED_PRODUCTS }: ProductCarouselProps) {
    const scrollRef = useRef<HTMLDivElement>(null)

    const scroll = (direction: 'left' | 'right') => {
        if (scrollRef.current) {
            const scrollAmount = 300 // Approximately one card width + gap
            scrollRef.current.scrollBy({
                left: direction === 'left' ? -scrollAmount : scrollAmount,
                behavior: 'smooth'
            })
        }
    }

    return (
        <section className="py-12 bg-white border-t border-gray-100">
            <div className="max-w-7xl mx-auto px-4 relative">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-black text-gray-800">{title}</h2>

                    {/* Navigation Arrows */}
                    <div className="flex gap-2">
                        <button
                            onClick={() => scroll('left')}
                            className="p-2 rounded-full border border-gray-200 hover:bg-gray-50 text-gray-600 transition-colors"
                            aria-label="Scroll left"
                        >
                            <ChevronLeft size={20} />
                        </button>
                        <button
                            onClick={() => scroll('right')}
                            className="p-2 rounded-full border border-gray-200 hover:bg-gray-50 text-gray-600 transition-colors"
                            aria-label="Scroll right"
                        >
                            <ChevronRight size={20} />
                        </button>
                    </div>
                </div>

                {/* Carousel Container */}
                <div
                    ref={scrollRef}
                    className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x snap-mandatory -mx-4 px-4 md:mx-0 md:px-0"
                >
                    {products.map((product) => (
                        <div key={product.id} className="min-w-[280px] max-w-[280px] snap-start">
                            <ProductCard {...product} />
                        </div>
                    ))}

                    {/* "See More" Card */}
                    <Link href="/ofertas" className="min-w-[150px] flex flex-col items-center justify-center gap-3 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200 hover:border-purple-300 hover:bg-purple-50 transition-all group cursor-pointer snap-center">
                        <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                            <span className="text-2xl text-purple-600">+</span>
                        </div>
                        <span className="font-bold text-gray-600 group-hover:text-purple-700">Ver tudo</span>
                    </Link>
                </div>
            </div>
        </section>
    )
}
