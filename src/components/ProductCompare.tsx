'use client'

import { useState } from 'react'
import Image from 'next/image'

interface ProdutoComparavel {
    id: number
    nome: string
    imagem: string
    precos: {
        loja: string
        preco: number
    }[]
    precoPorKg?: number | null
    pesoKg?: number | null
}

interface ProductCompareProps {
    produtos: ProdutoComparavel[]
    onRemove: (id: number) => void
    onClear: () => void
}

export default function ProductCompare({ produtos, onRemove, onClear }: ProductCompareProps) {
    const [isExpanded, setIsExpanded] = useState(true)

    if (produtos.length === 0) return null

    const getMenorPreco = (p: ProdutoComparavel) => {
        if (!p.precos || p.precos.length === 0) return 0
        return Math.min(...p.precos.map(pr => pr.preco).filter(pr => pr > 0))
    }

    const getMelhorLoja = (p: ProdutoComparavel) => {
        const menor = getMenorPreco(p)
        return p.precos.find(pr => pr.preco === menor)?.loja || ''
    }

    // Determinar o vencedor (menor preço por kg se disponível, senão menor preço absoluto)
    const getScore = (p: ProdutoComparavel) => {
        if (p.precoPorKg && p.precoPorKg > 0) return p.precoPorKg
        return getMenorPreco(p)
    }

    const scores = produtos.map(p => ({ id: p.id, score: getScore(p) }))
    const menorScore = Math.min(...scores.filter(s => s.score > 0).map(s => s.score))
    const vencedorId = scores.find(s => s.score === menorScore)?.id

    return (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-white shadow-2xl border-t-4 border-purple-500 transition-all">
            {/* Header */}
            <div
                className="flex items-center justify-between px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white cursor-pointer"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex items-center gap-3">
                    <span className="text-2xl">⚔️</span>
                    <span className="font-bold">Comparador ({produtos.length}/3)</span>
                </div>
                <div className="flex items-center gap-4">
                    <button
                        onClick={(e) => { e.stopPropagation(); onClear(); }}
                        className="text-sm bg-white/20 px-3 py-1 rounded-full hover:bg-white/30 transition-all"
                    >
                        Limpar
                    </button>
                    <span className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`}>▲</span>
                </div>
            </div>

            {/* Conteúdo */}
            {isExpanded && (
                <div className="p-4 overflow-x-auto">
                    <div className="flex gap-4 min-w-max">
                        {produtos.map((produto) => {
                            const menorPreco = getMenorPreco(produto)
                            const melhorLoja = getMelhorLoja(produto)
                            const isVencedor = produto.id === vencedorId

                            return (
                                <div
                                    key={produto.id}
                                    className={`relative flex-shrink-0 w-64 p-4 rounded-xl border-2 transition-all ${isVencedor
                                            ? 'border-green-500 bg-green-50 shadow-lg'
                                            : 'border-gray-200 bg-white'
                                        }`}
                                >
                                    {/* Badge Vencedor */}
                                    {isVencedor && (
                                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-green-500 text-white text-xs font-bold rounded-full">
                                            🏆 MELHOR CUSTO-BENEFÍCIO
                                        </div>
                                    )}

                                    {/* Botão Remover */}
                                    <button
                                        onClick={() => onRemove(produto.id)}
                                        className="absolute top-2 right-2 w-6 h-6 bg-red-100 text-red-500 rounded-full flex items-center justify-center hover:bg-red-200 transition-all text-sm font-bold"
                                    >
                                        ×
                                    </button>

                                    {/* Imagem */}
                                    <div className="relative w-full h-32 mb-3">
                                        <Image
                                            src={produto.imagem || '/placeholder.png'}
                                            alt={produto.nome}
                                            fill
                                            className="object-contain"
                                        />
                                    </div>

                                    {/* Nome */}
                                    <h4 className="font-bold text-sm text-gray-800 line-clamp-2 mb-2">
                                        {produto.nome}
                                    </h4>

                                    {/* Preço */}
                                    <div className={`text-xl font-extrabold ${isVencedor ? 'text-green-600' : 'text-gray-800'}`}>
                                        R$ {menorPreco.toFixed(2).replace('.', ',')}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                        em {melhorLoja}
                                    </div>

                                    {/* Preço por Kg */}
                                    {produto.precoPorKg && (
                                        <div className="mt-2 text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full inline-block">
                                            ⚖️ R$ {produto.precoPorKg.toFixed(2).replace('.', ',')}/kg
                                        </div>
                                    )}
                                </div>
                            )
                        })}

                        {/* Placeholder para adicionar mais */}
                        {produtos.length < 3 && (
                            <div className="flex-shrink-0 w-64 p-4 rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 flex flex-col items-center justify-center text-gray-400">
                                <span className="text-4xl mb-2">+</span>
                                <span className="text-sm text-center">
                                    Adicione mais {3 - produtos.length} produto{produtos.length < 2 ? 's' : ''} para comparar
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
