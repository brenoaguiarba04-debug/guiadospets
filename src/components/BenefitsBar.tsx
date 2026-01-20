'use client'

import React from 'react'

export default function BenefitsBar() {
    const benefits = [
        {
            icon: "✓",
            iconBg: "bg-green-500",
            title: "Comparação Gratuita",
            subtitle: "100% livre de taxas"
        },
        {
            icon: "⚡",
            iconBg: "bg-yellow-500",
            title: "Preços Atualizados",
            subtitle: "Em tempo real"
        },
        {
            icon: "🏷️",
            iconBg: "bg-orange-500",
            title: "Melhores Ofertas",
            subtitle: "Petz, Cobasi, Petlove..."
        },
        {
            icon: "🛡️",
            iconBg: "bg-blue-500",
            title: "Compra Segura",
            subtitle: "Direto na loja oficial"
        }
    ]

    // Duplicar para efeito infinito
    const duplicatedBenefits = [...benefits, ...benefits, ...benefits, ...benefits]

    return (
        <div className="bg-[#1e1145] overflow-hidden">
            <div className="flex animate-benefits-marquee">
                {duplicatedBenefits.map((item, index) => (
                    <div
                        key={index}
                        className="flex items-center gap-3 px-8 py-4 whitespace-nowrap"
                    >
                        <span className={`w-8 h-8 ${item.iconBg} rounded-full flex items-center justify-center text-white text-sm font-bold`}>
                            {item.icon}
                        </span>
                        <div>
                            <h3 className="text-sm font-bold text-white">{item.title}</h3>
                            <p className="text-xs text-purple-300">{item.subtitle}</p>
                        </div>
                    </div>
                ))}
            </div>

            <style jsx>{`
                @keyframes benefits-marquee {
                    0% {
                        transform: translateX(0);
                    }
                    100% {
                        transform: translateX(-25%);
                    }
                }
                .animate-benefits-marquee {
                    animation: benefits-marquee 20s linear infinite;
                }
            `}</style>
        </div>
    )
}
