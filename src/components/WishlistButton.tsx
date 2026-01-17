'use client'

import { useState } from 'react'
import { useWishlist } from './Wishlist'

interface WishlistButtonProps {
    produto: {
        id: number
        nome: string
        imagem_url: string | null
        preco: number
    }
}

export default function WishlistButton({ produto }: WishlistButtonProps) {
    const { addToWishlist, isInWishlist, removeFromWishlist } = useWishlist()
    const [isAdded, setIsAdded] = useState(isInWishlist(produto.id))

    function handleClick() {
        if (isAdded) {
            removeFromWishlist(produto.id)
            setIsAdded(false)
        } else {
            addToWishlist(produto)
            setIsAdded(true)
        }
    }

    return (
        <button
            onClick={handleClick}
            className={`p-2 rounded-full transition-all ${isAdded
                    ? 'bg-red-100 text-red-500 hover:bg-red-200'
                    : 'bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-red-400'
                }`}
            title={isAdded ? 'Remover da lista' : 'Adicionar à lista'}
        >
            {isAdded ? '❤️' : '🤍'}
        </button>
    )
}
