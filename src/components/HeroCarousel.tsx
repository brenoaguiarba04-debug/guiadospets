'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'

export default function HeroCarousel() {
    const [currentSlide, setCurrentSlide] = useState(0)

    const slides = [
        {
            id: 1,
            content: (
                <div className="relative bg-gradient-to-r from-[#6b21a8] via-[#7c3aed] to-[#a855f7] rounded-3xl overflow-hidden shadow-xl w-full h-[320px] sm:h-[400px] flex items-center">
                    {/* Decorative Elements */}
                    <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/3 blur-3xl"></div>
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-900/30 rounded-full translate-y-1/2 -translate-x-1/3 blur-2xl"></div>

                    <div className="relative z-10 px-8 sm:px-16 flex flex-col lg:flex-row items-center justify-between w-full gap-4">
                        <div className="max-w-xl text-left">
                            <span className="inline-block px-4 py-1.5 bg-yellow-400 text-yellow-900 text-sm font-bold rounded-full mb-4 shadow-lg">
                                🔥 Compare e Economize
                            </span>
                            <h2 className="text-3xl sm:text-5xl font-extrabold text-white mb-4 leading-tight">
                                Encontre o <span className="text-yellow-300">melhor preço</span> para seu pet
                            </h2>
                            <p className="text-purple-100 text-lg mb-8 max-w-lg hidden sm:block">
                                Compare preços de rações e medicamentos em Petz, Cobasi, Petlove e mais.
                            </p>
                            <div className="flex flex-wrap gap-4">
                                <Link href="/categoria/racoes" className="px-6 py-3 bg-white text-purple-700 font-bold rounded-full hover:bg-yellow-300 hover:text-purple-900 transition-all shadow-lg text-sm sm:text-base">
                                    Comparar Preços
                                </Link>
                            </div>
                        </div>

                        <div className="hidden lg:block relative -mr-10">
                            <img
                                src="/—Pngtree—dog and cat white backgroud_13489516.png"
                                alt="Cachorro e gato"
                                className="w-[450px] h-[450px] object-contain drop-shadow-2xl transform scale-110 translate-y-6"
                            />
                        </div>
                    </div>
                </div>
            )
        },
        {
            id: 2,
            content: (
                <div className="relative bg-gradient-to-r from-[#0ea5e9] to-[#2563eb] rounded-3xl overflow-hidden shadow-xl w-full h-[320px] sm:h-[400px] flex items-center">
                    {/* Decorative Circles */}
                    <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[radial-gradient(circle_at_50%_120%,#fff_0%,transparent_50%)]"></div>
                    <div className="absolute top-10 right-10 text-white/10 text-9xl font-black rotate-12">💊</div>

                    <div className="relative z-10 px-8 sm:px-16 flex flex-col items-start justify-center w-full max-w-2xl">
                        <span className="px-4 py-1.5 bg-white/20 backdrop-blur-md text-white border border-white/30 text-sm font-bold rounded-full mb-4 shadow-sm">
                            🏥 Saúde e Bem-estar
                        </span>
                        <h2 className="text-3xl sm:text-5xl font-extrabold text-white mb-4 leading-tight">
                            Farmácia Veterinária<br />com <span className="text-cyan-300">Preço Baixo</span>
                        </h2>
                        <p className="text-blue-100 text-lg mb-8 max-w-lg hidden sm:block">
                            Encontre antipulgas, vermífugos e medicamentos essenciais para proteger seu pet gastando menos.
                        </p>
                        <Link href="/categoria/medicamentos" className="px-8 py-3.5 bg-white text-blue-600 font-bold rounded-full hover:bg-cyan-50 transition-all shadow-lg hover:shadow-xl hover:-translate-y-1">
                            Ver Medicamentos
                        </Link>
                    </div>
                </div>
            )
        },
        {
            id: 3,
            content: (
                <div className="relative bg-gradient-to-r from-[#f43f5e] to-[#e11d48] rounded-3xl overflow-hidden shadow-xl w-full h-[320px] sm:h-[400px] flex items-center">
                    <div className="absolute top-0 right-0 w-full h-full opacity-10 bg-[radial-gradient(ellipse_at_top_right,#fff_0%,transparent_70%)]"></div>
                    <div className="absolute bottom-4 right-10 text-white/10 text-9xl font-black -rotate-12">🎾</div>

                    <div className="relative z-10 px-8 sm:px-16 flex flex-col items-start justify-center w-full max-w-2xl">
                        <span className="px-4 py-1.5 bg-white/20 backdrop-blur-md text-white border border-white/30 text-sm font-bold rounded-full mb-4 shadow-sm">
                            🧶 Diversão Garantida
                        </span>
                        <h2 className="text-3xl sm:text-5xl font-extrabold text-white mb-4 leading-tight">
                            Brinquedos e<br /><span className="text-pink-200">Acessórios Fofos</span>
                        </h2>
                        <p className="text-rose-100 text-lg mb-8 max-w-lg hidden sm:block">
                            As melhores caminhas, arranhadores e brinquedos para manter seu pet feliz e ativo.
                        </p>
                        <Link href="/categoria/brinquedos" className="px-8 py-3.5 bg-white text-rose-600 font-bold rounded-full hover:bg-rose-50 transition-all shadow-lg hover:shadow-xl hover:-translate-y-1">
                            Mimar meu Pet
                        </Link>
                    </div>
                </div>
            )
        },
        {
            id: 4,
            content: (
                <div className="relative bg-gradient-to-r from-[#10b981] to-[#059669] rounded-3xl overflow-hidden shadow-xl w-full h-[320px] sm:h-[400px] flex items-center">
                    <div className="absolute top-0 left-0 w-full h-full opacity-20 bg-[linear-gradient(45deg,transparent_25%,#fff_25%,#fff_50%,transparent_50%,transparent_75%,#fff_75%,#fff_100%)] bg-[length:20px_20px]"></div>
                    <div className="absolute top-1/2 right-20 text-white/10 text-9xl font-black -translate-y-1/2">🏷️</div>

                    <div className="relative z-10 px-8 sm:px-16 flex flex-col items-start justify-center w-full max-w-2xl">
                        <span className="px-4 py-1.5 bg-yellow-400 text-green-900 text-sm font-bold rounded-full mb-4 shadow-lg">
                            💰 Economia Real
                        </span>
                        <h2 className="text-3xl sm:text-5xl font-extrabold text-white mb-4 leading-tight">
                            Ofertas Relâmpago<br /><span className="text-green-200">Até 50% OFF</span>
                        </h2>
                        <p className="text-green-50 text-lg mb-8 max-w-lg hidden sm:block">
                            Seleção diária dos produtos com os maiores descontos da internet. Aproveite antes que acabe!
                        </p>
                        <Link href="/ofertas" className="px-8 py-3.5 bg-white text-green-600 font-bold rounded-full hover:bg-green-50 transition-all shadow-lg hover:shadow-xl hover:-translate-y-1">
                            Ver Promoções
                        </Link>
                    </div>
                </div>
            )
        }
    ]

    const nextSlide = () => {
        setCurrentSlide((prev) => (prev === slides.length - 1 ? 0 : prev + 1))
    }

    const prevSlide = () => {
        setCurrentSlide((prev) => (prev === 0 ? slides.length - 1 : prev - 1))
    }

    // Auto-slide every 5 seconds
    useEffect(() => {
        const timer = setInterval(() => {
            nextSlide()
        }, 8000)
        return () => clearInterval(timer)
    }, [])

    return (
        <div className="relative w-full max-w-7xl mx-auto px-4 group">
            <div className="overflow-hidden rounded-3xl">
                <div
                    className="flex transition-transform duration-500 ease-in-out"
                    style={{ transform: `translateX(-${currentSlide * 100}%)` }}
                >
                    {slides.map((slide) => (
                        <div key={slide.id} className="w-full shrink-0">
                            {slide.content}
                        </div>
                    ))}
                </div>
            </div>

            {/* Arrows */}
            <button
                onClick={prevSlide}
                className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 lg:translate-x-0 w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center text-purple-700 hover:scale-110 transition-transform md:opacity-0 group-hover:opacity-100 z-20"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
            </button>

            <button
                onClick={nextSlide}
                className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 lg:translate-x-0 w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center text-purple-700 hover:scale-110 transition-transform md:opacity-0 group-hover:opacity-100 z-20"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
            </button>

            {/* Dots */}
            <div className="flex justify-center gap-2 mt-6">
                {slides.map((_, index) => (
                    <button
                        key={index}
                        onClick={() => setCurrentSlide(index)}
                        className={`w-3 h-3 rounded-full transition-all ${currentSlide === index ? 'bg-purple-600 scale-125' : 'bg-gray-300 hover:bg-purple-400'
                            }`}
                        aria-label={`Ir para slide ${index + 1}`}
                    />
                ))}
            </div>
        </div>
    )
}
