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
                loja: ['Amazon', 'Shopee', 'Mercado Livre'][Math.floor(Math.random() * 3)]
            })
        }
    }

    // Garante que o último ponto é o preço atual
    history[history.length - 1].price = precoAtual

    return history
}

export default function PriceHistory({ produtoId, precoAtual, loja }: PriceHistoryProps) {
    const [history, setHistory] = useState<PricePoint[]>([])
    const [isExpanded, setIsExpanded] = useState(true) // Começa expandido para mostrar o gráfico

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

    // Gerar pontos SVG para o gráfico de linha
    const chartWidth = 100
    const chartHeight = 80
    const padding = 10

    const points = history.map((point, index) => {
        const x = padding + (index / (history.length - 1)) * (chartWidth - 2 * padding)
        const y = chartHeight - padding - ((point.price - minPrice) / range) * (chartHeight - 2 * padding)
        return { x, y, ...point }
    })

    const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
    const areaPath = `${linePath} L ${points[points.length - 1].x} ${chartHeight - padding} L ${points[0].x} ${chartHeight - padding} Z`

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

                    {/* Gráfico SVG de Linha */}
                    <div className="bg-gradient-to-b from-gray-50 to-white rounded-xl p-4 border border-gray-100">
                        <svg viewBox={`0 0 ${chartWidth} ${chartHeight + 20}`} className="w-full h-40">
                            {/* Grid horizontal */}
                            <line x1={padding} y1={padding} x2={chartWidth - padding} y2={padding}
                                stroke="#e5e7eb" strokeWidth="0.5" strokeDasharray="2" />
                            <line x1={padding} y1={chartHeight / 2} x2={chartWidth - padding} y2={chartHeight / 2}
                                stroke="#e5e7eb" strokeWidth="0.5" strokeDasharray="2" />
                            <line x1={padding} y1={chartHeight - padding} x2={chartWidth - padding} y2={chartHeight - padding}
                                stroke="#e5e7eb" strokeWidth="0.5" />

                            {/* Área preenchida sob a linha */}
                            <defs>
                                <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                                    <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.3" />
                                    <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.05" />
                                </linearGradient>
                            </defs>
                            <path d={areaPath} fill="url(#areaGradient)" />

                            {/* Linha do gráfico */}
                            <path
                                d={linePath}
                                fill="none"
                                stroke="#8b5cf6"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />

                            {/* Pontos */}
                            {points.map((point, index) => {
                                const isMin = point.price === minPrice
                                const isMax = point.price === maxPrice
                                const isLast = index === points.length - 1

                                return (
                                    <g key={index}>
                                        <circle
                                            cx={point.x}
                                            cy={point.y}
                                            r={isMin || isMax || isLast ? 4 : 2.5}
                                            fill={isMin ? '#22c55e' : isMax ? '#ef4444' : isLast ? '#8b5cf6' : '#d1d5db'}
                                            stroke="white"
                                            strokeWidth="1.5"
                                        />
                                        {/* Tooltip no hover */}
                                        <title>{`${point.date}: R$ ${point.price.toFixed(2)}`}</title>
                                    </g>
                                )
                            })}

                            {/* Labels de data */}
                            {points.filter((_, i) => i % 2 === 0 || i === points.length - 1).map((point, index) => (
                                <text
                                    key={index}
                                    x={point.x}
                                    y={chartHeight + 12}
                                    textAnchor="middle"
                                    className="text-[6px] fill-gray-400"
                                    style={{ fontSize: '6px' }}
                                >
                                    {point.date.split(' ')[0]}
                                </text>
                            ))}
                        </svg>
                    </div>

                    {/* Legenda */}
                    <div className="flex items-center justify-center gap-4 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                            <span className="w-3 h-3 rounded-full bg-green-500"></span>
                            Menor preço
                        </span>
                        <span className="flex items-center gap-1">
                            <span className="w-3 h-3 rounded-full bg-purple-500"></span>
                            Preço atual
                        </span>
                        <span className="flex items-center gap-1">
                            <span className="w-3 h-3 rounded-full bg-red-500"></span>
                            Maior preço
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
