'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Search, ShoppingBag, User, Menu } from 'lucide-react'
import { useClerk } from '@clerk/nextjs'

export default function MobileBottomNav({ onMenuClick, onSearchClick }: { onMenuClick?: () => void, onSearchClick?: () => void }) {
    const pathname = usePathname()
    const { user } = useClerk()

    const navItems = [
        {
            label: 'Início',
            icon: Home,
            href: '/',
            action: null
        },
        {
            label: 'Buscar',
            icon: Search,
            href: '/#search', // Placeholder, ideally triggers focus
            action: onSearchClick
        },
        {
            label: 'Menu',
            icon: Menu,
            href: '#',
            action: onMenuClick
        },
        {
            label: 'Cesta',
            icon: ShoppingBag,
            href: '/carrinho',
            action: null
        },
        {
            label: 'Conta',
            icon: User,
            href: user ? '/conta' : '/sign-in',
            action: null
        }
    ]

    return (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 py-2 px-4 md:hidden z-50 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
            <div className="flex justify-between items-center max-w-sm mx-auto">
                {navItems.map((item, index) => {
                    const isActive = pathname === item.href
                    const Icon = item.icon

                    return (
                        <button
                            key={index}
                            onClick={(e) => {
                                if (item.action) {
                                    e.preventDefault()
                                    item.action()
                                } else if (item.href.startsWith('#')) {
                                    e.preventDefault()
                                }
                                // Else allow Link default behavior (if wrapped) or router push
                            }}
                            className="relative flex flex-col items-center gap-1 min-w-[60px]"
                        >
                            {item.action || item.href.startsWith('#') ? (
                                <div className={`flex flex-col items-center ${isActive ? 'text-purple-600' : 'text-gray-500 hover:text-purple-600'}`}>
                                    <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
                                    <span className="text-[10px] font-medium">{item.label}</span>
                                </div>
                            ) : (
                                <Link href={item.href} className={`flex flex-col items-center ${isActive ? 'text-purple-600' : 'text-gray-500 hover:text-purple-600'}`}>
                                    <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
                                    <span className="text-[10px] font-medium">{item.label}</span>
                                </Link>
                            )}
                        </button>
                    )
                })}
            </div>
        </div>
    )
}
