'use client'

import { useState } from 'react'

interface PriceAlertProps {
    produtoId: number
    produtoNome: string
    precoAtual: number
}

export default function PriceAlert({ produtoId, produtoNome, precoAtual }: PriceAlertProps) {
    const [email, setEmail] = useState('')
    const [precoAlvo, setPrecoAlvo] = useState(Math.floor(precoAtual * 0.9)) // 10% abaixo
    const [loading, setLoading] = useState(false)
    const [success, setSuccess] = useState(false)
    const [error, setError] = useState('')

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setLoading(true)
        setError('')

        try {
            const res = await fetch('/api/alertas', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email,
                    produto_id: produtoId,
                    preco_alvo: precoAlvo
                })
            })

            if (res.ok) {
                setSuccess(true)
                setEmail('')
            } else {
                const data = await res.json()
                setError(data.message || 'Erro ao criar alerta')
            }
        } catch {
            setError('Erro de conexão')
        } finally {
            setLoading(false)
        }
    }

    if (success) {
        return (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
                <div className="text-2xl mb-2">🔔</div>
                <p className="text-green-700 font-bold">Alerta criado com sucesso!</p>
                <p className="text-green-600 text-sm mt-1">
                    Você receberá um email quando o preço baixar para R$ {precoAlvo.toFixed(2).replace('.', ',')}
                </p>
                <button
                    onClick={() => setSuccess(false)}
                    className="mt-3 text-green-600 underline text-sm"
                >
                    Criar outro alerta
                </button>
            </div>
        )
    }

    return (
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
            <h4 className="font-bold text-purple-800 mb-3 flex items-center gap-2">
                🔔 Alerta de Preço
            </h4>
            <p className="text-purple-600 text-sm mb-4">
                Receba um email quando o preço de <strong>{produtoNome.slice(0, 30)}...</strong> baixar!
            </p>

            <form onSubmit={handleSubmit} className="space-y-3">
                {error && (
                    <div className="bg-red-100 text-red-700 p-2 rounded text-sm">
                        {error}
                    </div>
                )}

                <div>
                    <label className="block text-xs font-bold text-purple-700 mb-1">
                        Seu Email
                    </label>
                    <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="seuemail@exemplo.com"
                        className="w-full px-3 py-2 border border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none text-sm"
                    />
                </div>

                <div>
                    <label className="block text-xs font-bold text-purple-700 mb-1">
                        Me avise quando chegar a:
                    </label>
                    <div className="flex items-center gap-2">
                        <span className="text-purple-600 font-bold">R$</span>
                        <input
                            type="number"
                            required
                            min="1"
                            step="0.01"
                            value={precoAlvo}
                            onChange={(e) => setPrecoAlvo(Number(e.target.value))}
                            className="flex-1 px-3 py-2 border border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none text-sm"
                        />
                    </div>
                    <p className="text-xs text-purple-500 mt-1">
                        Preço atual: R$ {precoAtual.toFixed(2).replace('.', ',')}
                    </p>
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 bg-purple-600 text-white font-bold rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
                >
                    {loading ? '⏳ Criando...' : '🔔 Criar Alerta'}
                </button>
            </form>
        </div>
    )
}
