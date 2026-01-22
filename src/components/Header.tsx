'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { UserButton, SignedIn, SignedOut } from '@clerk/nextjs'
import {
    Menu,
    Search,
    User,
    ShoppingBag,
    Zap,
    Trophy,
    Bone,
    Pill,
    Dog,
    Cat,
    Ticket,
    ShowerHead, // For Hygiene (was 🚿)
    Gamepad2, // For Toys (was 🎾)
    BedDouble, // For Beds (was 🛏️)
    Ribbon // For Accessories (was 🎀)
} from 'lucide-react'
import MobileBottomNav from './MobileBottomNav'
import { useRef } from 'react'

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
            // Optional: scroll to top to ensure visibility if sticky header is weird, 
            // but sticky header should be fine.
            window.scrollTo({ top: 0, behavior: 'smooth' })
        }
    }

    return (
        <>
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
                                <Menu size={24} />
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
                        <form onSubmit={handleSearch} className="flex-1 max-w-3xl hidden md:block">
                            <div className="relative group">
                                <input
                                    ref={searchInputRef}
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
                                    <Search size={20} />
                                </button>
                            </div>
                        </form>
                        {/* Mobile Search Icon/Input Placeholder if needed, but we rely on Bottom Nav to jump to search or just show it */}
                        {/* For now, let's keep a simplified search or just the sticky header search */}
                        <div className="md:hidden flex-1 flex justify-end">
                            {/* Mobile specific neat search or just rely on the sticky header having it? 
                                Actually, the design shows search in valid header. 
                                Let's keep the desktop search hidden on mobile to save space and rely on a 
                                compact search or just the Bottom Nav 'Search' triggering a modal/focus? 
                                
                                User asked for "Sticky Search". 
                                Let's make the Search Input visible on mobile but smaller?
                                Or stick to the plan: Bottom Nav focuses search.
                            */}
                        </div>

                        {/* Nav Actions - Dark Icons */}
                        <nav className="flex items-center gap-4 sm:gap-6 shrink-0 hidden md:flex">
                            <SignedOut>
                                <Link
                                    href="/sign-in"
                                    className="flex flex-col items-center gap-1 text-gray-600 hover:text-purple-700 transition-colors group"
                                >
                                    <User size={28} className="group-hover:scale-110 transition-transform" />
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
                                    <ShoppingBag size={28} className="group-hover:scale-110 transition-transform" />
                                    {/* Badge placeholder if needed */}
                                </div>
                                <span className="text-[10px] font-bold uppercase tracking-wide hidden sm:block">Cesta</span>
                            </Link>
                        </nav>
                    </div>
                    {/* Mobile Search Bar - Visible on Mobile Only (Below logo row) */}
                    <div className="px-4 pb-4 md:hidden">
                        <form onSubmit={handleSearch} className="relative group">
                            <input
                                ref={searchInputRef}
                                type="search"
                                placeholder="O que seu pet precisa?"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-4 pr-12 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-purple-500 outline-none transition-all text-sm"
                            />
                            <button
                                type="submit"
                                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-purple-600"
                            >
                                <Search size={20} />
                            </button>
                        </form>
                    </div>
                </div>

                {/* Sub-Header - Categories & Quick Links (White) */}
                <div className="bg-white border-b border-gray-200 shadow-sm hidden md:block">
                    <div className="max-w-7xl mx-auto px-4 py-2 flex items-center gap-6 overflow-x-auto scrollbar-hide text-sm font-medium text-gray-600">
                        <div
                            onClick={() => setMenuOpen(!menuOpen)}
                            className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-lg text-gray-900 font-bold cursor-pointer hover:bg-gray-200 transition-colors"
                        >
                            <Menu size={18} />
                            Todas as Categorias
                        </div>

                        {[
                            { label: 'Ofertas do Dia', link: '/?q=Ofertas', icon: <Zap size={16} className="text-yellow-500 fill-yellow-500" />, color: 'text-red-600' },
                            { label: 'Melhores Marcas', link: '/marcas', icon: <Trophy size={16} className="text-yellow-600" /> },
                            { label: 'Rações', link: '/categoria/racoes', icon: <Bone size={16} /> },
                            { label: 'Farmácia', link: '/categoria/medicamentos', icon: <Pill size={16} /> },
                            { label: 'Cachorros', link: '/categoria/caes', icon: <Dog size={16} /> },
                            { label: 'Gatos', link: '/categoria/gatos', icon: <Cat size={16} /> },
                            { label: 'Cupons', link: '/cupons', icon: <Ticket size={16} className="text-pink-500" /> },
                        ].map((item) => (
                            <Link
                                key={item.label}
                                href={item.link}
                                className={`px-3 py-1.5 rounded-md hover:bg-purple-50 hover:text-[#6b21a8] transition-colors whitespace-nowrap flex items-center gap-2 ${item.color || ''}`}
                            >
                                {item.icon}
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
                            <Menu size={24} />
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
                                    { label: 'Rações', icon: <Bone size={20} />, link: '/categoria/racoes' },
                                    { label: 'Farmácia', icon: <Pill size={20} />, link: '/categoria/medicamentos' },
                                    { label: 'Higiene e Limpeza', icon: <ShowerHead size={20} />, link: '/categoria/higiene' },
                                    { label: 'Brinquedos', icon: <Gamepad2 size={20} />, link: '/categoria/brinquedos' },
                                    { label: 'Camas e Casinhas', icon: <BedDouble size={20} />, link: '/categoria/camas' },
                                    { label: 'Acessórios', icon: <Ribbon size={20} />, link: '/categoria/acessorios' },
                                ].map((item) => (
                                    <Link
                                        key={item.label}
                                        href={item.link}
                                        className="flex items-center gap-3 px-4 py-2 text-gray-700 hover:bg-purple-50 hover:text-purple-700 rounded-lg group transition-colors"
                                        onClick={() => setMenuOpen(false)}
                                    >
                                        <span className="text-gray-400 group-hover:text-purple-600 transition-colors">{item.icon}</span>
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
                                    <Dog size={20} className="text-gray-400 group-hover:text-purple-600" />
                                    🐶 Cachorros
                                </Link>
                                <Link href="/categoria/gatos" className="flex items-center gap-3 px-4 py-2 text-gray-700 hover:bg-purple-50 hover:text-purple-700 rounded-lg font-medium" onClick={() => setMenuOpen(false)}>
                                    <Cat size={20} className="text-gray-400 group-hover:text-purple-600" />
                                    🐱 Gatos
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>

            </header>
            <MobileBottomNav onMenuClick={() => setMenuOpen(true)} onSearchClick={focusSearch} />
        </>
    )
}
