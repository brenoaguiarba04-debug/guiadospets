'use client'

import { trackAffiliateClick } from './GoogleAnalytics'

interface AffiliateButtonProps {
    href: string
    loja: string
    produtoNome: string
    preco: number
    isWinner?: boolean
    disabled?: boolean
}

export default function AffiliateButton({
    href,
    loja,
    produtoNome,
    preco,
    isWinner = false,
    disabled = false
}: AffiliateButtonProps) {

    const handleClick = () => {
        // Rastreia o clique antes de redirecionar
        trackAffiliateClick(loja, produtoNome, preco)
    }

    if (disabled) {
        return (
            <button
                disabled
                className="px-6 py-3 rounded-full font-bold text-base bg-gray-200 text-gray-400 cursor-not-allowed"
                title="Link indisponível no momento"
            >
                Indisponível
            </button>
        )
    }

    return (
        <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleClick}
            className={`px-6 py-3 rounded-full font-bold text-base transition-all ${isWinner
                ? 'bg-green-500 text-white hover:bg-green-600 shadow-lg shadow-green-200 animate-pulse'
                : 'border-2 border-purple-600 text-purple-600 hover:bg-purple-600 hover:text-white'
                }`}
        >
            🛒 Comprar Agora
        </a>
    )
}
