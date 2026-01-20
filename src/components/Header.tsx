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
            {/* Main Header - Purple Gradient (Buscapé Style but Purple) */}
            <div className="bg-gradient-to-r from-[#6b21a8] to-[#4c1d95] shadow-lg">
                <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between gap-4 sm:gap-8">
                    {/* Logo & Menu */}
                    <div className="flex items-center gap-6 shrink-0">
                        {/* Hamburger Menu */}
                        <button className="text-white hover:bg-white/10 p-2 rounded-lg transition-colors flex flex-col gap-1.5 w-10">
                            <span className="w-6 h-0.5 bg-white block"></span>
                            <span className="w-6 h-0.5 bg-white block"></span>
                            <span className="w-6 h-0.5 bg-white block"></span>
                        </button>

                        <Link href="/" className="flex items-center gap-2 group">
                            <span className="text-2xl font-black text-white tracking-tight group-hover:scale-105 transition-transform">
                                GuiaDoPet<span className="text-[#ffd000]">.</span>
                            </span>
                        </Link>
                    </div>

                    {/* Search - Dominant & Central */}
                    <form onSubmit={handleSearch} className="flex-1 max-w-3xl">
                        <div className="relative group">
                            <input
                                type="search"
                                placeholder="Busque por ração, brinquedos, remédios..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-6 pr-14 py-3.5 rounded-full border-0 bg-white shadow-xl text-gray-800 placeholder:text-gray-400 focus:ring-4 focus:ring-[#ffd000]/30 outline-none transition-all text-base"
                            />
                            <button
                                type="submit"
                                className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-[#ffd000] rounded-full hover:bg-[#e6bc00] transition-transform active:scale-95 text-[#522166] shadow-md"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            </button>
                        </div>
                    </form>

                    {/* Nav Actions - White Icons */}
                    <nav className="flex items-center gap-4 sm:gap-6 shrink-0">
                        <SignedOut>
                            <Link
                                href="/sign-in"
                                className="flex flex-col items-center gap-1 text-white/90 hover:text-white transition-colors group"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                                <span className="text-[10px] font-bold uppercase tracking-wide hidden sm:block">Entrar</span>
                            </Link>
                        </SignedOut>
                        <SignedIn>
                            <div className="flex flex-col items-center gap-1">
                                <UserButton afterSignOutUrl="/" appearance={{ elements: { avatarBox: "w-8 h-8" } }} />
                                <span className="text-[10px] font-bold text-white/90 uppercase tracking-wide hidden sm:block">Conta</span>
                            </div>
                        </SignedIn>

                        <Link href="/carrinho" className="flex flex-col items-center gap-1 text-white/90 hover:text-white transition-colors group relative">
                            <div className="relative">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                                </svg>
                                {/* Badge placeholder if needed */}
                            </div>
                            <span className="text-[10px] font-bold uppercase tracking-wide hidden sm:block">Cesta</span>
                        </Link>
                    </nav>
                </div>
            </div>

            {/* Sub-Header - Categories & Quick Links (White) */}
            <div className="bg-white border-b border-gray-200 shadow-sm hidden md:block">
                <div className="max-w-7xl mx-auto px-4 py-2 flex items-center gap-6 overflow-x-auto scrollbar-hide text-sm font-medium text-gray-600">
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-lg text-gray-900 font-bold cursor-pointer hover:bg-gray-200 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h7" />
                        </svg>
                        Todas as Categorias
                    </div>

                    {[
                        { label: '🔥 Ofertas do Dia', link: '/?q=Ofertas', color: 'text-red-600' },
                        { label: '🏆 Melhores Marcas', link: '/marcas' },
                        { label: '🦴 Rações', link: '/categoria/racoes' },
                        { label: '💊 Farmácia', link: '/categoria/medicamentos' },
                        { label: '🐶 Cachorros', link: '/categoria/caes' },
                        { label: '🐱 Gatos', link: '/categoria/gatos' },
                        { label: '🎟️ Cupons', link: '/cupons' },
                    ].map((item) => (
                        <Link
                            key={item.label}
                            href={item.link}
                            className={`px-3 py-1.5 rounded-md hover:bg-purple-50 hover:text-[#6b21a8] transition-colors whitespace-nowrap flex items-center gap-2 ${item.color || ''}`}
                        >
                            {item.label}
                        </Link>
                    ))}
                </div>
            </div>
        </header>
    )
}
