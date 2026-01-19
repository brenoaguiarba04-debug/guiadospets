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
    precoPorKg?: number | null
    pesoKg?: number | null
}

export default function ProductCard({
    nomePrincipal,
    imagemCapa,
    menorPrecoCapa,
    variacoes,
    precoPorKg,
    pesoKg
}: ProductCardProps) {
    const [activeIndex, setActiveIndex] = useState(0)
    const activeVar = variacoes[activeIndex] || variacoes[0]

    const currentImage = activeVar?.imagem || imagemCapa
    const currentPrice = activeVar?.preco || menorPrecoCapa
    const currentLoja = activeVar?.loja || ''
    const currentId = activeVar?.id || 0

    const storeBadge = getStoreBadge(currentLoja)

    return (
        <div className="bg-white rounded-xl border border-gray-100 hover:border-[#522166] transition-all duration-300 overflow-hidden group flex flex-col h-full hover:shadow-lg">
            {/* Image */}
            {/* Image */}
            <div className="relative aspect-square bg-white p-6">
                {/* Discount Badge */}
                <div className="absolute top-2 left-2 bg-[#ffd000] text-[#522166] text-[10px] font-black px-2 py-1 rounded shadow-sm z-10 uppercase tracking-wide">
                    Melhor Preço
                </div>

                {/* Floating Action Button */}
                <button className="absolute bottom-2 right-2 w-8 h-8 bg-[#522166] text-white rounded-full shadow-md flex items-center justify-center hover:bg-purple-700 transition-all z-10 translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 duration-300">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                </button>

                <Image
                    src={currentImage || '/placeholder.png'}
                    alt={nomePrincipal}
                    fill
                    className="object-contain p-2 group-hover:scale-105 transition-transform duration-300"
                    onError={(e) => {
                        const target = e.target as HTMLImageElement
                        target.src = 'https://via.placeholder.com/200?text=Sem+Imagem'
                    }}
                />
            </div>

            {/* Info */}
            <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                <div className="space-y-2">
                    <h3 className="font-semibold text-gray-700 text-sm line-clamp-3 min-h-[4rem]">
                        {nomePrincipal}
                    </h3>

                    {/* Variações */}
                    {variacoes.length > 1 && (
                        <div className="flex flex-wrap gap-1.5">
                            {variacoes.map((v, idx) => (
                                <button
                                    key={v.id}
                                    onClick={() => setActiveIndex(idx)}
                                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider transition-all border ${idx === activeIndex
                                        ? 'bg-[#522166] text-white border-[#522166]'
                                        : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'
                                        }`}
                                >
                                    {v.label}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <div className="space-y-4 pt-2">
                    {/* Preço */}
                    {currentPrice > 0 ? (
                        <div className="">
                            <div className="flex items-center gap-1.5 mb-1">
                                <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wide ${storeBadge.className}`}>
                                    {currentLoja || 'Loja'}
                                </span>
                            </div>
                            <div className="text-xl font-bold text-[#333333]">
                                R$ {currentPrice.toFixed(2).replace('.', ',')}
                            </div>
                            {precoPorKg && pesoKg && (
                                <div className="text-[10px] text-gray-400 font-medium">
                                    R$ {precoPorKg.toFixed(2).replace('.', ',')}/kg
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="text-gray-400 font-medium text-sm">Indisponível</div>
                    )}

                    {/* CTA */}
                    <Link
                        href={`/produto/${currentId}`}
                        className="block w-full py-3 bg-white border-2 border-[#522166] text-[#522166] group-hover:bg-[#522166] group-hover:text-white text-center rounded-lg font-bold text-sm transition-all uppercase tracking-wide"
                    >
                        Comparar
                    </Link>
                </div>
            </div>
        </div>
    )
}
