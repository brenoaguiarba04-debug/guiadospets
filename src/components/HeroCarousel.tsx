'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'

export default function HeroCarousel() {
    const [currentSlide, setCurrentSlide] = useState(0)

    const slides = [
        {
            id: 1,
            bg: "bg-gradient-to-br from-purple-600 via-purple-500 to-indigo-500",
            title: (
                <>
                    Encontre o <span className="text-yellow-300 relative inline-block">
                        melhor preço
                        <svg className="absolute -bottom-2 left-0 w-full h-3 text-yellow-300" viewBox="0 0 100 10" preserveAspectRatio="none">
                            <path d="M0 5 Q 50 10 100 5" stroke="currentColor" strokeWidth="3" fill="none" />
                        </svg>
                    </span> para seu pet
                </>
            ),
            subtitle: "Compare preços de rações e medicamentos em Petz, Cobasi, Petlove e mais.",
            image: "/—Pngtree—dog and cat white backgroud_13489516.png",
            badge: "🔥 Compare e Economize",
            btnText: "Comparar Preços",
            btnLink: "/categoria/racoes",
            decor: "🐶"
        },
        {
            id: 2,
            bg: "bg-gradient-to-br from-blue-500 via-sky-500 to-cyan-400",
            title: (
                <>
                    Farmácia Veterinária com <span className="text-white bg-blue-600/30 px-2 rounded-lg backdrop-blur-sm">Preço Baixo</span>
                </>
            ),
            subtitle: "Encontre antipulgas, vermífugos e medicamentos essenciais para proteger seu pet.",
            image: null, // Placeholder logic or add image if available
            badge: "🏥 Saúde e Bem-estar",
            btnText: "Ver Medicamentos",
            btnLink: "/categoria/medicamentos",
            decor: "💊"
        },
        {
            id: 3,
            bg: "bg-gradient-to-br from-pink-500 via-rose-500 to-red-400",
            title: (
                <>
                    Brinquedos e <span className="text-pink-200 font-serif italic">Acessórios Fofos</span>
                </>
            ),
            subtitle: "As melhores caminhas, arranhadores e brinquedos para manter seu pet feliz.",
            image: null,
            badge: "🧶 Diversão Garantida",
            btnText: "Mimar meu Pet",
            btnLink: "/categoria/brinquedos",
            decor: "🎾"
        },
        {
            id: 4,
            bg: "bg-gradient-to-br from-emerald-500 via-green-500 to-teal-400",
            title: (
                <>
                    Ofertas Relâmpago <br /><span className="text-yellow-300">Até 50% OFF</span>
                </>
            ),
            subtitle: "Seleção diária dos produtos com os maiores descontos da internet. Aproveite!",
            image: null,
            badge: "💰 Economia Real",
            btnText: "Ver Promoções",
            btnLink: "/ofertas",
            decor: "🏷️"
        }
    ]

    const nextSlide = () => setCurrentSlide((prev) => (prev === slides.length - 1 ? 0 : prev + 1))
    const prevSlide = () => setCurrentSlide((prev) => (prev === 0 ? slides.length - 1 : prev - 1))

    useEffect(() => {
        const timer = setInterval(nextSlide, 6000)
        return () => clearInterval(timer)
    }, [])

    return (
        <section className="relative w-full max-w-7xl mx-auto px-4 group">
            <div className="overflow-hidden rounded-[2rem] shadow-2xl shadow-purple-200/50 relative min-h-[400px] md:h-[450px]">

                {slides.map((slide, index) => (
                    <div
                        key={slide.id}
                        className={`absolute inset-0 w-full h-full flex items-center transition-opacity duration-700 ease-in-out ${slide.bg} ${index === currentSlide ? 'opacity-100 z-10' : 'opacity-0 z-0'
                            }`}
                    >
                        {/* Decorative Patterns */}
                        <div className="absolute inset-0 opacity-10 bg-[url('/noise.png')]"></div>
                        <div className="absolute -top-20 -right-20 w-80 h-80 bg-white/20 rounded-full blur-3xl"></div>
                        <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-white/20 rounded-full blur-3xl"></div>

                        <div className="relative z-10 w-full px-8 md:px-16 flex flex-col md:flex-row items-center justify-between gap-8">

                            {/* Text Content */}
                            <div className={`flex-1 max-w-2xl text-left transition-all duration-700 delay-100 transform ${index === currentSlide ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
                                <span className="inline-block px-4 py-1.5 bg-white/20 backdrop-blur-md border border-white/30 text-white text-sm font-bold rounded-full mb-6 shadow-sm">
                                    {slide.badge}
                                </span>

                                <h2 className="text-4xl md:text-6xl font-black text-white mb-6 leading-tight">
                                    {slide.title}
                                </h2>

                                <p className="text-white/90 text-lg md:text-xl mb-8 max-w-lg font-medium">
                                    {slide.subtitle}
                                </p>

                                <div>
                                    <Link href={slide.btnLink} className="inline-flex items-center gap-2 px-8 py-4 bg-white text-gray-900 font-bold rounded-full hover:bg-yellow-300 hover:scale-105 transition-all shadow-lg text-lg group/btn">
                                        {slide.btnText}
                                        <ChevronRight size={20} className="group-hover/btn:translate-x-1 transition-transform" />
                                    </Link>
                                </div>
                            </div>

                            {/* Image/Decor Content */}
                            <div className={`hidden md:flex flex-1 justify-center items-center relative transition-all duration-1000 delay-200 transform ${index === currentSlide ? 'scale-100 opacity-100 rotate-0' : 'scale-90 opacity-0 rotate-12'}`}>
                                <div className="relative">
                                    {slide.image ? (
                                        <img
                                            src={slide.image}
                                            alt={slide.decor}
                                            className="w-[500px] h-[500px] object-contain drop-shadow-2xl"
                                        />
                                    ) : (
                                        <div className="text-[15rem] leading-none drop-shadow-2xl filter saturate-150 animate-pulse">
                                            {slide.decor}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                ))}

                {/* Navigation Dots */}
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-3 z-20">
                    {slides.map((_, index) => (
                        <button
                            key={index}
                            onClick={() => setCurrentSlide(index)}
                            className={`h-3 rounded-full transition-all duration-300 ${currentSlide === index ? 'w-8 bg-white' : 'w-3 bg-white/50 hover:bg-white/80'
                                }`}
                            aria-label={`Slide ${index + 1}`}
                        />
                    ))}
                </div>
            </div>

            {/* Arrows */}
            <button
                onClick={prevSlide}
                className="absolute left-6 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/80 backdrop-blur navigation-arrow rounded-full shadow-lg flex items-center justify-center text-gray-800 hover:scale-110 hover:bg-white transition-all opacity-0 group-hover:opacity-100 z-30"
            >
                <ChevronLeft size={24} />
            </button>
            <button
                onClick={nextSlide}
                className="absolute right-6 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/80 backdrop-blur navigation-arrow rounded-full shadow-lg flex items-center justify-center text-gray-800 hover:scale-110 hover:bg-white transition-all opacity-0 group-hover:opacity-100 z-30"
            >
                <ChevronRight size={24} />
            </button>
        </section>
    )
}
