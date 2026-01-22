import type { Metadata } from "next";
import { getProdutos, agruparProdutos, definirGrupo } from '@/lib/utils';
import { supabase } from '@/lib/supabase';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
    const { id } = await params;
    const produtoId = parseInt(id);

    if (isNaN(produtoId)) {
        return {
            title: 'Produto não encontrado | GuiaDoPet',
            description: 'O produto solicitado não foi encontrado.',
        };
    }

    const { data: produto } = await supabase
        .from('produtos')
        .select('*')
        .eq('id', produtoId)
        .single();

    if (!produto) {
        return {
            title: 'Produto não encontrado | GuiaDoPet',
            description: 'O produto solicitado não foi encontrado.',
        };
    }

    const { data: precos } = await supabase
        .from('precos')
        .select('*')
        .eq('produto_id', produtoId)
        .order('preco', { ascending: true });

    const precosOrdenados = precos || [];
    const menorPreco = precosOrdenados[0]?.preco;
    const maiorPreco = precosOrdenados[precosOrdenados.length - 1]?.preco || menorPreco;
    const precoFormatado = menorPreco ? `R$ ${menorPreco.toFixed(2).replace('.', ',')}` : '';
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://guiadopet.com.br';

    return {
        title: `${produto.nome} | Compare Preços | GuiaDoPet`,
        description: `Encontre o melhor preço para ${produto.nome}${precoFormatado ? ` a partir de ${precoFormatado}` : ''}. Compare ofertas de Shopee, Amazon e outras lojas.`,
        keywords: `${produto.nome}, ${produto.marca || ''}, ${produto.categoria || ''}, ração pet, preço pet, comprar pet`,
        openGraph: {
            title: `${produto.nome} - Melhor Preço R$ ${menorPreco?.toFixed(2).replace('.', ',') || 'Consulte'}`,
            description: `Compare preços de ${produto.nome} em várias lojas. ${precosOrdenados.length} ofertas disponíveis. ${precoFormatado ? `Menor preço: ${precoFormatado}` : ''}`,
            url: `${baseUrl}/produto/${produto.id}`,
            siteName: 'GuiaDoPet',
            type: 'website',
            locale: 'pt_BR',
            images: produto.imagem_url ? [
                {
                    url: produto.imagem_url,
                    width: 800,
                    height: 800,
                    alt: produto.nome,
                }
            ] : [],
        },
        twitter: {
            card: 'summary_large_image',
            title: `${produto.nome} | GuiaDoPet`,
            description: `Menor preço: ${precoFormatado || 'Consulte'}. Compare em várias lojas!`,
            images: produto.imagem_url ? [produto.imagem_url] : [],
            creator: '@guiadopet',
        },
        alternates: {
            canonical: `${baseUrl}/produto/${produto.id}`,
        },
        robots: {
            index: true,
            follow: true,
            googleBot: {
                index: true,
                follow: true,
                'max-video-preview': -1,
                'max-image-preview': 'large',
                'max-snippet': -1,
            },
        },
    };
}

export default async function MetadataLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}
