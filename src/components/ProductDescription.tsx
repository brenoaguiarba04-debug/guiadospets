interface ProductDescriptionProps {
    produtoNome: string
    categoria: string | null
    marca: string | null
}

// Descrições por categoria
const categoryDescriptions: Record<string, {
    intro: string
    beneficios: string[]
    comoUsar: string
    dicas: string
}> = {
    'Rações': {
        intro: 'Oferece uma nutrição completa e balanceada, desenvolvida por especialistas em nutrição animal para atender às necessidades específicas do seu pet em cada fase da vida.',
        beneficios: [
            'Ingredientes de alta qualidade selecionados',
            'Fórmula balanceada com vitaminas e minerais essenciais',
            'Contribui para pelagem saudável e brilhante',
            'Favorece a digestão e saúde intestinal',
            'Fortalece o sistema imunológico'
        ],
        comoUsar: 'Sirva a quantidade recomendada na tabela da embalagem, dividida em 2-3 porções diárias. Mantenha água fresca sempre disponível. Faça a transição gradual ao trocar de ração.',
        dicas: 'Armazene em local fresco e seco. Após abrir, consumir em até 30 dias. Use recipiente hermético para manter a frescura.'
    },
    'Antipulgas': {
        intro: 'Proteção eficaz contra pulgas, carrapatos e outros parasitas externos, garantindo o conforto e bem-estar do seu pet com ação rápida e duradoura.',
        beneficios: [
            'Ação rápida contra pulgas e carrapatos',
            'Proteção prolongada por semanas',
            'Fácil aplicação ou administração',
            'Seguro quando usado conforme indicação',
            'Interrompe o ciclo de vida dos parasitas'
        ],
        comoUsar: 'Siga rigorosamente as instruções da embalagem. Para pipetas, aplique na pele entre as escápulas. Para comprimidos, ofereça conforme indicado para o peso do animal.',
        dicas: 'Mantenha o tratamento regular mesmo sem infestação visível. Trate também o ambiente para eliminar ovos e larvas.'
    },
    'Medicamentos': {
        intro: 'Formulado especialmente para pets, este produto atua de forma eficaz no tratamento e prevenção de problemas de saúde, sempre sob orientação veterinária.',
        beneficios: [
            'Desenvolvido especificamente para animais',
            'Fórmula de fácil administração',
            'Resultados comprovados',
            'Dosagem precisa por peso',
            'Embalagem que preserva a integridade do produto'
        ],
        comoUsar: 'Administre conforme prescrição veterinária. Respeite os horários e dosagens indicados. Complete todo o ciclo de tratamento mesmo com melhora dos sintomas.',
        dicas: 'Consulte sempre um veterinário antes de iniciar qualquer tratamento. Guarde em local adequado conforme indicação da embalagem.'
    },
    'Higiene': {
        intro: 'Produto desenvolvido com ingredientes suaves e eficazes para manter seu pet limpo, cheiroso e com pelagem saudável, respeitando o pH natural da pele animal.',
        beneficios: [
            'Fórmula específica para o pH animal',
            'Ingredientes suaves que não irritam',
            'Deixa a pelagem macia e brilhante',
            'Fragrância agradável e duradoura',
            'Facilita o desembaraçar dos pelos'
        ],
        comoUsar: 'Molhe completamente a pelagem, aplique o produto massageando suavemente, deixe agir por alguns minutos e enxágue bem. Evite contato com olhos e ouvidos.',
        dicas: 'A frequência ideal de banho varia por espécie e tipo de pelagem. Seque bem seu pet após o banho para evitar problemas de pele.'
    },
    'Brinquedos': {
        intro: 'Desenvolvido para proporcionar diversão, exercício e estímulo mental ao seu pet, contribuindo para seu bem-estar físico e emocional.',
        beneficios: [
            'Material resistente e durável',
            'Seguro e atóxico',
            'Estimula a atividade física',
            'Ajuda a reduzir o estresse e a ansiedade',
            'Fortalece o vínculo entre pet e tutor'
        ],
        comoUsar: 'Apresente o brinquedo ao seu pet gradualmente. Supervisione as brincadeiras e substitua brinquedos danificados. Faça rodízio para manter o interesse.',
        dicas: 'Escolha o tamanho adequado ao porte do seu pet. Limpe periodicamente os brinquedos com água e sabão neutro.'
    },
    'default': {
        intro: 'Produto de qualidade desenvolvido para atender às necessidades do seu pet, oferecendo praticidade e eficácia no dia a dia.',
        beneficios: [
            'Qualidade comprovada',
            'Fácil utilização',
            'Desenvolvido para pets',
            'Marca confiável no mercado',
            'Ótimo custo-benefício'
        ],
        comoUsar: 'Siga as instruções de uso indicadas na embalagem do produto. Em caso de dúvidas, consulte um profissional.',
        dicas: 'Armazene conforme indicação. Verifique a validade antes de usar. Observe qualquer reação do seu pet.'
    }
}

