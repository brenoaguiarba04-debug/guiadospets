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
        <header className="bg-white shadow-sm sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
                {/* Logo */}
                <Link href="/" className="flex items-center gap-2 shrink-0">
                    <Image
                        src="/logo.jpg"
                        alt="GuiaDoPet Logo"
                        width={48}
                        height={48}
                        className="rounded-full"
                    />
                </Link>

                {/* Search */}
                <form onSubmit={handleSearch} className="flex-1 max-w-xl">
                    <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                            🔍
                        </span>
                        <input
                            type="search"
                            placeholder="O que seu pet precisa?"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 rounded-full border border-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none transition-all"
                        />
                    </div>
                </form>

                {/* Nav Actions */}
                <nav className="flex items-center gap-4">
                    <SignedIn>
                        <Link
                            href="/admin"
                            className="flex items-center gap-1.5 text-gray-600 hover:text-purple-600 transition-colors text-sm font-semibold"
                        >
                            <span>⚙️</span>
                            <span className="hidden sm:inline">Admin</span>
                        </Link>
                        <UserButton afterSignOutUrl="/" />
                    </SignedIn>
                    <SignedOut>
                        <Link
                            href="/sign-in"
                            className="flex items-center gap-1.5 text-gray-600 hover:text-purple-600 transition-colors text-sm font-semibold"
                        >
                            <span>👤</span>
                            <span className="hidden sm:inline">Entrar</span>
                        </Link>
                    </SignedOut>
                </nav>
            </div>

            {/* Category Bar */}
            <nav className="bg-gradient-to-r from-purple-600 to-purple-700 text-white">
                <div className="max-w-7xl mx-auto px-4 py-2 flex gap-6 overflow-x-auto scrollbar-hide text-sm font-semibold">
                    <Link href="/" className="hover:text-purple-200 transition-colors whitespace-nowrap">
                        Tudo
                    </Link>
                    <Link href="/?q=Ração" className="hover:text-purple-200 transition-colors whitespace-nowrap">
                        Rações
                    </Link>
                    <Link href="/?q=Antipulgas" className="hover:text-purple-200 transition-colors whitespace-nowrap">
                        Farmácia
                    </Link>
                    <Link href="/?q=Brinquedo" className="hover:text-purple-200 transition-colors whitespace-nowrap">
                        Brinquedos
                    </Link>
                    <Link href="/?q=Higiene" className="hover:text-purple-200 transition-colors whitespace-nowrap">
                        Higiene
                    </Link>
                </div>
            </nav>

            {/* Quick Access Chips */}
            <div className="bg-white border-b">
                <div className="max-w-7xl mx-auto px-4 py-2 flex gap-2 overflow-x-auto scrollbar-hide">
                    {[
                        { label: '🦴 Ração Golden', query: 'Golden' },
                        { label: '🦴 Ração Premier', query: 'Premier' },
                        { label: '💊 Bravecto', query: 'Bravecto' },
                        { label: '💊 NexGard', query: 'NexGard' },
                        { label: '💊 Simparic', query: 'Simparic' },
                    ].map((chip) => (
                        <Link
                            key={chip.query}
                            href={`/?q=${chip.query}`}
                            className="px-3 py-1.5 bg-purple-50 text-purple-700 rounded-full text-xs font-semibold hover:bg-purple-100 transition-colors whitespace-nowrap"
                        >
                            {chip.label}
                        </Link>
                    ))}
                </div>
            </div>
        </header>
    )
}
