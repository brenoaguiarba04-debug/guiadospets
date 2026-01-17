import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// POST - Criar alerta de preço
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { email, produto_id, preco_alvo } = body

        if (!email || !produto_id || !preco_alvo) {
            return NextResponse.json(
                { message: 'Campos obrigatórios: email, produto_id, preco_alvo' },
                { status: 400 }
            )
        }

        // Valida email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(email)) {
            return NextResponse.json(
                { message: 'Email inválido' },
                { status: 400 }
            )
        }

        // Verifica se produto existe
        const { data: produto } = await supabase
            .from('produtos')
            .select('id')
            .eq('id', produto_id)
            .single()

        if (!produto) {
            return NextResponse.json(
                { message: 'Produto não encontrado' },
                { status: 404 }
            )
        }

        // Verifica se já existe alerta igual
        const { data: alertaExistente } = await supabase
            .from('alertas_preco')
            .select('id')
            .eq('email', email)
            .eq('produto_id', produto_id)
            .eq('ativo', true)
            .single()

        if (alertaExistente) {
            // Atualiza o alerta existente
            await supabase
                .from('alertas_preco')
                .update({ preco_alvo })
                .eq('id', alertaExistente.id)

            return NextResponse.json({ success: true, message: 'Alerta atualizado!' })
        }

        // Cria novo alerta
        const { error } = await supabase
            .from('alertas_preco')
            .insert({
                email,
                produto_id,
                preco_alvo,
                ativo: true
            })

        if (error) {
            console.error('Erro ao criar alerta:', error)
            return NextResponse.json(
                { message: 'Erro ao criar alerta. A tabela pode não existir ainda.' },
                { status: 500 }
            )
        }

        return NextResponse.json({ success: true, message: 'Alerta criado!' }, { status: 201 })

    } catch (error) {
        console.error('Erro:', error)
        return NextResponse.json(
            { message: 'Erro ao processar requisição' },
            { status: 500 }
        )
    }
}

// GET - Listar alertas (para admin)
export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url)
    const email = searchParams.get('email')

    if (!email) {
        return NextResponse.json(
            { message: 'Email é obrigatório' },
            { status: 400 }
        )
    }

    const { data: alertas, error } = await supabase
        .from('alertas_preco')
        .select(`
      *,
      produtos (nome, imagem_url)
    `)
        .eq('email', email)
        .eq('ativo', true)

    if (error) {
        return NextResponse.json(
            { message: 'Erro ao buscar alertas' },
            { status: 500 }
        )
    }

    return NextResponse.json(alertas)
}

// DELETE - Desativar alerta
export async function DELETE(request: NextRequest) {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
        return NextResponse.json(
            { message: 'ID é obrigatório' },
            { status: 400 }
        )
    }

    const { error } = await supabase
        .from('alertas_preco')
        .update({ ativo: false })
        .eq('id', parseInt(id))

    if (error) {
        return NextResponse.json(
            { message: 'Erro ao desativar alerta' },
            { status: 500 }
        )
    }

    return NextResponse.json({ success: true })
}
