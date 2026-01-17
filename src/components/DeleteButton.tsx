'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface DeleteButtonProps {
    productId: number
}

export default function DeleteButton({ productId }: DeleteButtonProps) {
    const router = useRouter()
    const [loading, setLoading] = useState(false)

    async function handleDelete() {
        if (!confirm('Tem certeza que deseja excluir este produto?')) {
            return
        }

        setLoading(true)

        try {
            const res = await fetch(`/api/produtos?id=${productId}`, {
                method: 'DELETE'
            })

            if (res.ok) {
                router.refresh()
            } else {
                alert('Erro ao excluir produto')
            }
        } catch {
            alert('Erro de conexão')
        } finally {
            setLoading(false)
        }
    }

    return (
        <button
            onClick={handleDelete}
            disabled={loading}
            className="px-3 py-1.5 bg-red-500 text-white text-xs font-bold rounded hover:bg-red-600 transition-colors disabled:opacity-50"
        >
            {loading ? '...' : 'Excluir'}
        </button>
    )
}