function getCategoryDescription(categoria: string | null) {
    if (!categoria) return categoryDescriptions['default']

    const categoryLower = categoria.toLowerCase()

    if (categoryLower.includes('ração') || categoryLower.includes('racao') || categoryLower.includes('alimenta')) {
        return categoryDescriptions['Rações']
    }
    if (categoryLower.includes('antipulga') || categoryLower.includes('carrapato') || categoryLower.includes('vermifugo')) {
        return categoryDescriptions['Antipulgas']
    }
    if (categoryLower.includes('medicamento') || categoryLower.includes('saúde') || categoryLower.includes('saude')) {
        return categoryDescriptions['Medicamentos']
    }
    if (categoryLower.includes('higiene') || categoryLower.includes('banho') || categoryLower.includes('shampoo')) {
        return categoryDescriptions['Higiene']
    }
    if (categoryLower.includes('brinquedo') || categoryLower.includes('acessório')) {
        return categoryDescriptions['Brinquedos']
    }

    return categoryDescriptions['default']
}

export default function ProductDescription({ produtoNome, categoria, marca }: ProductDescriptionProps) {
    const description = getCategoryDescription(categoria)

    return (
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <span>📦</span> Sobre este Produto
                </h2>
            </div>

            <div className="p-6 space-y-6">
                {/* Introdução */}
                <div>
                    <p className="text-gray-700 leading-relaxed text-lg">
                        <span className="font-semibold text-gray-900">{produtoNome}</span>
                        {marca && <span className="text-blue-600"> da {marca}</span>}
                        {'. '}
                        {description.intro}
                    </p>
                </div>

                {/* Benefícios */}
                <div className="bg-green-50 rounded-xl p-5 border border-green-100">
                    <h3 className="font-bold text-green-800 mb-3 flex items-center gap-2">
                        <span className="text-xl">✅</span> Benefícios
                    </h3>
                    <ul className="grid md:grid-cols-2 gap-2">
                        {description.beneficios.map((beneficio, index) => (
                            <li key={index} className="flex items-start gap-2 text-green-700">
                                <span className="text-green-500 mt-1">•</span>
                                <span>{beneficio}</span>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Como Usar */}
                <div className="bg-blue-50 rounded-xl p-5 border border-blue-100">
                    <h3 className="font-bold text-blue-800 mb-3 flex items-center gap-2">
                        <span className="text-xl">📋</span> Como Usar
                    </h3>
                    <p className="text-blue-700 leading-relaxed">
                        {description.comoUsar}
                    </p>
                </div>

                {/* Dicas */}
                <div className="bg-amber-50 rounded-xl p-5 border border-amber-100">
                    <h3 className="font-bold text-amber-800 mb-3 flex items-center gap-2">
                        <span className="text-xl">💡</span> Dica do Especialista
                    </h3>
                    <p className="text-amber-700 leading-relaxed">
                        {description.dicas}
                    </p>
                </div>
            </div>
        </div>
    )
}
