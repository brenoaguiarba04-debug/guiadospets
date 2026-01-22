'use client'

import Link from 'next/link'
import Image from 'next/image'

export default function PetloveCategories() {
    // Definitive Solution: Using individual cropped images.
    // No more CSS sprites or background positioning.

    // Mapping Logic based on sprite grid (2 rows, 5 cols):
    // Row 0:
    // Col 0: Dog Food (Racoes) -> icon_0_0.png
    // Col 1: Dog Hygiene -> icon_0_1.png
    // Col 2: Dog Health -> icon_0_2.png
    // Col 4: Dog Accessories -> icon_0_4.png (Red bowl + fountain?)

    // Row 1:
    // Col 3: Cat Food ?? (Purple bag/Green bowl) -> icon_0_3.png OR icon_1_3.png?
    // Let's assume Row 0 Col 3 was the "Cat Food" from the top row?
    // Actually, visually:
    // R0C3 looks like dog accessories?
    // R1C0: Cat Litter (Green box) -> icon_1_0.png
    // R1C3: Cat Health (Bottles) -> icon_1_3.png
    // R1C4: Cat Acc (Scratcher) -> icon_1_4.png
    // Cat Food: R0C3 (Purple bag/Green bowl) - It was in the top row in the user image?
    // Let's try R0C3 for Cat Food.

    const dogCategories = [
        { name: 'Rações', image: '/categories/smart_icon_0_0.png', link: '/categoria/racoes?pet=cachorro' },
        { name: 'Higiene e limpeza', image: '/categories/smart_icon_0_1.png', link: '/categoria/higiene?pet=cachorro' },
        { name: 'Medicina e saúde', image: '/categories/smart_icon_0_2.png', link: '/categoria/medicamentos?pet=cachorro' },
        { name: 'Acessórios de alimentação', image: '/categories/smart_icon_0_4.png', link: '/categoria/acessorios?pet=cachorro' },
    ]

    const catCategories = [
        { name: 'Rações', image: '/categories/smart_icon_0_3.png', link: '/categoria/racoes?pet=gato' },
        { name: 'Caixa de areia e limpeza', image: '/categories/smart_icon_1_0.png', link: '/categoria/higiene?pet=gato' },
        { name: 'Medicina e saúde', image: '/categories/smart_icon_1_3.png', link: '/categoria/medicamentos?pet=gato' },
        { name: 'Acessórios de alimentação', image: '/categories/smart_icon_1_4.png', link: '/categoria/acessorios?pet=gato' },
    ]

    return (
        <section className="py-12 bg-white">
            <div className="max-w-7xl mx-auto px-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                    {/* Cachorros */}
                    <div>
                        <h3 className="text-2xl font-black text-purple-800 mb-8">Destaques para cachorro</h3>
                        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide md:grid md:grid-cols-4">
                            {dogCategories.map((item, idx) => (
                                <Link key={idx} href={item.link} className="flex flex-col items-center gap-3 group min-w-[100px]">
                                    <div className="w-24 h-24 flex items-center justify-center group-hover:scale-110 transition-all duration-300">
                                        <Image
                                            src={item.image}
                                            alt={item.name}
                                            width={96}
                                            height={96}
                                            className="w-full h-full object-contain"
                                        />
                                    </div>
                                    <span className="text-sm font-bold text-gray-700 text-center leading-tight group-hover:text-purple-700">
                                        {item.name}
                                    </span>
                                </Link>
                            ))}
                        </div>
                    </div>

                    {/* Gatos */}
                    <div>
                        <h3 className="text-2xl font-black text-purple-800 mb-8">Destaques para gato</h3>
                        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide md:grid md:grid-cols-4">
                            {catCategories.map((item, idx) => (
                                <Link key={idx} href={item.link} className="flex flex-col items-center gap-3 group min-w-[100px]">
                                    <div className="w-24 h-24 flex items-center justify-center group-hover:scale-110 transition-all duration-300">
                                        <Image
                                            src={item.image}
                                            alt={item.name}
                                            width={96}
                                            height={96}
                                            className="w-full h-full object-contain"
                                        />
                                    </div>
                                    <span className="text-sm font-bold text-gray-700 text-center leading-tight group-hover:text-purple-700">
                                        {item.name}
                                    </span>
                                </Link>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}
