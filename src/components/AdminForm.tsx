'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminForm() {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setLoading(true)
        setMessage(null)

        const formData = new FormData(e.currentTarget)
        const data = {
            nome: formData.get('nome') as string,
            marca: formData.get('marca') as string,
            categoria: formData.get('categoria') as string,
            preco: parseFloat(formData.get('preco') as string),
            link_afiliado: formData.get('link_afiliado') as string,
            imagem_url: formData.get('imagem_url') as string,
            palavras_chave: formData.get('palavras_chave') as string,
        }

        try {
            const res = await fetch('/api/produtos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            })

            if (res.ok) {
                setMessage({ type: 'success', text: 'Produto cadastrado com sucesso!' })
                e.currentTarget.reset()
                router.refresh()
            } else {
                const error = await res.json()
                setMessage({ type: 'error', text: error.message || 'Erro ao cadastrar produto' })
            }
        } catch {
            setMessage({ type: 'error', text: 'Erro de conexão' })
        } finally {
            setLoading(false)
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            {message && (
                <div className={`p-3 rounded-lg text-sm font-medium ${message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                    {message.text}
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                    <label className="block text-sm font-bold text-gray-700 mb-1">
                        Nome do Produto (Com Peso)
                    </label>
                    <input
                        name="nome"
                        required
                        placeholder="Ex: Ração Golden Special 15kg"
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                    />
                </div>

                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">
                        Fabricante / Marca
                    </label>
                    <input
                        name="marca"
                        required
                        placeholder="Ex: Golden, Premier, Zoetis..."
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                    />
                </div>

                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">
                        Categoria
                    </label>
                    <select
                        name="categoria"
                        required
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                    >
                        <option value="">Selecione...</option>
                        <option value="Ração">Ração</option>
                        <option value="Antipulgas">Antipulgas / Farmácia</option>
                        <option value="Higiene">Higiene (Areia, Tapete)</option>
                        <option value="Brinquedos">Brinquedos</option>
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">
                        Preço (R$)
                    </label>
                    <input
                        name="preco"
                        type="number"
                        step="0.01"
                        required
                        placeholder="0.00"
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                    />
                </div>

                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">
                        Link de Compra (Afiliado)
                    </label>
                    <input
                        name="link_afiliado"
                        required
                        placeholder="https://amazon.com.br/..."
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                    />
                </div>

                <div className="md:col-span-2">
                    <label className="block text-sm font-bold text-gray-700 mb-1">
                        URL da Imagem
                    </label>
                    <input
                        name="imagem_url"
                        placeholder="https://..."
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                    />
                </div>

                <div className="md:col-span-2">
                    <label className="block text-sm font-bold text-gray-700 mb-1">
                        Palavras-chave (Opcional)
                    </label>
                    <input
                        name="palavras_chave"
                        placeholder="Ex: filhote, adulto, castrado"
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                    />
                </div>
            </div>

            <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-emerald-700 text-white font-bold rounded-lg hover:bg-emerald-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {loading ? '💾 Salvando...' : '💾 Salvar Produto'}
            </button>
        </form>
    )
}
