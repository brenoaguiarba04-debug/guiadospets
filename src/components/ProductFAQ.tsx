'use client'

import { useState } from 'react'

interface FAQItem {
    question: string
    answer: string
}

// FAQ por categoria de produto
const categoryFAQs: Record<string, FAQItem[]> = {
    'Rações': [
        {
            question: 'Como armazenar a ração corretamente?',
            answer: 'Guarde em local fresco e seco, longe da luz solar direta. Após abrir, mantenha em recipiente hermético ou feche bem a embalagem original. Evite deixar em locais úmidos para manter a boa qualidade e sabor.'
        },
        {
            question: 'Qual a validade após abrir a embalagem?',
            answer: 'Após aberta, a ração seca mantém suas propriedades por cerca de 30 a 45 dias se bem armazenada. Rações úmidas devem ser consumidas em até 3 dias se refrigeradas.'
        },
        {
            question: 'Como fazer a transição para uma nova ração?',
            answer: 'Faça a transição gradualmente em 7-10 dias. Comece misturando 25% da nova ração com 75% da antiga, aumentando a proporção a cada 2-3 dias até completar 100% da nova ração.'
        },
        {
            question: 'Qual a quantidade ideal para meu pet?',
            answer: 'A quantidade varia conforme peso, idade e nível de atividade do animal. Consulte a tabela nutricional na embalagem e ajuste conforme orientação do veterinário.'
        }
    ],
    'Medicamentos': [
        {
            question: 'Preciso de receita veterinária?',
            answer: 'Alguns medicamentos requerem prescrição veterinária. Sempre consulte um profissional antes de administrar qualquer medicamento ao seu pet.'
        },
        {
            question: 'Como administrar o medicamento?',
            answer: 'Siga rigorosamente as instruções da bula e orientações do veterinário. Alguns podem ser misturados à comida, outros devem ser dados diretamente.'
        },
        {
            question: 'Quais os efeitos colaterais possíveis?',
            answer: 'Cada medicamento pode ter efeitos específicos. Consulte a bula e observe seu pet após a administração. Em caso de reações adversas, procure o veterinário imediatamente.'
        }
    ],
    'Antipulgas': [
        {
            question: 'Com qual frequência devo aplicar?',
            answer: 'A maioria dos antipulgas tem proteção mensal, mas alguns oferecem proteção por até 3 meses. Verifique as instruções do produto específico.'
        },
        {
            question: 'Posso dar banho após a aplicação?',
            answer: 'Para produtos spot-on (pipeta), aguarde pelo menos 48 horas antes do banho. Comprimidos orais não são afetados por banhos.'
        },
        {
            question: 'É seguro para filhotes?',
            answer: 'Depende do produto. Verifique a idade mínima indicada na embalagem. A maioria é segura a partir de 8 semanas de vida e peso mínimo específico.'
        },
        {
            question: 'Devo tratar o ambiente também?',
            answer: 'Sim! Pulgas se reproduzem no ambiente. Lave camas e cobertores em água quente, aspire tapetes e considere usar produtos específicos para o ambiente.'
        }
    ],
    'Higiene': [
        {
            question: 'Com qual frequência devo dar banho no meu pet?',
            answer: 'Cães geralmente precisam de banho a cada 2-4 semanas. Gatos raramente precisam de banho. O excesso pode ressecar a pele e pelagem.'
        },
        {
            question: 'Posso usar shampoo humano no meu pet?',
            answer: 'Não! O pH da pele dos pets é diferente da humana. Use sempre produtos específicos para animais para evitar irritações e alergias.'
        },
        {
            question: 'Como escolher o produto certo?',
            answer: 'Considere o tipo de pelagem, idade e condições especiais (pele sensível, alergias). Consulte seu veterinário para recomendações específicas.'
        }
    ],
    'Brinquedos': [
        {
            question: 'Como escolher o tamanho ideal?',
            answer: 'O brinquedo deve ser grande o suficiente para não ser engolido, mas adequado ao tamanho da boca do pet. Observe as indicações de porte na embalagem.'
        },
        {
            question: 'Com que frequência devo trocar os brinquedos?',
            answer: 'Substitua quando apresentarem desgaste, rasgos ou peças soltas que possam ser engolidas. Faça rotação de brinquedos para manter o interesse do pet.'
        },
        {
            question: 'Qual material é mais seguro?',
            answer: 'Borracha natural, nylon resistente e tecidos reforçados são boas opções. Evite plásticos finos ou materiais que se fragmentem facilmente.'
        }
    ],
    'default': [
        {
            question: 'Este produto é seguro para o meu pet?',
            answer: 'Verifique sempre se o produto é adequado para a espécie, idade e tamanho do seu animal. Em caso de dúvidas, consulte um veterinário.'
        },
        {
            question: 'Como escolher o produto certo?',
            answer: 'Considere as necessidades específicas do seu pet, leia avaliações de outros tutores e compare preços entre diferentes lojas.'
        },
        {
            question: 'O que fazer se meu pet tiver uma reação adversa?',
            answer: 'Interrompa o uso imediatamente e procure um veterinário. Leve a embalagem do produto para facilitar o diagnóstico.'
        }
    ]
}

