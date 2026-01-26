'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { UserButton, SignedIn, SignedOut } from '@clerk/nextjs'
import {
    Menu, Search, User, ShoppingBag, Zap, Trophy,
    Bone, Pill, Dog, Cat, Ribbon, ShowerHead,
    Gamepad2, BedDouble, X
} from 'lucide-react'
import MobileBottomNav from './MobileBottomNav'

export default function Header() {
    const [searchQuery, setSearchQuery] = useState('')
    const [menuOpen, setMenuOpen] = useState(false)
    const router = useRouter()
    const searchInputRef = useRef<HTMLInputElement>(null)

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault()
        if (searchQuery.trim()) {
            router.push(`/?q=${encodeURIComponent(searchQuery.trim())}`)
        } else {
            router.push('/')
        }
    }

    const focusSearch = () => {
        if (searchInputRef.current) {
            searchInputRef.current.focus()
            window.scrollTo({ top: 0, behavior: 'smooth' })
        }
    }

    return (
        <>
            <header className="sticky top-0 z-50 transition-all duration-300">
                {/* Main Header - Glassmorphism */}
                <div className="glass shadow-sm">
                    <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4 sm:gap-8">
                        {/* Logo & Menu */}
                        <div className="flex items-center gap-4 shrink-0">
                            <button
                                onClick={() => setMenuOpen(!menuOpen)}
                                className="text-gray-700 hover:bg-white/50 p-2 rounded-xl transition-colors md:hidden active:scale-95"
                                aria-label="Abrir menu"
                            >
                                <Menu size={24} />
                            </button>

                            <Link href="/" className="flex items-center group relative hover:scale-105 transition-transform">
                                <Image
                                    src="/logo.png"
                                    alt="Guia do Pet"
                                    width={160}
                                    height={70}
                                    className="h-14 w-auto object-contain drop-shadow-sm"
                                    priority
                                />
                            </Link>

                            {/* Desktop Categories Button */}
                            <button
                                onClick={() => setMenuOpen(!menuOpen)}
                                className="hidden md:flex items-center gap-2 px-4 py-2 bg-white/60 hover:bg-white border border-white/40 rounded-full text-gray-700 font-bold text-sm shadow-sm transition-all text-gray-600 hover:scale-105 active:scale-95"
                            >
                                <Menu size={18} />
                                Categorias
                            </button>
                        </div>

                        {/* Search - Bubbly & Soft */}
                        <form onSubmit={handleSearch} className="flex-1 max-w-2xl hidden md:block">
                            <div className="relative group">
                                <input
                                    ref={searchInputRef}
                                    type="search"
                                    placeholder="O que seu pet precisa hoje?"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-6 pr-14 py-3 rounded-full border border-purple-100 bg-white/80 text-gray-700 placeholder:text-gray-400 focus:bg-white focus:ring-4 focus:ring-purple-200 focus:border-purple-400 outline-none transition-all shadow-sm focus:shadow-md"
                                />
                                <button
                                    type="submit"
                                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-purple-600 text-white rounded-full shadow-lg hover:shadow-purple-500/30 transition-all hover:scale-110 active:scale-95"
                                >
                                    <Search size={18} />
                                </button>
                            </div>
                        </form>

                        {/* Nav Actions */}
                        <nav className="flex items-center gap-3 sm:gap-4 shrink-0 hidden md:flex">
                            <SignedOut>
                                <Link href="/sign-in">
                                    <div className="flex flex-col items-center gap-1 text-gray-600 hover:text-purple-700 transition-colors hover:-translate-y-1">
                                        <div className="p-2 bg-white rounded-full shadow-sm border border-gray-100">
                                            <User size={20} />
                                        </div>
                                    </div>
                                </Link>
                            </SignedOut>
                            <SignedIn>
                                <UserButton afterSignOutUrl="/" appearance={{ elements: { avatarBox: "w-10 h-10 border-2 border-white shadow-sm" } }} />
                            </SignedIn>

                            <Link href="/carrinho" className="group relative">
                                <div className="p-2 bg-white rounded-full shadow-sm border border-gray-100 text-gray-600 group-hover:text-purple-700 hover:-translate-y-1 transition-transform">
                                    <ShoppingBag size={20} />
                                </div>
                            </Link>
                        </nav>
                    </div>

                    {/* Mobile Search - Visible only on mobile */}
                    <div className="px-4 pb-3 md:hidden">
                        <form onSubmit={handleSearch} className="relative">
                            <input
                                ref={searchInputRef}
                                type="search"
                                placeholder="Buscar..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-4 pr-12 py-2.5 rounded-2xl border border-gray-200 bg-gray-50/50 focus:bg-white focus:ring-2 focus:ring-purple-400 outline-none text-sm transition-all"
                            />
                            <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-purple-600">
                                <Search size={18} />
                            </button>
                        </form>
                    </div>
                </div>

                {/* Categories Bar - Desktop Only */}
                <div className="bg-white/80 backdrop-blur-md border-b border-gray-100 hidden md:block">
                    <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-center gap-8 overflow-x-auto">
                        {[
                            { label: 'Ofertas', link: '/?q=Ofertas', icon: <Zap size={16} className="text-yellow-500 fill-yellow-500" /> },
                            { label: 'Marcas', link: '/marcas', icon: <Trophy size={16} className="text-yellow-600" /> },
                            { label: 'Cães', link: '/categoria/caes', icon: <Dog size={16} /> },
                            { label: 'Gatos', link: '/categoria/gatos', icon: <Cat size={16} /> },
                            { label: 'Rações', link: '/categoria/racoes', icon: <Bone size={16} /> },
                            { label: 'Farmácia', link: '/categoria/medicamentos', icon: <Pill size={16} /> },
                        ].map((item) => (
                            <Link
                                key={item.label}
                                href={item.link}
                                className="flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-purple-700 transition-colors py-1 group"
                            >
                                <span className="group-hover:scale-110 transition-transform">{item.icon}</span>
                                {item.label}
                            </Link>
                        ))}
                    </div>
                </div>

                {/* Mobile/Desktop Side Menu */}
                {menuOpen && (
                    <>
                        <div
                            onClick={() => setMenuOpen(false)}
                            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 animate-in fade-in duration-200"
                        />
                        <div
                            className="fixed top-0 left-0 h-full w-[300px] bg-white z-50 shadow-2xl overflow-y-auto animate-in slide-in-from-left duration-300"
                        >
                            <div className="p-6 flex items-center justify-between border-b border-gray-100">
                                <h2 className="text-xl font-black text-gray-800">Menu</h2>
                                <button onClick={() => setMenuOpen(false)} className="p-2 hover:bg-gray-100 rounded-full text-gray-500">
                                    <X size={24} />
                                </button>
                            </div>

                            <div className="p-4 space-y-2">
                                {[
                                    { label: 'Início', icon: '🏠', link: '/' },
                                    { label: 'Ofertas do Dia', icon: '🔥', link: '/ofertas' },
                                    { label: 'Cupons', icon: '🎟️', link: '/cupons' },
                                ].map((item) => (
                                    <Link
                                        key={item.label}
                                        href={item.link}
                                        onClick={() => setMenuOpen(false)}
                                        className="flex items-center gap-4 px-4 py-3 rounded-xl hover:bg-purple-50 text-gray-700 font-bold transition-colors"
                                    >
                                        <span className="text-xl">{item.icon}</span>
                                        {item.label}
                                    </Link>
                                ))}

                                <div className="border-t border-gray-100 my-4 pt-4">
                                    <h3 className="px-4 text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Departamentos</h3>
                                    {[
                                        { label: 'Rações', icon: <Bone size={20} />, link: '/categoria/racoes' },
                                        { label: 'Farmácia', icon: <Pill size={20} />, link: '/categoria/medicamentos' },
                                        { label: 'Higiene', icon: <ShowerHead size={20} />, link: '/categoria/higiene' },
                                        { label: 'Brinquedos', icon: <Gamepad2 size={20} />, link: '/categoria/brinquedos' },
                                        { label: 'Camas', icon: <BedDouble size={20} />, link: '/categoria/camas' },
                                        { label: 'Acessórios', icon: <Ribbon size={20} />, link: '/categoria/acessorios' },
                                    ].map((item) => (
                                        <Link
                                            key={item.label}
                                            href={item.link}
                                            onClick={() => setMenuOpen(false)}
                                            className="flex items-center gap-3 px-4 py-2.5 rounded-xl hover:bg-purple-50 text-gray-600 hover:text-purple-700 font-medium transition-all group"
                                        >
                                            <span className="text-gray-400 group-hover:text-purple-500 group-hover:scale-110 transition-all">{item.icon}</span>
                                            {item.label}
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </header>
            <MobileBottomNav onMenuClick={() => setMenuOpen(true)} onSearchClick={focusSearch} />
        </>
    )
}
