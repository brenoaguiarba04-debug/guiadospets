'use client'

import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { useState } from 'react'

interface Cupom {
    loja: string
    codigo: string
    desconto: string
    descricao: string
    validade: string
    emoji: string
    cor: string
    link: string
}

const CUPONS: Cupom[] = [
    {
        loja: 'Amazon',
        codigo: 'Sem código',
        desconto: 'Até 40% OFF',
        descricao: 'Ofertas especiais em produtos pet selecionados',
        validade: 'Por tempo limitado',
        emoji: '📦',
        cor: 'from-orange-500 to-orange-600',
        link: 'https://www.amazon.com.br/pet-shop'
    },
    {
        loja: 'Shopee',
        codigo: 'PETSHOP10',
        desconto: 'R$10 OFF',
        descricao: 'Desconto para novos usuários do app',
        validade: 'Válido por 7 dias',
        emoji: '🧡',
        cor: 'from-orange-400 to-red-500',
        link: 'https://shopee.com.br'
    },
    {
        loja: 'Mercado Livre',
        codigo: 'Sem código',
        desconto: 'Até 30% OFF',
        descricao: 'Melhores ofertas em produtos pet com frete grátis',
        validade: 'Ofertas diárias',
        emoji: '🛒',
        cor: 'from-yellow-500 to-yellow-600',
        link: 'https://www.mercadolivre.com.br/ofertas/pet-shop'
    },
]

function CupomCard({ cupom }: { cupom: Cupom }) {
    const [copied, setCopied] = useState(false)

    const handleCopy = () => {
        navigator.clipboard.writeText(cupom.codigo)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    return (
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100 hover:shadow-xl transition-all duration-300 group">
            {/* Header do Cupom */}
            <div className={`bg-gradient-to-r ${cupom.cor} text-white p-6`}>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <span className="text-4xl">{cupom.emoji}</span>
                        <div>
                            <h3 className="text-xl font-bold">{cupom.loja}</h3>
                            <p className="text-white/80 text-sm">{cupom.validade}</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-3xl font-black">{cupom.desconto}</div>
                    </div>
                </div>
            </div>

            {/* Corpo do Cupom */}
            <div className="p-6 space-y-4">
                <p className="text-gray-600">{cupom.descricao}</p>

                {/* Código do Cupom */}
                {cupom.codigo !== 'Sem código' ? (
                    <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg px-4 py-3 font-mono font-bold text-lg text-center text-gray-800">
                            {cupom.codigo}
                        </div>
                        <button
                            onClick={handleCopy}
                            className={`px-4 py-3 rounded-lg font-bold transition-colors ${copied
                                ? 'bg-green-500 text-white'
                                : 'bg-purple-600 text-white hover:bg-purple-700'
                                }`}
                        >
                            {copied ? '✓ Copiado!' : '📋 Copiar'}
                        </button>
                    </div>
                ) : (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-3 text-center text-yellow-700 font-medium">
                        Desconto aplicado automaticamente no site
                    </div>
                )}

                {/* CTA */}
                <a
                    href={cupom.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`block w-full py-3 bg-gradient-to-r ${cupom.cor} text-white text-center rounded-xl font-bold hover:opacity-90 transition-all uppercase tracking-wide`}
                >
                    Ir para {cupom.loja} →
                </a>
            </div>
        </div>
    )
}

export default function CuponsPage() {
    return (
        <div className="min-h-screen flex flex-col bg-gray-50">
            <Header />

            <main className="flex-1 w-full">
                {/* Hero */}
                <div className="bg-gradient-to-r from-[#522166] to-[#7c3aed] text-white py-12 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl"></div>
                    <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2 blur-xl"></div>

                    <div className="max-w-7xl mx-auto px-4 relative z-10 text-center">
                        <span className="text-6xl mb-4 block">🎟️</span>
                        <h1 className="font-titan text-3xl sm:text-5xl mb-4 leading-tight">
                            Cupons de Desconto
                        </h1>
                        <p className="text-purple-100 text-lg sm:text-xl max-w-2xl mx-auto">
                            Economize ainda mais nas suas compras de produtos pet com cupons exclusivos!
                        </p>
                    </div>
                </div>

                {/* Breadcrumb */}
                <div className="max-w-7xl mx-auto px-4 py-4">
                    <nav className="text-sm text-gray-500">
                        <a href="/" className="hover:text-purple-600">Home</a>
                        <span className="mx-2">›</span>
                        <span className="text-gray-800 font-medium">Cupons de Desconto</span>
                    </nav>
                </div>

                {/* Aviso */}
                <div className="max-w-7xl mx-auto px-4 mb-8">
                    <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-center gap-3">
                        <span className="text-2xl">💡</span>
                        <p className="text-yellow-800 text-sm">
                            <strong>Dica:</strong> Alguns cupons são para novos clientes. Se já tem conta, tente criar uma nova com outro email!
                        </p>
                    </div>
                </div>

                {/* Grid de Cupons */}
                <div className="max-w-7xl mx-auto px-4 pb-12">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {CUPONS.map((cupom, index) => (
                            <CupomCard key={index} cupom={cupom} />
                        ))}
                    </div>
                </div>

                {/* Newsletter */}
                <div className="max-w-3xl mx-auto px-4 pb-12">
                    <div className="bg-white rounded-2xl shadow-lg p-8 text-center border border-gray-100">
                        <span className="text-4xl mb-4 block">📬</span>
                        <h2 className="text-2xl font-bold text-gray-800 mb-2">
                            Quer receber mais cupons?
                        </h2>
                        <p className="text-gray-600 mb-6">
                            Cadastre-se para receber cupons exclusivos e ofertas no seu email!
                        </p>
                        <form className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
                            <input
                                type="email"
                                placeholder="seu@email.com"
                                className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
                            />
                            <button
                                type="submit"
                                className="px-6 py-3 bg-purple-600 text-white font-bold rounded-xl hover:bg-purple-700 transition-colors"
                            >
                                Cadastrar
                            </button>
                        </form>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    )
}
