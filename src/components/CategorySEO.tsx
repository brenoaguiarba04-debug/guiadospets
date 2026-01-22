import { Metadata } from 'next';
import { supabase } from '@/lib/supabase';
import { topBrands } from '@/lib/brandData';

const CATEGORIAS = [
    'racoes',
    'higiene',
    'medicamentos',
    'brinquedos',
    'gatos',
    'caes',
    'petiscos',
    'acessorios'
];

export async function generateCategoryMetadata(slug: string): Promise<Metadata> {
    const categoryNames: Record<string, string> = {
        racoes: 'Rações para Pets',
        higiene: 'Produtos de Higiene Pet',
        medicamentos: 'Medicamentos para Pets',
        brinquedos: 'Brinquedos para Pets',
        gatos: 'Produtos para Gatos',
        caes: 'Produtos para Cães',
        petiscos: 'Petiscos e Guloseimas',
        acessorios: 'Acessórios para Pets',
    };

    const categoryName = categoryNames[slug] || 'Produtos Pet';

    const { count } = await supabase
        .from('produtos')
        .select('*', { count: 'exact', head: true })
        .ilike('categoria', `%${slug}%`);

    return {
        title: `${categoryName} - Compare Preços | GuiaDoPet`,
        description: `Compare preços de ${categoryName.toLowerCase()}. Encontre as melhores ofertas em rações, medicamentos e acessórios para seu pet.`,
        keywords: `${categoryName.toLowerCase()}, preço, comparação, ofertas, petshop`,
        openGraph: {
            title: `${categoryName} - GuiaDoPet`,
            description: `Compare preços e encontre as melhores ofertas em ${categoryName.toLowerCase()}.`,
            type: 'website',
            locale: 'pt_BR',
        },
    };
}

export async function generateBrandMetadata(slug: string): Promise<Metadata> {
    const brand = topBrands.find(b => b.slug === slug);

    if (!brand) {
        return {
            title: 'Marca não encontrada | GuiaDoPet',
        };
    }

    const { count } = await supabase
        .from('produtos')
        .select('*', { count: 'exact', head: true })
        .eq('marca', brand.name);

    return {
        title: `${brand.name} - Compare Preços | GuiaDoPet`,
        description: `Compare preços de produtos ${brand.name}. ${count || 'Vários'} produtos disponíveis. Encontre as melhores ofertas.`,
        keywords: `${brand.name}, ${brand.name.toLowerCase()}, produtos pet, preço, comparação`,
        openGraph: {
            title: `${brand.name} - GuiaDoPet`,
            description: `Compare preços de produtos ${brand.name}. Encontre as melhores ofertas.`,
            type: 'website',
            locale: 'pt_BR',
        },
    };
}