function getCategoryFAQ(categoria: string | null): FAQItem[] {
    if (!categoria) return categoryFAQs['default']

    // Mapear categorias para FAQs
    const categoryLower = categoria.toLowerCase()

    if (categoryLower.includes('ração') || categoryLower.includes('racao') || categoryLower.includes('alimenta')) {
        return categoryFAQs['Rações']
    }
    if (categoryLower.includes('medicamento') || categoryLower.includes('saúde') || categoryLower.includes('saude')) {
        return categoryFAQs['Medicamentos']
    }
    if (categoryLower.includes('antipulga') || categoryLower.includes('carrapato') || categoryLower.includes('vermifugo')) {
        return categoryFAQs['Antipulgas']
    }
    if (categoryLower.includes('higiene') || categoryLower.includes('banho') || categoryLower.includes('shampoo')) {
        return categoryFAQs['Higiene']
    }
    if (categoryLower.includes('brinquedo') || categoryLower.includes('acessório')) {
        return categoryFAQs['Brinquedos']
    }

    return categoryFAQs['default']
}

interface ProductFAQProps {
    categoria: string | null
    produtoNome: string
}

export default function ProductFAQ({ categoria, produtoNome }: ProductFAQProps) {
    const [openIndex, setOpenIndex] = useState<number | null>(null)
    const faqs = getCategoryFAQ(categoria)

    const toggleFAQ = (index: number) => {
        setOpenIndex(openIndex === index ? null : index)
    }

    // Schema.org FAQPage para SEO
    const faqSchema = {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: faqs.map(faq => ({
            '@type': 'Question',
            name: faq.question,
            acceptedAnswer: {
                '@type': 'Answer',
                text: faq.answer
            }
        }))
    }

    return (
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            {/* Schema.org para SEO */}
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
            />

            <div className="bg-gradient-to-r from-purple-600 to-purple-700 px-6 py-4">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <span>❓</span> Perguntas Frequentes
                </h2>
            </div>

            <div className="divide-y divide-gray-100">
                {faqs.map((faq, index) => (
                    <div key={index} className="group">
                        <button
                            onClick={() => toggleFAQ(index)}
                            className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-purple-50 transition-colors"
                        >
                            <span className="font-semibold text-gray-800 pr-4">
                                {faq.question}
                            </span>
                            <span className={`flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-purple-100 text-purple-600 transition-transform duration-200 ${openIndex === index ? 'rotate-180' : ''}`}>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </span>
                        </button>

                        <div className={`overflow-hidden transition-all duration-300 ${openIndex === index ? 'max-h-96' : 'max-h-0'}`}>
                            <div className="px-6 pb-4 text-gray-600 bg-gray-50">
                                <p className="leading-relaxed">
                                    {faq.answer}
                                </p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
