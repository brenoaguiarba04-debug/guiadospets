import { createClient, SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

// Cria cliente apenas se as variáveis estão configuradas
function createSupabaseClient(): SupabaseClient {
    if (!supabaseUrl || !supabaseAnonKey || supabaseUrl === 'your_supabase_url_here') {
        // Retorna um cliente mock para o build passar
        console.warn('⚠️ Supabase não configurado. Configure as variáveis de ambiente.')
        return createClient('https://placeholder.supabase.co', 'placeholder-key')
    }
    return createClient(supabaseUrl, supabaseAnonKey)
}

export const supabase = createSupabaseClient()

// Types para o banco de dados
export interface Produto {
    id: number
    nome: string
    marca: string | null
    categoria: string | null
    imagem_url: string | null
    palavras_chave: string | null
    codigo_unico: string | null
    created_at: string
}

export interface Preco {
    id: number
    produto_id: number
    loja: string
    preco: number
    link_afiliado: string | null
    ultima_atualizacao: string
}

export interface ProdutoComPreco extends Produto {
    menor_preco: number | null
    loja_menor_preco: string | null
}
