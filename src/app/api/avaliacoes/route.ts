import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// GET - Buscar avaliações de um produto
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)
    const produtoId = searchParams.get('produto_id')

    if (!produtoId) {
        return NextResponse.json({ error: 'produto_id é obrigatório' }, { status: 400 })
    }

    const { data, error } = await supabase
        .from('avaliacoes')
        .select('*')
        .eq('produto_id', produtoId)
        .order('criado_em', { ascending: false })

    if (error) {
        console.error('Erro ao buscar avaliações:', error)
        return NextResponse.json({ error: 'Erro ao buscar avaliações' }, { status: 500 })
    }

    // Calcular estatísticas
    const total = data.length
    const media = total > 0
        ? data.reduce((sum, a) => sum + a.nota, 0) / total
        : 0

    const distribuicao = data.reduce((dist, a) => {
        dist[a.nota] = (dist[a.nota] || 0) + 1
        return dist
    }, {} as Record<number, number>)

    return NextResponse.json({
        avaliacoes: data,
        estatisticas: {
            media,
            total,
            distribuicao
        }
    })
}

// POST - Criar nova avaliação
export async function POST(request: Request) {
    try {
        const body = await request.json()

        const {
            produto_id,
            usuario_nome,
            usuario_email,
            nota,
            titulo,
            comentario,
            pros,
            contras,
            recomenda
        } = body

        // Validações
        if (!produto_id) {
            return NextResponse.json({ error: 'produto_id é obrigatório' }, { status: 400 })
        }
        if (!usuario_nome || usuario_nome.trim() === '') {
            return NextResponse.json({ error: 'Nome é obrigatório' }, { status: 400 })
        }
        if (!nota || nota < 1 || nota > 5) {
            return NextResponse.json({ error: 'Nota deve ser entre 1 e 5' }, { status: 400 })
        }

        const { data, error } = await supabase
            .from('avaliacoes')
            .insert([{
                produto_id,
                usuario_nome: usuario_nome.trim(),
                usuario_email: usuario_email || null,
                nota,
                titulo: titulo || null,
                comentario: comentario || null,
                pros: Array.isArray(pros) ? pros : [],
                contras: Array.isArray(contras) ? contras : [],
                recomenda: recomenda ?? true
            }])
            .select()

        if (error) {
            console.error('Erro ao criar avaliação:', error)
            return NextResponse.json({ error: 'Erro ao criar avaliação' }, { status: 500 })
        }

        return NextResponse.json({ success: true, data: data[0] }, { status: 201 })

    } catch (err) {
        console.error('Erro no POST /api/avaliacoes:', err)
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}
