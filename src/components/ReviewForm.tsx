'use client'

import { useState } from 'react'
import StarRating from './StarRating'

interface ReviewFormProps {
    produtoId: number
    produtoNome: string
    onSuccess?: () => void
}

export default function ReviewForm({ produtoId, produtoNome, onSuccess }: ReviewFormProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [success, setSuccess] = useState(false)
    const [error, setError] = useState('')

    // Form state
    const [nome, setNome] = useState('')
    const [email, setEmail] = useState('')
    const [nota, setNota] = useState(0)
    const [titulo, setTitulo] = useState('')
    const [comentario, setComentario] = useState('')
    const [pros, setPros] = useState('')
    const [contras, setContras] = useState('')
    const [recomenda, setRecomenda] = useState<boolean | null>(null)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!nome.trim()) {
            setError('Por favor, informe seu nome')
            return
        }
        if (nota === 0) {
            setError('Por favor, dê uma nota de 1 a 5 estrelas')
            return
        }

        setIsSubmitting(true)
        setError('')

        try {
            const response = await fetch('/api/avaliacoes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    produto_id: produtoId,
                    usuario_nome: nome.trim(),
                    usuario_email: email.trim() || null,
                    nota,
                    titulo: titulo.trim() || null,
                    comentario: comentario.trim() || null,
                    pros: pros.split('\n').filter(p => p.trim()),
                    contras: contras.split('\n').filter(c => c.trim()),
                    recomenda: recomenda
                })
            })

            if (!response.ok) {
                throw new Error('Erro ao enviar avaliação')
            }

            setSuccess(true)
            onSuccess?.()

            // Reset form
            setTimeout(() => {
                setIsOpen(false)
                setSuccess(false)
                setNome('')
                setEmail('')
                setNota(0)
                setTitulo('')
                setComentario('')
                setPros('')
                setContras('')
                setRecomenda(null)
            }, 2000)

        } catch (err) {
            setError('Erro ao enviar avaliação. Tente novamente.')
        } finally {
            setIsSubmitting(false)
        }
    }

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="w-full py-3 px-6 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-bold hover:from-purple-700 hover:to-pink-700 transition-all shadow-lg hover:shadow-xl"
            >
                ⭐ Deixar Avaliação
            </button>
        )
    }

    if (success) {
        return (
            <div className="p-6 bg-green-50 rounded-xl text-center">
                <div className="text-4xl mb-2">🎉</div>
                <div className="text-green-800 font-bold">Avaliação enviada com sucesso!</div>
                <div className="text-green-600 text-sm">Obrigado por compartilhar sua opinião.</div>
            </div>
        )
    }

    return (
        <form onSubmit={handleSubmit} className="p-6 bg-gray-50 rounded-xl space-y-4">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-800">Avaliar {produtoNome}</h3>
                <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="text-gray-400 hover:text-gray-600"
                >
                    ✕
                </button>
            </div>

            {/* Nota */}
            <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Sua nota *
                </label>
                <StarRating
                    rating={nota}
                    size="lg"
                    interactive
                    onChange={setNota}
                />
            </div>

            {/* Nome e Email */}
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                        Seu nome *
                    </label>
                    <input
                        type="text"
                        value={nome}
                        onChange={(e) => setNome(e.target.value)}
                        placeholder="João Silva"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                </div>
                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                        Email (opcional)
                    </label>
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="joao@email.com"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                </div>
            </div>

            {/* Título */}
            <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Título da avaliação
                </label>
                <input
                    type="text"
                    value={titulo}
                    onChange={(e) => setTitulo(e.target.value)}
                    placeholder="Excelente produto!"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
            </div>

            {/* Comentário */}
            <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Sua opinião
                </label>
                <textarea
                    value={comentario}
                    onChange={(e) => setComentario(e.target.value)}
                    placeholder="Conte sua experiência com o produto..."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                />
            </div>

            {/* Pros e Contras */}
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-semibold text-green-700 mb-1">
                        👍 Pontos positivos
                    </label>
                    <textarea
                        value={pros}
                        onChange={(e) => setPros(e.target.value)}
                        placeholder="Um por linha..."
                        rows={2}
                        className="w-full px-3 py-2 border border-green-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none text-sm"
                    />
                </div>
                <div>
                    <label className="block text-sm font-semibold text-red-700 mb-1">
                        👎 Pontos negativos
                    </label>
                    <textarea
                        value={contras}
                        onChange={(e) => setContras(e.target.value)}
                        placeholder="Um por linha..."
                        rows={2}
                        className="w-full px-3 py-2 border border-red-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none text-sm"
                    />
                </div>
            </div>

            {/* Recomenda */}
            <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Você recomenda este produto?
                </label>
                <div className="flex gap-4">
                    <button
                        type="button"
                        onClick={() => setRecomenda(true)}
                        className={`flex-1 py-2 rounded-lg font-semibold transition-all ${recomenda === true
                                ? 'bg-green-500 text-white'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                    >
                        👍 Sim
                    </button>
                    <button
                        type="button"
                        onClick={() => setRecomenda(false)}
                        className={`flex-1 py-2 rounded-lg font-semibold transition-all ${recomenda === false
                                ? 'bg-red-500 text-white'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                    >
                        👎 Não
                    </button>
                </div>
            </div>

            {/* Erro */}
            {error && (
                <div className="p-3 bg-red-100 text-red-700 rounded-lg text-sm">
                    {error}
                </div>
            )}

            {/* Submit */}
            <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-bold hover:from-purple-700 hover:to-pink-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {isSubmitting ? 'Enviando...' : 'Enviar Avaliação'}
            </button>
        </form>
    )
}
