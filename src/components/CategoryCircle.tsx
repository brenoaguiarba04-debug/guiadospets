import Link from 'next/link'

interface CategoryCircleProps {
    label: string
    icon: string
    href: string
    active?: boolean
    badge?: string
}

export default function CategoryCircle({ label, icon, href, active, badge }: CategoryCircleProps) {
    return (
        <Link href={href} className="group flex flex-col items-center gap-2 min-w-[80px]">
            <div className={`
                relative w-20 h-20 rounded-full flex items-center justify-center text-3xl shadow-sm border
                transition-all duration-300 group-hover:scale-105 group-hover:shadow-md
                ${active
                    ? 'bg-[#522166] border-[#522166] text-white'
                    : 'bg-white border-gray-200 text-gray-700 group-hover:border-[#522166]'}
            `}>
                {icon}

                {/* Badge (e.g. -20%) */}
                {badge && (
                    <span className="absolute -top-2 -right-2 bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm animate-bounce">
                        {badge}
                    </span>
                )}
            </div>
            <span className={`text-xs font-semibold text-center ${active ? 'text-[#522166]' : 'text-gray-600 group-hover:text-[#522166]'}`}>
                {label}
            </span>
        </Link>
    )
}
