import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { supabase } from '@/lib/supabase'
import { supabaseAdmin } from '@/lib/supabase-admin'


// Força renderização dinâmica
export const dynamic = 'force-dynamic'
export async function GET() {
    const { data, error } = await supabase
        .from('produtos')
        .select(`
      *,
      precos (*)
    `)
        .order('id', { ascending: false })

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
}

// POST - Cria novo produto (autenticado)
export async function POST(request: NextRequest) {
    const { userId } = await auth()

    if (!userId) {
        return NextResponse.json({ message: 'Não autorizado' }, { status: 401 })
    }

    try {
        const body = await request.json()
        const { nome, marca, categoria, preco, link_afiliado, imagem_url, palavras_chave } = body

        if (!nome || !marca || !categoria || !preco || !link_afiliado) {
            return NextResponse.json({ message: 'Campos obrigatórios faltando' }, { status: 400 })
        }

        // Cria o produto
        const { data: produto, error: produtoError } = await supabaseAdmin
            .from('produtos')
            .insert({
                nome,
                marca,
                categoria,
                imagem_url: imagem_url || null,
                palavras_chave: palavras_chave || `${nome} ${marca} ${categoria}`
            })
            .select()
            .single()

        if (produtoError) {
            return NextResponse.json({ message: produtoError.message }, { status: 500 })
        }

        // Cria o preço
        const { error: precoError } = await supabaseAdmin
            .from('precos')
            .insert({
                produto_id: produto.id,
                loja: 'Manual',
                preco: parseFloat(preco),
                link_afiliado,
                ultima_atualizacao: new Date().toISOString()
            })

        if (precoError) {
            // Rollback - exclui o produto se não conseguiu criar o preço
            await supabaseAdmin.from('produtos').delete().eq('id', produto.id)
            return NextResponse.json({ message: precoError.message }, { status: 500 })
        }

        return NextResponse.json({ success: true, produto }, { status: 201 })

    } catch {
        return NextResponse.json({ message: 'Erro ao processar requisição' }, { status: 500 })
    }
}

// DELETE - Exclui produto (autenticado)
export async function DELETE(request: NextRequest) {
    const { userId } = await auth()

    if (!userId) {
        return NextResponse.json({ message: 'Não autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
        return NextResponse.json({ message: 'ID do produto não fornecido' }, { status: 400 })
    }

    // Exclui preços primeiro (cascade)
    await supabaseAdmin.from('precos').delete().eq('produto_id', parseInt(id))

    // Exclui produto
    const { error } = await supabaseAdmin.from('produtos').delete().eq('id', parseInt(id))

    if (error) {
        return NextResponse.json({ message: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
}
