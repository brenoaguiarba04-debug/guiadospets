'use client'

interface SavingsBadgeProps {
    menorPreco: number
    maiorPreco: number
    mediaPreco?: number
}

/**
 * Badge que mostra quanto o usuário economiza comprando pelo menor preço
 */
export default function SavingsBadge({ menorPreco, maiorPreco, mediaPreco }: SavingsBadgeProps) {
    if (menorPreco <= 0 || maiorPreco <= menorPreco) return null

    const economiaMaxima = maiorPreco - menorPreco
    const percentualEconomia = ((economiaMaxima / maiorPreco) * 100).toFixed(0)

    // Se temos média, mostramos economia vs média também
    const economiaVsMedia = mediaPreco ? mediaPreco - menorPreco : null

    // Só mostra se economia for significativa (> R$ 5 ou > 5%)
    if (economiaMaxima < 5 && parseInt(percentualEconomia) < 5) return null

    return (
        <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl p-4 text-white space-y-2">
            <div className="flex items-center gap-2">
                <span className="text-2xl">💰</span>
                <span className="font-bold text-lg">Você economiza!</span>
            </div>

            <div className="flex items-center justify-between">
                <div>
                    <div className="text-3xl font-extrabold">
                        R$ {economiaMaxima.toFixed(2).replace('.', ',')}
                    </div>
                    <div className="text-sm opacity-90">
                        vs o preço mais caro ({percentualEconomia}% off)
                    </div>
                </div>

                {economiaVsMedia && economiaVsMedia > 0 && (
                    <div className="text-right">
                        <div className="text-xl font-bold">
                            R$ {economiaVsMedia.toFixed(2).replace('.', ',')}
                        </div>
                        <div className="text-xs opacity-90">
                            abaixo da média
                        </div>
                    </div>
                )}
            </div>

            <div className="text-xs opacity-80 pt-1 border-t border-white/20">
                Comparando {maiorPreco > menorPreco ? 'todas as lojas' : '2 lojas'} para você
            </div>
        </div>
    )
}
