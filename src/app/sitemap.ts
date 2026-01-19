import { supabase } from '@/lib/supabase'
import { MetadataRoute } from 'next'

// Categorias disponíveis
const CATEGORIAS = [
    'racoes',
    'higiene',
    'medicamentos',
    'brinquedos',
    'gatos',
    'caes',
    'petiscos',
    'acessorios'
]

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://guiadopet.com.br'

    // Páginas estáticas
    const staticPages: MetadataRoute.Sitemap = [
        {
            url: baseUrl,
            lastModified: new Date(),
            changeFrequency: 'daily',
            priority: 1,
        },
    ]

    // Páginas de categoria
    const categoryPages: MetadataRoute.Sitemap = CATEGORIAS.map((slug) => ({
        url: `${baseUrl}/categoria/${slug}`,
        lastModified: new Date(),
        changeFrequency: 'daily' as const,
        priority: 0.9,
    }))

    // Busca todos os produtos
    const { data: produtos } = await supabase
        .from('produtos')
        .select('id, created_at')
        .order('id', { ascending: false })

    // Páginas de produtos
    const productPages: MetadataRoute.Sitemap = (produtos || []).map((produto) => ({
        url: `${baseUrl}/produto/${produto.id}`,
        lastModified: new Date(produto.created_at || new Date()),
        changeFrequency: 'weekly' as const,
        priority: 0.8,
    }))

    return [...staticPages, ...categoryPages, ...productPages]
}
