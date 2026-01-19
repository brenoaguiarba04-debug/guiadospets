'use client'

import { useState } from 'react'

interface StarRatingProps {
    rating: number
    maxRating?: number
    size?: 'sm' | 'md' | 'lg'
    interactive?: boolean
    onChange?: (rating: number) => void
}

export default function StarRating({
    rating,
    maxRating = 5,
    size = 'md',
    interactive = false,
    onChange
}: StarRatingProps) {
    const [hoverRating, setHoverRating] = useState(0)

    const sizeClasses = {
        sm: 'text-lg',
        md: 'text-2xl',
        lg: 'text-4xl'
    }

    const displayRating = hoverRating || rating

    return (
        <div className="flex items-center gap-0.5">
            {Array.from({ length: maxRating }, (_, i) => {
                const starValue = i + 1
                const isFilled = starValue <= displayRating
                const isHalf = !isFilled && starValue - 0.5 <= displayRating

                return (
                    <button
                        key={i}
                        type="button"
                        disabled={!interactive}
                        className={`${sizeClasses[size]} transition-all ${interactive ? 'cursor-pointer hover:scale-110' : 'cursor-default'
                            }`}
                        onMouseEnter={() => interactive && setHoverRating(starValue)}
                        onMouseLeave={() => interactive && setHoverRating(0)}
                        onClick={() => interactive && onChange?.(starValue)}
                    >
                        {isFilled ? '⭐' : isHalf ? '⭐' : '☆'}
                    </button>
                )
            })}
        </div>
    )
}

// Componente de resumo de avaliações
interface ReviewSummaryProps {
    media: number
    total: number
    distribuicao?: Record<number, number> // { 5: 10, 4: 5, 3: 2, 2: 1, 1: 0 }
}

export function ReviewSummary({ media, total, distribuicao }: ReviewSummaryProps) {
    if (total === 0) {
        return (
            <div className="text-center py-6 text-gray-500">
                <div className="text-4xl mb-2">📝</div>
                <p>Nenhuma avaliação ainda. Seja o primeiro!</p>
            </div>
        )
    }

    return (
        <div className="flex items-start gap-6 p-4 bg-gray-50 rounded-xl">
            {/* Média Grande */}
            <div className="text-center">
                <div className="text-5xl font-extrabold text-gray-800">
                    {media.toFixed(1)}
                </div>
                <StarRating rating={media} size="sm" />
                <div className="text-sm text-gray-500 mt-1">
                    {total} avaliação{total !== 1 ? 'es' : ''}
                </div>
            </div>

            {/* Distribuição (barras) */}
            {distribuicao && (
                <div className="flex-1 space-y-1">
                    {[5, 4, 3, 2, 1].map(nota => {
                        const count = distribuicao[nota] || 0
                        const percentual = total > 0 ? (count / total) * 100 : 0

                        return (
                            <div key={nota} className="flex items-center gap-2 text-sm">
                                <span className="w-3 text-gray-600">{nota}</span>
                                <span className="text-yellow-500">⭐</span>
                                <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-yellow-400 rounded-full transition-all"
                                        style={{ width: `${percentual}%` }}
                                    />
                                </div>
                                <span className="w-8 text-right text-gray-500">{count}</span>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}

// Card de avaliação individual
interface ReviewCardProps {
    nome: string
    nota: number
    titulo?: string
    comentario?: string
    pros?: string[]
    contras?: string[]
    recomenda?: boolean
    criadoEm: string
}

export function ReviewCard({
    nome,
    nota,
    titulo,
    comentario,
    pros,
    contras,
    recomenda,
    criadoEm
}: ReviewCardProps) {
    const dataFormatada = new Date(criadoEm).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    })

    return (
        <div className="p-4 bg-white rounded-xl border border-gray-100 hover:shadow-md transition-all">
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
                <div>
                    <div className="font-bold text-gray-800">{nome}</div>
                    <div className="text-xs text-gray-500">{dataFormatada}</div>
                </div>
                <StarRating rating={nota} size="sm" />
            </div>

            {/* Título */}
            {titulo && (
                <h4 className="font-semibold text-gray-800 mb-2">{titulo}</h4>
            )}

            {/* Comentário */}
            {comentario && (
                <p className="text-gray-600 text-sm mb-3">{comentario}</p>
            )}

            {/* Pros e Contras */}
            <div className="flex gap-4 text-sm">
                {pros && pros.length > 0 && (
                    <div className="flex-1">
                        <div className="font-semibold text-green-600 mb-1">👍 Prós</div>
                        <ul className="space-y-0.5">
                            {pros.map((pro, i) => (
                                <li key={i} className="text-gray-600">• {pro}</li>
                            ))}
                        </ul>
                    </div>
                )}
                {contras && contras.length > 0 && (
                    <div className="flex-1">
                        <div className="font-semibold text-red-600 mb-1">👎 Contras</div>
                        <ul className="space-y-0.5">
                            {contras.map((contra, i) => (
                                <li key={i} className="text-gray-600">• {contra}</li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>

            {/* Recomenda */}
            {recomenda !== undefined && (
                <div className={`mt-3 text-sm font-semibold ${recomenda ? 'text-green-600' : 'text-red-600'}`}>
                    {recomenda ? '✅ Recomendo este produto' : '❌ Não recomendo'}
                </div>
            )}
        </div>
    )
}
