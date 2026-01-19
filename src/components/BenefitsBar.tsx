import React from 'react'

export default function BenefitsBar() {
    const benefits = [
        {
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-[#522166]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            ),
            title: "Comparação Gratuita",
            subtitle: "100% livre de taxas"
        },
        {
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-[#522166]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
            ),
            title: "Atualização em Tempo Real",
            subtitle: "Preços sempre novos"
        },
        {
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-[#522166]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            ),
            title: "Melhores Ofertas",
            subtitle: "Petz, Cobasi, Petlove..."
        },
        {
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-[#522166]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
            ),
            title: "Compra 100% Segura",
            subtitle: "Direto na loja oficial"
        }
    ]

    return (
        <div className="bg-gray-50 border-y border-gray-200">
            <div className="max-w-7xl mx-auto px-4 py-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    {benefits.map((item, index) => (
                        <div key={index} className="flex items-center gap-3 justify-center md:justify-start">
                            <div className="p-2 bg-purple-100 rounded-full shrink-0">
                                {item.icon}
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-gray-800">{item.title}</h3>
                                <p className="text-xs text-gray-500">{item.subtitle}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
