import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'
import AdminForm from '@/components/AdminForm'
import DeleteButton from '@/components/DeleteButton'

// Força renderização dinâmica
export const dynamic = 'force-dynamic'

interface ProdutoComPreco {
    id: number
    nome: string
    marca: string | null
    imagem_url: string | null
    preco: number
    precos?: { preco: number }[]
}

async function getAdminData() {
    const { data: produtos } = await supabase
        .from('produtos')
        .select(`
      *,
      precos (preco)
    `)
        .order('id', { ascending: false })

    const produtosComPreco: ProdutoComPreco[] = (produtos || []).map((p: ProdutoComPreco) => ({
        ...p,
        preco: p.precos?.[0]?.preco || 0
    }))

    const { count: totalProdutos } = await supabase
        .from('produtos')
        .select('*', { count: 'exact', head: true })

    const { data: marcas } = await supabase
        .from('produtos')
        .select('marca')

    const marcasUnicas = new Set(marcas?.map((m: { marca: string }) => m.marca).filter(Boolean))

    return {
        produtos: produtosComPreco,
        stats: {
            total: totalProdutos || 0,
            marcas: marcasUnicas.size
        }
    }
}

export default async function AdminPage() {
    const { userId } = await auth()

    if (!userId) {
        redirect('/sign-in')
    }

    const { produtos, stats } = await getAdminData()

    return (
        <div className="min-h-screen bg-gray-100">
            {/* Header */}
            <header className="bg-emerald-800 text-white px-6 py-4 flex justify-between items-center">
                <h1 className="text-xl font-bold">🛠️ Painel Admin</h1>
                <div className="flex items-center gap-4">
                    <Link href="/" className="text-white hover:text-emerald-200 transition-colors">
                        Ver Site
                    </Link>
                    <Link href="/sign-out" className="text-red-300 hover:text-red-200 transition-colors">
                        Sair
                    </Link>
                </div>
            </header>

            {/* Stats */}
            <div className="max-w-6xl mx-auto px-4 py-4">
                <p className="text-sm text-gray-600">
                    Total: <strong>{stats.total}</strong> produtos | <strong>{stats.marcas}</strong> marcas cadastradas
                </p>
            </div>

            {/* Form */}
            <div className="max-w-6xl mx-auto px-4 pb-6">
                <div className="bg-white rounded-xl shadow-sm p-6">
                    <h2 className="text-lg font-bold text-emerald-800 border-b-2 border-gray-100 pb-3 mb-4">
                        ➕ Cadastrar Novo Produto
                    </h2>
                    <AdminForm />
                </div>
            </div>

            {/* Products Table */}
            <div className="max-w-6xl mx-auto px-4 pb-8">
                <div className="bg-white rounded-xl shadow-sm p-6 overflow-x-auto">
                    <h2 className="text-lg font-bold text-emerald-800 border-b-2 border-gray-100 pb-3 mb-4">
                        📦 Produtos Cadastrados
                    </h2>

                    <table className="w-full">
                        <thead>
                            <tr className="bg-gray-50 text-left">
                                <th className="px-4 py-3 font-semibold text-gray-600">Img</th>
                                <th className="px-4 py-3 font-semibold text-gray-600">Nome</th>
                                <th className="px-4 py-3 font-semibold text-gray-600">Marca</th>
                                <th className="px-4 py-3 font-semibold text-gray-600">Preço</th>
                                <th className="px-4 py-3 font-semibold text-gray-600">Ação</th>
                            </tr>
                        </thead>
                        <tbody>
                            {produtos.map((p) => (
                                <tr key={p.id} className="border-b border-gray-100 hover:bg-gray-50">
                                    <td className="px-4 py-3">
                                        <div className="relative w-10 h-10">
                                            <Image
                                                src={p.imagem_url || 'https://via.placeholder.com/40'}
                                                alt={p.nome}
                                                fill
                                                className="object-contain rounded"
                                            />
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-sm">{p.nome}</td>
                                    <td className="px-4 py-3">
                                        <span className="px-2 py-1 bg-gray-100 rounded text-xs font-medium">
                                            {p.marca || 'N/A'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-sm font-medium">
                                        {p.preco > 0 ? `R$ ${p.preco.toFixed(2).replace('.', ',')}` : '-'}
                                    </td>
                                    <td className="px-4 py-3">
                                        <DeleteButton productId={p.id} />
                                    </td>
                                </tr>
                            ))}
                            {produtos.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                                        Nenhum produto cadastrado ainda.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
