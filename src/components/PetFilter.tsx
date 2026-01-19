'use client'

import { useState } from 'react'
import type { TipoPet, FasePet, PortePet, FiltroPet } from '@/lib/pet-utils'

interface PetFilterProps {
    onFilterChange: (filtro: FiltroPet | null) => void
}

export default function PetFilter({ onFilterChange }: PetFilterProps) {
    const [tipo, setTipo] = useState<TipoPet | ''>('')
    const [fase, setFase] = useState<FasePet | ''>('')
    const [porte, setPorte] = useState<PortePet | ''>('')
    const [isOpen, setIsOpen] = useState(false)

    const handleApplyFilter = () => {
        if (tipo && fase) {
            onFilterChange({
                tipo,
                fase,
                porte: tipo === 'cão' && porte ? porte : undefined
            })
        }
    }

    const handleClearFilter = () => {
        setTipo('')
        setFase('')
        setPorte('')
        onFilterChange(null)
    }

    const hasFilter = tipo && fase

    return (
        <div className="bg-white rounded-2xl shadow-lg border border-purple-100 overflow-hidden">
            {/* Header - Sempre visível */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full p-4 flex items-center justify-between bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600 transition-all"
            >
                <div className="flex items-center gap-3">
                    <span className="text-2xl">🐾</span>
                    <div className="text-left">
                        <div className="font-bold">Encontre o ideal para seu pet</div>
                        <div className="text-sm opacity-90">
                            {hasFilter
                                ? `${tipo === 'cão' ? '🐕' : '🐈'} ${fase}${porte ? ` • ${porte}` : ''}`
                                : 'Filtre por tipo, idade e porte'}
                        </div>
                    </div>
                </div>
                <span className={`text-xl transition-transform ${isOpen ? 'rotate-180' : ''}`}>
                    ▼
                </span>
            </button>

            {/* Filtros - Expansível */}
            {isOpen && (
                <div className="p-6 space-y-6 bg-purple-50/50">
                    {/* Tipo de Pet */}
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-3">
                            Qual é seu pet?
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={() => setTipo('cão')}
                                className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${tipo === 'cão'
                                        ? 'border-purple-500 bg-purple-100 shadow-md'
                                        : 'border-gray-200 bg-white hover:border-purple-300'
                                    }`}
                            >
                                <span className="text-4xl">🐕</span>
                                <span className="font-semibold">Cachorro</span>
                            </button>
                            <button
                                onClick={() => setTipo('gato')}
                                className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${tipo === 'gato'
                                        ? 'border-purple-500 bg-purple-100 shadow-md'
                                        : 'border-gray-200 bg-white hover:border-purple-300'
                                    }`}
                            >
                                <span className="text-4xl">🐈</span>
                                <span className="font-semibold">Gato</span>
                            </button>
                        </div>
                    </div>

                    {/* Fase da Vida */}
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-3">
                            Fase da vida
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                            {[
                                { value: 'filhote', label: 'Filhote', emoji: '🍼', desc: '0-1 ano' },
                                { value: 'adulto', label: 'Adulto', emoji: '💪', desc: '1-7 anos' },
                                { value: 'idoso', label: 'Idoso', emoji: '👴', desc: '7+ anos' }
                            ].map((item) => (
                                <button
                                    key={item.value}
                                    onClick={() => setFase(item.value as FasePet)}
                                    className={`p-3 rounded-xl border-2 transition-all flex flex-col items-center gap-1 ${fase === item.value
                                            ? 'border-purple-500 bg-purple-100 shadow-md'
                                            : 'border-gray-200 bg-white hover:border-purple-300'
                                        }`}
                                >
                                    <span className="text-2xl">{item.emoji}</span>
                                    <span className="font-semibold text-sm">{item.label}</span>
                                    <span className="text-xs text-gray-500">{item.desc}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Porte (só para cães) */}
                    {tipo === 'cão' && (
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-3">
                                Porte do cachorro
                            </label>
                            <div className="grid grid-cols-4 gap-2">
                                {[
                                    { value: 'pequeno', label: 'Pequeno', desc: 'até 10kg' },
                                    { value: 'médio', label: 'Médio', desc: '10-25kg' },
                                    { value: 'grande', label: 'Grande', desc: '25-45kg' },
                                    { value: 'gigante', label: 'Gigante', desc: '45kg+' }
                                ].map((item) => (
                                    <button
                                        key={item.value}
                                        onClick={() => setPorte(item.value as PortePet)}
                                        className={`p-2 rounded-xl border-2 transition-all flex flex-col items-center gap-1 ${porte === item.value
                                                ? 'border-purple-500 bg-purple-100 shadow-md'
                                                : 'border-gray-200 bg-white hover:border-purple-300'
                                            }`}
                                    >
                                        <span className="font-semibold text-xs">{item.label}</span>
                                        <span className="text-xs text-gray-500">{item.desc}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Botões de Ação */}
                    <div className="flex gap-3 pt-2">
                        <button
                            onClick={handleClearFilter}
                            className="flex-1 py-3 px-4 rounded-full border-2 border-gray-300 text-gray-600 font-bold hover:bg-gray-100 transition-all"
                        >
                            Limpar
                        </button>
                        <button
                            onClick={handleApplyFilter}
                            disabled={!hasFilter}
                            className={`flex-1 py-3 px-4 rounded-full font-bold transition-all ${hasFilter
                                    ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600 shadow-lg'
                                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                }`}
                        >
                            🔍 Filtrar Produtos
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
