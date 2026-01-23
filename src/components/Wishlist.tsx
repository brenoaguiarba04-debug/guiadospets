'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'

interface WishlistItem {
    id: number
    nome: string
    imagem_url: string | null
    preco: number
}

export default function Wishlist() {
    const [items, setItems] = useState<WishlistItem[]>([])
    const [isOpen, setIsOpen] = useState(false)
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        // eslint-disable-next-line react-hooks/exhaustive-deps
        setMounted(true)
        // Carrega do localStorage
        const saved = localStorage.getItem('guiadopet_wishlist')
        if (saved) {
            try {
                setItems(JSON.parse(saved) as WishlistItem[])
            } catch {
                setItems([])
            }
        }

        // Listener para atualizações
        const handleUpdate = () => {
            const saved = localStorage.getItem('guiadopet_wishlist')
            if (saved) {
                setItems(JSON.parse(saved) as WishlistItem[])
            } else {
                setItems([])
            }
        }
        window.addEventListener('wishlist-updated', handleUpdate)
        return () => window.removeEventListener('wishlist-updated', handleUpdate)
    }, [])

    function removeItem(id: number) {
        const updated = items.filter(item => item.id !== id)
        setItems(updated)
        localStorage.setItem('guiadopet_wishlist', JSON.stringify(updated))
    }

    // Não renderiza no servidor para evitar hydration mismatch
    if (!mounted) return null

    return (
        <>
            {/* Botão flutuante */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-purple-600 text-white rounded-full shadow-lg hover:bg-purple-700 transition-all hover:scale-110 flex items-center justify-center"
            >
                <span className="text-2xl">❤️</span>
                {items.length > 0 && (
                    <span className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                        {items.length}
                    </span>
                )}
            </button>

            {/* Painel lateral */}
            {isOpen && (
                <>
                    {/* Overlay */}
                    <div
                        className="fixed inset-0 bg-black/50 z-40"
                        onClick={() => setIsOpen(false)}
                    />

                    {/* Painel */}
                    <div className="fixed right-0 top-0 h-full w-80 bg-white shadow-2xl z-50 flex flex-col">
                        <div className="p-4 border-b bg-purple-50">
                            <div className="flex items-center justify-between">
                                <h3 className="font-bold text-purple-800 text-lg">
                                    ❤️ Minha Lista ({items.length})
                                </h3>
                                <button
                                    onClick={() => setIsOpen(false)}
                                    className="text-gray-400 hover:text-gray-600 text-2xl"
                                >
                                    ×
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4">
                            {items.length === 0 ? (
                                <div className="text-center py-12 text-gray-500">
                                    <div className="text-4xl mb-3">💜</div>
                                    <p>Sua lista está vazia</p>
                                    <p className="text-sm mt-1">Adicione produtos para comparar depois</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {items.map(item => (
                                        <div key={item.id} className="flex gap-3 p-3 bg-gray-50 rounded-lg">
                                            <div className="relative w-16 h-16 flex-shrink-0">
                                                <Image
                                                    src={item.imagem_url || 'https://via.placeholder.com/64'}
                                                    alt={item.nome}
                                                    fill
                                                    className="object-contain rounded"
                                                />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <Link
                                                    href={`/produto/${item.id}`}
                                                    className="text-sm font-medium text-gray-800 hover:text-purple-600 line-clamp-2"
                                                    onClick={() => setIsOpen(false)}
                                                >
                                                    {item.nome}
                                                </Link>
                                                <div className="text-green-600 font-bold text-sm mt-1">
                                                    R$ {item.preco.toFixed(2).replace('.', ',')}
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => removeItem(item.id)}
                                                className="text-gray-400 hover:text-red-500"
                                            >
                                                🗑️
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {items.length > 0 && (
                            <div className="p-4 border-t bg-gray-50">
                                <button
                                    onClick={() => {
                                        setItems([])
                                        localStorage.removeItem('guiadopet_wishlist')
                                    }}
                                    className="w-full py-2 text-red-500 text-sm font-medium hover:bg-red-50 rounded"
                                >
                                    Limpar Lista
                                </button>
                            </div>
                        )}
                    </div>
                </>
            )}
        </>
    )
}

// Hook para adicionar à lista
export function useWishlist() {
    const addToWishlist = (item: WishlistItem) => {
        const saved = localStorage.getItem('guiadopet_wishlist')
        const items: WishlistItem[] = saved ? JSON.parse(saved) : []

        // Verifica se já existe
        if (items.some(i => i.id === item.id)) {
            return false
        }

        items.push(item)
        localStorage.setItem('guiadopet_wishlist', JSON.stringify(items))
        window.dispatchEvent(new Event('wishlist-updated'))
        return true
    }

    const isInWishlist = (id: number) => {
        const saved = localStorage.getItem('guiadopet_wishlist')
        if (!saved) return false
        const items: WishlistItem[] = JSON.parse(saved)
        return items.some(i => i.id === id)
    }

    const removeFromWishlist = (id: number) => {
        const saved = localStorage.getItem('guiadopet_wishlist')
        if (!saved) return
        const items: WishlistItem[] = JSON.parse(saved)
        const updated = items.filter(i => i.id !== id)
        localStorage.setItem('guiadopet_wishlist', JSON.stringify(updated))
        window.dispatchEvent(new Event('wishlist-updated'))
    }

    return { addToWishlist, isInWishlist, removeFromWishlist }
}
