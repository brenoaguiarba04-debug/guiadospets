'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { UserButton, SignedIn, SignedOut } from '@clerk/nextjs'

export default function Header() {
    const [searchQuery, setSearchQuery] = useState('')
    const [menuOpen, setMenuOpen] = useState(false)
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
            {/* Main Header - Clean White for Logo Visibility */}
            <div className="bg-white shadow-md border-b border-gray-100">
                <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between gap-4 sm:gap-8">
                    {/* Logo & Menu */}
                    <div className="flex items-center gap-6 shrink-0">
                        {/* Hamburger Menu - Button */}
                        <button
                            onClick={() => setMenuOpen(!menuOpen)}
                            className="text-gray-700 hover:bg-gray-100 p-2 rounded-lg transition-colors flex flex-col gap-1.5 w-10 z-50 relative"
                            aria-label="Abrir menu"
                        >
                            <span className={`w-6 h-0.5 bg-gray-700 block transition-all ${menuOpen ? 'rotate-45 translate-y-2' : ''}`}></span>
                            <span className={`w-6 h-0.5 bg-gray-700 block transition-all ${menuOpen ? 'opacity-0' : ''}`}></span>
                            <span className={`w-6 h-0.5 bg-gray-700 block transition-all ${menuOpen ? '-rotate-45 -translate-y-2' : ''}`}></span>
                        </button>

                        <Link href="/" className="flex items-center group">
                            <Image
                                src="/logo.png"
                                alt="Guia do Pet"
                                width={180}
                                height={80}
                                className="h-20 w-auto object-contain group-hover:scale-105 transition-transform duration-200"
                                priority
                            />
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
                                className="w-full pl-6 pr-14 py-3.5 rounded-full border border-gray-200 bg-gray-50 text-gray-800 placeholder:text-gray-400 focus:bg-white focus:ring-4 focus:ring-purple-100 focus:border-purple-500 outline-none transition-all text-base"
                            />
                            <button
                                type="submit"
                                className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-purple-600 rounded-full hover:bg-purple-700 transition-transform active:scale-95 text-white shadow-md"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            </button>
                        </div>
                    </form>

                    {/* Nav Actions - Dark Icons */}
                    <nav className="flex items-center gap-4 sm:gap-6 shrink-0">
                        <SignedOut>
                            <Link
                                href="/sign-in"
                                className="flex flex-col items-center gap-1 text-gray-600 hover:text-purple-700 transition-colors group"
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
                                <span className="text-[10px] font-bold text-gray-600 uppercase tracking-wide hidden sm:block">Conta</span>
                            </div>
                        </SignedIn>

                        <Link href="/carrinho" className="flex flex-col items-center gap-1 text-gray-600 hover:text-purple-700 transition-colors group relative">
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
                    <div
                        onClick={() => setMenuOpen(!menuOpen)}
                        className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-lg text-gray-900 font-bold cursor-pointer hover:bg-gray-200 transition-colors"
                    >
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

            {/* Mobile Menu Overlay */}
            {menuOpen && (
                <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setMenuOpen(false)}></div>
            )}

            {/* Side Menu Drawer */}
            <div className={`fixed top-0 left-0 h-full w-[280px] bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out overflow-y-auto ${menuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                    <h2 className="text-lg font-bold text-gray-800">Menu</h2>
                    <button onClick={() => setMenuOpen(false)} className="p-2 hover:bg-gray-100 rounded-full text-gray-500">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="p-4 space-y-6">
                    {/* Links Principais */}
                    <div className="space-y-1">
                        <Link href="/" className="block px-4 py-2 text-gray-700 hover:bg-purple-50 hover:text-purple-700 rounded-lg font-medium" onClick={() => setMenuOpen(false)}>
                            🏠 Início
                        </Link>
                        <Link href="/ofertas" className="block px-4 py-2 text-red-600 hover:bg-red-50 hover:text-red-700 rounded-lg font-bold" onClick={() => setMenuOpen(false)}>
                            🔥 Ofertas do Dia
                        </Link>
                        <Link href="/cupons" className="block px-4 py-2 text-gray-700 hover:bg-purple-50 hover:text-purple-700 rounded-lg font-medium" onClick={() => setMenuOpen(false)}>
                            🎟️ Meus Cupons
                        </Link>
                    </div>

                    <hr className="border-gray-100" />

                    {/* Categorias */}
                    <div>
                        <h3 className="px-4 text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Departamentos</h3>
                        <div className="space-y-1">
                            {[
                                { label: 'Rações', icon: '🦴', link: '/categoria/racoes' },
                                { label: 'Farmácia', icon: '💊', link: '/categoria/medicamentos' },
                                { label: 'Higiene e Limpeza', icon: '🚿', link: '/categoria/higiene' },
                                { label: 'Brinquedos', icon: '🎾', link: '/categoria/brinquedos' },
                                { label: 'Camas e Casinhas', icon: '🛏️', link: '/categoria/camas' },
                                { label: 'Acessórios', icon: '🎀', link: '/categoria/acessorios' },
                            ].map((item) => (
                                <Link
                                    key={item.label}
                                    href={item.link}
                                    className="flex items-center gap-3 px-4 py-2 text-gray-700 hover:bg-purple-50 hover:text-purple-700 rounded-lg group transition-colors"
                                    onClick={() => setMenuOpen(false)}
                                >
                                    <span className="text-xl group-hover:scale-110 transition-transform">{item.icon}</span>
                                    <span className="font-medium">{item.label}</span>
                                </Link>
                            ))}
                        </div>
                    </div>

                    <hr className="border-gray-100" />

                    {/* Pets */}
                    <div>
                        <h3 className="px-4 text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Por Pet</h3>
                        <div className="space-y-1">
                            <Link href="/categoria/caes" className="flex items-center gap-3 px-4 py-2 text-gray-700 hover:bg-purple-50 hover:text-purple-700 rounded-lg font-medium" onClick={() => setMenuOpen(false)}>
                                🐶 Cachorros
                            </Link>
                            <Link href="/categoria/gatos" className="flex items-center gap-3 px-4 py-2 text-gray-700 hover:bg-purple-50 hover:text-purple-700 rounded-lg font-medium" onClick={() => setMenuOpen(false)}>
                                🐱 Gatos
                            </Link>
                        </div>
                    </div>
                </div>
            </div>

        </header>
    )
}
