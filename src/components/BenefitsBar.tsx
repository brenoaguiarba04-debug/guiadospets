'use client'

import React from 'react'
import { Truck, ShieldCheck, CreditCard, Tag } from 'lucide-react'

export default function BenefitsBar() {
    const benefits = [
        {
            icon: <Truck size={24} className="text-purple-600" />,
            title: "Comparação Gratuita",
            subtitle: "100% livre de taxas"
        },
        {
            icon: <Tag size={24} className="text-purple-600" />,
            title: "Preços Atualizados",
            subtitle: "Em tempo real"
        },
        {
            icon: <CreditCard size={24} className="text-purple-600" />,
            title: "Melhores Ofertas",
            subtitle: "Petz, Cobasi, Petlove..."
        },
        {
            icon: <ShieldCheck size={24} className="text-purple-600" />,
            title: "Compra Segura",
            subtitle: "Direto na loja oficial"
        }
    ]

    return (
        <div className="bg-white border-b border-gray-100 py-6">
            <div className="max-w-7xl mx-auto px-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
                    {benefits.map((item, index) => (
                        <div key={index} className="flex items-center gap-4 p-4 rounded-xl hover:bg-purple-50 transition-colors group cursor-default">
                            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                                {item.icon}
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-gray-800">{item.title}</h3>
                                <p className="text-xs text-gray-500 group-hover:text-purple-600 transition-colors">{item.subtitle}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
