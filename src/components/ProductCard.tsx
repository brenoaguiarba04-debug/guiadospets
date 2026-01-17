'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState } from 'react'
import { getStoreBadge } from '@/lib/utils'

interface Variacao {
    id: number
    label: string
    imagem: string
    preco: number
    loja: string
}

interface ProductCardProps {
    nomePrincipal: string
    imagemCapa: string
    menorPrecoCapa: number
    variacoes: Variacao[]
}

export default function ProductCard({
    nomePrincipal,
    imagemCapa,
    menorPrecoCapa,
    variacoes
}: ProductCardProps) {
    const [activeIndex, setActiveIndex] = useState(0)
    const activeVar = variacoes[activeIndex] || variacoes[0]

    const currentImage = activeVar?.imagem || imagemCapa
    const currentPrice = activeVar?.preco || menorPrecoCapa
    const currentLoja = activeVar?.loja || ''
    const currentId = activeVar?.id || 0

    const storeBadge = getStoreBadge(currentLoja)

    return (
        <div className="bg-white rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden group">
            {/* Image */}
            <div className="relative aspect-square bg-gray-50 p-4">
                <Image
                    src={currentImage || '/placeholder.png'}
                    alt={nomePrincipal}
                    fill
                    className="object-contain p-4 group-hover:scale-105 transition-transform duration-300"
                    onError={(e) => {
                        const target = e.target as HTMLImageElement
                        target.src = 'https://via.placeholder.com/200?text=Sem+Imagem'
                    }}
                />
            </div>

            {/* Info */}
            <div className="p-4 space-y-3">
                <h3 className="font-bold text-gray-800 line-clamp-2 min-h-[2.5rem] text-sm">
                    {nomePrincipal}
                </h3>

                {/* Variações */}
                {variacoes.length > 1 && (
                    <div className="space-y-1.5">
                        <span className="text-xs text-gray-500 font-medium">Selecione:</span>
                        <div className="flex flex-wrap gap-1.5">
                            {variacoes.map((v, idx) => (
                                <button
                                    key={v.id}
                                    onClick={() => setActiveIndex(idx)}
                                    className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-all ${idx === activeIndex
                                            ? 'bg-purple-600 text-white'
                                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                        }`}
                                >
                                    {v.label}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Preço */}
                {currentPrice > 0 ? (
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${storeBadge.className}`}>
                                {storeBadge.emoji} {currentLoja || 'Loja'}
                            </span>
                        </div>
                        <div className="text-xl font-extrabold text-green-600">
                            R$ {currentPrice.toFixed(2).replace('.', ',')}
                        </div>
                    </div>
                ) : (
                    <div className="text-gray-400 font-medium">Indisponível</div>
                )}

                {/* CTA */}
                <Link
                    href={`/produto/${currentId}`}
                    className="block w-full py-2.5 bg-gradient-to-r from-purple-600 to-purple-700 text-white text-center rounded-xl font-bold text-sm hover:from-purple-700 hover:to-purple-800 transition-all shadow-md hover:shadow-lg"
                >
                    Comparar Preços
                </Link>
            </div>
        </div>
    )
}
