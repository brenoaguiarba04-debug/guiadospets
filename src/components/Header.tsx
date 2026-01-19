'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { UserButton, SignedIn, SignedOut } from '@clerk/nextjs'

export default function Header() {
    const [searchQuery, setSearchQuery] = useState('')
    const router = useRouter()

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault()
        if (searchQuery.trim()) {
            router.push(`/?q=${encodeURIComponent(searchQuery.trim())}`)
        } else {
            router.push('/')
        }
    }

    return (
        <header className="sticky top-0 z-50">
            {/* Top Bar - White */}
            <div className="bg-white shadow-sm border-b border-gray-100">
                <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4 sm:gap-8">
                    {/* Logo & Menu */}
                    <div className="flex items-center gap-4">
                        <Link href="/" className="flex items-center gap-2 shrink-0">
                            <span className="text-2xl font-black text-[#522166] tracking-tight">
                                GuiaDoPet
                            </span>
                        </Link>
                    </div>

                    {/* Search - Prominent & Rounded */}
                    <form onSubmit={handleSearch} className="flex-1 max-w-2xl">
                        <div className="relative group">
                            <input
                                type="search"
                                placeholder="O que seu pet precisa?"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-5 pr-12 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:border-[#522166] focus:ring-1 focus:ring-[#522166] outline-none transition-all placeholder:text-gray-400 text-gray-700"
                            />
                            <button
                                type="submit"
                                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-[#ffd000] rounded-lg hover:bg-[#e6bc00] transition-colors text-[#522166]"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            </button>
                        </div>
                    </form>

                    {/* Nav Actions */}
                    <nav className="flex items-center gap-6">
                        <SignedOut>
                            <Link
                                href="/sign-in"
                                className="flex items-center gap-2 text-[#522166] hover:text-[#3e194d] transition-colors font-bold text-sm"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                                <span className="hidden sm:inline">Entrar</span>
                            </Link>
                        </SignedOut>
                        <SignedIn>
                            <UserButton afterSignOutUrl="/" />
                        </SignedIn>

                        <Link href="/carrinho" className="relative text-[#522166] hover:text-[#3e194d] transition-colors">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                        </Link>
                    </nav>
                </div>
            </div>

            {/* Secondary Nav - White Pills */}
            <nav className="bg-white border-b border-gray-100 hidden md:block">
                <div className="max-w-7xl mx-auto px-4 py-3 flex gap-4 overflow-x-auto scrollbar-hide text-sm font-bold text-gray-600">
                    {[
                        { label: '✨ Clube Petlove', link: '#' },
                        { label: '🩺 Plano de saúde', link: '#' },
                        { label: '✂️ Serviços', link: '#' },
                        { label: '🏷️ Ofertas', link: '/?q=Ofertas' },
                        { label: '🦴 Rações', link: '/categoria/racoes' },
                        { label: '💊 Farmácia', link: '/categoria/medicamentos' },
                        { label: '🐶 Cachorros', link: '/categoria/caes' },
                        { label: '🐱 Gatos', link: '/categoria/gatos' },
                    ].map((item) => (
                        <Link
                            key={item.label}
                            href={item.link}
                            className="px-4 py-2 bg-white border border-gray-200 rounded-full hover:border-[#522166] hover:text-[#522166] transition-all whitespace-nowrap flex items-center gap-2"
                        >
                            {item.label}
                        </Link>
                    ))}
                </div>
            </nav>
        </header>
    )
}
