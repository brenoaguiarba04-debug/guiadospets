'use client'

import { useState, useEffect } from 'react'
import SavingsBadge from './SavingsBadge'
import ReviewForm from './ReviewForm'
import StarRating, { ReviewSummary, ReviewCard } from './StarRating'
import PriceHistory from './PriceHistory'
import PriceAlert from './PriceAlert'

interface Preco {
    id: number
    loja: string
    preco: number
    link_afiliado: string | null
}

interface Avaliacao {
    id: number
    usuario_nome: string
    nota: number
    titulo: string | null
    comentario: string | null
    pros: string[] | null
    contras: string[] | null
    recomenda: boolean | null
    criado_em: string
}

interface ProductPageClientProps {
    produtoId: number
    produtoNome: string
    precos: Preco[]
}

export default function ProductPageClient({ produtoId, produtoNome, precos }: ProductPageClientProps) {
    const [avaliacoes, setAvaliacoes] = useState<Avaliacao[]>([])
    const [estatisticas, setEstatisticas] = useState<{
        media: number
        total: number
        distribuicao: Record<number, number>
    }>({ media: 0, total: 0, distribuicao: {} })
    const [loadingReviews, setLoadingReviews] = useState(true)

    // Calcular economia
    const precosValidos = precos.filter(p => p.preco > 0)
    const menorPreco = Math.min(...precosValidos.map(p => p.preco))
    const maiorPreco = Math.max(...precosValidos.map(p => p.preco))
    const mediaPreco = precosValidos.length > 0
        ? precosValidos.reduce((sum, p) => sum + p.preco, 0) / precosValidos.length
        : 0

    // Buscar avaliações
    const fetchAvaliacoes = async () => {
        try {
            const res = await fetch(`/api/avaliacoes?produto_id=${produtoId}`)
            if (res.ok) {
                const data = await res.json()
                setAvaliacoes(data.avaliacoes || [])
                setEstatisticas(data.estatisticas || { media: 0, total: 0, distribuicao: {} })
            }
        } catch (err) {
            console.error('Erro ao buscar avaliações:', err)
        } finally {
            setLoadingReviews(false)
        }
    }

    useEffect(() => {
        fetchAvaliacoes()
    }, [produtoId])

    return (
        <div className="space-y-8">
            {/* Badge de Economia */}
            {precosValidos.length >= 2 && (
                <SavingsBadge
                    menorPreco={menorPreco}
                    maiorPreco={maiorPreco}
                    mediaPreco={mediaPreco}
                />
            )}

            {/* Histórico de Preços */}
            {menorPreco > 0 && (
                <PriceHistory
                    produtoId={produtoId}
                    precoAtual={menorPreco}
                    loja={precos[0]?.loja || ''}
                />
            )}

            {/* Alerta de Preço */}
            {menorPreco > 0 && (
                <PriceAlert
                    produtoId={produtoId}
                    produtoNome={produtoNome}
                    precoAtual={menorPreco}
                />
            )}

            {/* Seção de Avaliações */}
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                <div className="p-6 bg-gradient-to-r from-yellow-400 to-orange-500">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        ⭐ Avaliações dos Clientes
                    </h2>
                </div>

                <div className="p-6 space-y-6">
                    {/* Resumo */}
                    {!loadingReviews && (
                        <ReviewSummary
                            media={estatisticas.media}
                            total={estatisticas.total}
                            distribuicao={estatisticas.distribuicao}
                        />
                    )}

                    {/* Formulário */}
                    <ReviewForm
                        produtoId={produtoId}
                        produtoNome={produtoNome}
                        onSuccess={fetchAvaliacoes}
                    />

                    {/* Lista de Avaliações */}
                    {avaliacoes.length > 0 && (
                        <div className="space-y-4">
                            <h3 className="font-bold text-gray-800">
                                Todas as avaliações ({avaliacoes.length})
                            </h3>
                            {avaliacoes.map((av) => (
                                <ReviewCard
                                    key={av.id}
                                    nome={av.usuario_nome}
                                    nota={av.nota}
                                    titulo={av.titulo || undefined}
                                    comentario={av.comentario || undefined}
                                    pros={av.pros || undefined}
                                    contras={av.contras || undefined}
                                    recomenda={av.recomenda ?? undefined}
                                    criadoEm={av.criado_em}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
