'use client'

import { useState, useEffect } from 'react'

interface PricePoint {
    date: string
    price: number
    loja: string
}

interface PriceHistoryProps {
    produtoId: number
    precoAtual: number
    loja: string
}

// Gera dados simulados de histórico (em produção, viria do banco)
function generateMockHistory(precoAtual: number): PricePoint[] {
    const history: PricePoint[] = []
    const today = new Date()

    for (let i = 30; i >= 0; i--) {
        const date = new Date(today)
        date.setDate(date.getDate() - i)

        // Variação de 5-15% do preço atual
        const variacao = 0.85 + Math.random() * 0.20
        const preco = precoAtual * variacao

        // Só adiciona alguns pontos (não todos os 30 dias)
        if (i % 3 === 0 || i === 0) {
            history.push({
                date: date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }),
                price: Math.round(preco * 100) / 100,
                loja: ['Petz', 'Petlove', 'Amazon', 'Cobasi'][Math.floor(Math.random() * 4)]
            })
        }
    }

    // Garante que o último ponto é o preço atual
    history[history.length - 1].price = precoAtual

    return history
}

export default function PriceHistory({ produtoId, precoAtual, loja }: PriceHistoryProps) {
    const [history, setHistory] = useState<PricePoint[]>([])
    const [isExpanded, setIsExpanded] = useState(false)

    useEffect(() => {
        // Em produção, buscar do banco de dados
        const mockHistory = generateMockHistory(precoAtual)
        setHistory(mockHistory)
    }, [produtoId, precoAtual])

    if (history.length < 2) return null

    const minPrice = Math.min(...history.map(h => h.price))
    const maxPrice = Math.max(...history.map(h => h.price))
    const range = maxPrice - minPrice || 1

    // Calcular se está no menor preço histórico
    const isLowestPrice = precoAtual <= minPrice * 1.02 // 2% de margem
    const percentFromLowest = ((precoAtual - minPrice) / minPrice * 100).toFixed(0)

    return (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {/* Header */}
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full px-4 py-3 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors"
            >
                <div className="flex items-center gap-2">
                    <span className="text-xl">📈</span>
                    <span className="font-bold text-gray-800">Histórico de Preços</span>
                    {isLowestPrice && (
                        <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-bold rounded-full">
                            🔥 Menor preço!
                        </span>
                    )}
                </div>
                <span className={`transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                    ▼
                </span>
            </button>

            {/* Conteúdo Expandido */}
            {isExpanded && (
                <div className="p-4 space-y-4">
                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-4 text-center">
                        <div className="bg-gray-50 rounded-lg p-3">
                            <div className="text-xs text-gray-500 uppercase tracking-wide">Menor</div>
                            <div className="text-lg font-bold text-green-600">
                                R$ {minPrice.toFixed(2).replace('.', ',')}
                            </div>
                        </div>
                        <div className="bg-purple-50 rounded-lg p-3 border-2 border-purple-200">
                            <div className="text-xs text-purple-600 uppercase tracking-wide">Atual</div>
                            <div className="text-lg font-bold text-purple-700">
                                R$ {precoAtual.toFixed(2).replace('.', ',')}
                            </div>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-3">
                            <div className="text-xs text-gray-500 uppercase tracking-wide">Maior</div>
                            <div className="text-lg font-bold text-red-500">
                                R$ {maxPrice.toFixed(2).replace('.', ',')}
                            </div>
                        </div>
                    </div>

                    {/* Gráfico Simples (barras) */}
                    <div className="h-32 flex items-end gap-1 bg-gray-50 rounded-lg p-3">
                        {history.map((point, index) => {
                            const height = ((point.price - minPrice) / range * 80) + 20 // Min 20%, max 100%
                            const isLast = index === history.length - 1

                            return (
                                <div
                                    key={index}
                                    className="flex-1 flex flex-col items-center gap-1"
                                    title={`${point.date}: R$ ${point.price.toFixed(2)}`}
                                >
                                    <div
                                        className={`w-full rounded-t transition-all ${isLast
                                                ? 'bg-purple-500'
                                                : point.price === minPrice
                                                    ? 'bg-green-400'
                                                    : 'bg-gray-300'
                                            }`}
                                        style={{ height: `${height}%` }}
                                    />
                                    <span className="text-[8px] text-gray-400 truncate w-full text-center">
                                        {point.date.split(' ')[0]}
                                    </span>
                                </div>
                            )
                        })}
                    </div>

                    {/* Legenda */}
                    <div className="flex items-center justify-center gap-4 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                            <span className="w-3 h-3 rounded bg-green-400"></span>
                            Menor preço
                        </span>
                        <span className="flex items-center gap-1">
                            <span className="w-3 h-3 rounded bg-purple-500"></span>
                            Preço atual
                        </span>
                    </div>

                    {/* Dica */}
                    {!isLowestPrice && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
                            💡 O preço atual está <strong>{percentFromLowest}%</strong> acima do menor preço histórico.
                            Crie um alerta para ser avisado quando baixar!
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
