'use client'

import { useState, useMemo, useEffect } from 'react'
import ProductCard from './ProductCard'
import PetFilter from './PetFilter'
import { extrairPesoKg, calcularPrecoPorKg, type FiltroPet } from '@/lib/pet-utils'

interface Variacao {
    id: number
    label: string
    imagem: string
    preco: number
    loja: string
}

interface Grupo {
    nomePrincipal: string
    imagemCapa: string
    menorPrecoCapa: number
    variacoes: Variacao[]
}

interface HomeContentProps {
    grupos: Grupo[]
    searchTerm: string
}

export default function HomeContent({ grupos, searchTerm }: HomeContentProps) {
    const [filtroPet, setFiltroPet] = useState<FiltroPet | null>(null)

    // Filtra grupos baseado no perfil do pet
    const gruposFiltrados = useMemo(() => {
        if (!filtroPet) return grupos

        return grupos.filter(grupo => {
            const nome = grupo.nomePrincipal.toLowerCase()

            // Tipo de pet
            const ehCao = nome.includes('cão') || nome.includes('cães') || nome.includes('cachorro') || nome.includes('dog')
            const ehGato = nome.includes('gato') || nome.includes('cat') || nome.includes('felino')

            if (filtroPet.tipo === 'cão' && !ehCao && ehGato) return false
            if (filtroPet.tipo === 'gato' && !ehGato && ehCao) return false

            // Fase
            const ehFilhote = nome.includes('filhote') || nome.includes('puppy') || nome.includes('kitten')
            const ehIdoso = nome.includes('senior') || nome.includes('idoso') || nome.includes('7+')

            if (filtroPet.fase === 'filhote' && ehIdoso) return false
            if (filtroPet.fase === 'idoso' && ehFilhote) return false

            // Porte (só cães)
            if (filtroPet.porte && filtroPet.tipo === 'cão') {
                const portes = {
                    pequeno: ['mini', 'pequeno', 'small', 'toy'],
                    médio: ['médio', 'medio', 'medium'],
                    grande: ['grande', 'large'],
                    gigante: ['gigante', 'giant', 'maxi']
                }
                const palavrasPorte = portes[filtroPet.porte]
                const temPorteCorreto = palavrasPorte.some(p => nome.includes(p))
                const temOutroPorte = Object.entries(portes)
                    .filter(([k]) => k !== filtroPet.porte)
                    .some(([, palavras]) => palavras.some(p => nome.includes(p)))

                if (temOutroPorte && !temPorteCorreto) return false
            }

            return true
        })
    }, [grupos, filtroPet])

    // Paginação simples
    const ITEMS_PER_PAGE = 48

    const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE)

    // Reset paginação quando mudar filtros
    useEffect(() => {
        setVisibleCount(ITEMS_PER_PAGE)
    }, [filtroPet, searchTerm])

    // Adiciona preço por kg aos grupos
    const gruposComPrecoPorKg = useMemo(() => {
        return gruposFiltrados.map(grupo => {
            const pesoKg = extrairPesoKg(grupo.nomePrincipal)
            const precoPorKg = calcularPrecoPorKg(grupo.menorPrecoCapa, pesoKg)
            return {
                ...grupo,
                pesoKg,
                precoPorKg
            }
        })
    }, [gruposFiltrados])

    const gruposVisiveis = gruposComPrecoPorKg.slice(0, visibleCount)
    const temMais = visibleCount < gruposComPrecoPorKg.length

    return (
        <div className="space-y-8">
            {/* Filtro de Pet */}
            {!searchTerm && (
                <PetFilter onFilterChange={setFiltroPet} />
            )}

            {/* Indicador de filtro ativo */}
            {filtroPet && (
                <div className="flex items-center gap-2 p-3 bg-purple-100 rounded-lg text-purple-800">
                    <span className="text-xl">{filtroPet.tipo === 'cão' ? '🐕' : '🐈'}</span>
                    <span className="font-semibold">
                        Mostrando produtos para {filtroPet.tipo} {filtroPet.fase}
                        {filtroPet.porte && ` de porte ${filtroPet.porte}`}
                    </span>
                    <span className="ml-auto text-sm">
                        {gruposFiltrados.length} produtos encontrados
                    </span>
                </div>
            )}

            {/* Título */}
            <h2 className="text-2xl font-extrabold text-gray-800">
                {searchTerm ? (
                    <>Resultados para &quot;{searchTerm}&quot;</>
                ) : filtroPet ? (
                    <>Recomendados para seu {filtroPet.tipo} 🐾</>
                ) : (
                    <>Destaques para seu pet 🐾</>
                )}
            </h2>

            {/* Grid de Produtos */}
            {gruposComPrecoPorKg.length > 0 ? (
                <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {gruposVisiveis.map((grupo) => (
                            <ProductCard
                                key={grupo.nomePrincipal}
                                id={grupo.variacoes[0]?.id}
                                title={grupo.nomePrincipal}
                                image={grupo.imagemCapa}
                                price={grupo.menorPrecoCapa}
                                slug={`ofertas?q=${encodeURIComponent(grupo.nomePrincipal)}`}
                                rating={4.8}
                                reviews={120} // Static or valid data, avoid Math.random() in render loop
                                variants={grupo.variacoes}
                            />
                        ))}
                    </div>

                    {/* Load More Button */}
                    {temMais && (
                        <div className="flex justify-center pt-8 pb-12">
                            <button
                                onClick={() => setVisibleCount(prev => prev + ITEMS_PER_PAGE)}
                                className="bg-white border-2 border-purple-600 text-purple-700 font-bold py-3 px-8 rounded-full hover:bg-purple-600 hover:text-white transition-all shadow-sm hover:shadow-lg transform hover:-translate-y-1"
                            >
                                Ver mais produtos ({gruposComPrecoPorKg.length - visibleCount} restantes)
                            </button>
                        </div>
                    )}
                </>
            ) : (
                <div className="text-center py-16">
                    <div className="text-6xl mb-4">🔍</div>
                    <h3 className="text-xl font-bold text-gray-600">
                        Nenhum produto encontrado para este perfil
                    </h3>
                    <p className="text-gray-500 mt-2">
                        Tente ajustar os filtros ou limpar a busca.
                    </p>
                </div>
            )}
        </div>
    )
}
