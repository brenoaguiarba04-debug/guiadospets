import Header from '@/components/Header'
import Footer from '@/components/Footer'
import ProductCard from '@/components/ProductCard'
import { supabase } from '@/lib/supabase'
import { definirGrupo, extrairPesoParaBotao } from '@/lib/utils'

// Força renderização dinâmica
export const dynamic = 'force-dynamic'

interface SearchParams {
  q?: string
}

interface Variacao {
  id: number
  label: string
  imagem: string
  preco: number
  loja: string
}

interface Grupo {
  nomePrincipal: string
  imagemCapa: string
  menorPrecoCapa: number
  variacoes: Variacao[]
  labelsUsados: Set<string>
}

async function getProdutos(searchTerm?: string) {
  let query = supabase
    .from('produtos')
    .select(`
      id,
      nome,
      marca,
      imagem_url,
      precos (
        preco,
        loja,
        link_afiliado
      )
    `)

  if (searchTerm) {
    query = query.ilike('nome', `%${searchTerm}%`)
  }

  const { data, error } = await query

  if (error) {
    console.error('Erro ao buscar produtos:', error)
    return []
  }

  return data || []
}

function agruparProdutos(produtos: any[]) {
  const grupos: Record<string, Grupo> = {}

  for (const p of produtos) {
    if (!p.nome) continue

    // Pegar menor preço do produto
    const precos = p.precos || []
    const menorPrecoObj = precos.reduce((min: any, curr: any) =>
      (!min || (curr.preco > 0 && curr.preco < min.preco)) ? curr : min
      , null)

    const preco = menorPrecoObj?.preco || 0
    const loja = menorPrecoObj?.loja || ''
    const img = p.imagem_url || ''

    const nomeGrupo = definirGrupo(p.nome)
    const textoBotao = extrairPesoParaBotao(p.nome)

    if (!grupos[nomeGrupo]) {
      grupos[nomeGrupo] = {
        nomePrincipal: nomeGrupo,
        imagemCapa: img,
        menorPrecoCapa: preco,
        variacoes: [],
        labelsUsados: new Set()
      }
    }

    const grupoAtual = grupos[nomeGrupo]

    // Evita duplicatas
    if (!grupoAtual.labelsUsados.has(textoBotao)) {
      if (preco > 0 && (grupoAtual.menorPrecoCapa === 0 || preco < grupoAtual.menorPrecoCapa)) {
        grupoAtual.menorPrecoCapa = preco
        grupoAtual.imagemCapa = img
      }

      grupoAtual.variacoes.push({
        id: p.id,
        label: textoBotao,
        imagem: img,
        preco: preco,
        loja: loja
      })
      grupoAtual.labelsUsados.add(textoBotao)
    }
  }

  // Ordena variações por preço
  for (const g of Object.values(grupos)) {
    g.variacoes.sort((a, b) => a.preco - b.preco)
  }

  return Object.values(grupos)
}

export default async function HomePage({
  searchParams
}: {
  searchParams: Promise<SearchParams>
}) {
  const params = await searchParams
  const searchTerm = params?.q || ''
  const produtos = await getProdutos(searchTerm)
  const grupos = agruparProdutos(produtos)

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 max-w-7xl mx-auto px-4 py-6 w-full">
        <h2 className="text-2xl font-extrabold text-gray-800 mb-6">
          {searchTerm ? (
            <>Resultados para &quot;{searchTerm}&quot;</>
          ) : (
            <>Destaques para seu pet 🐾</>
          )}
        </h2>

        {grupos.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {grupos.map((grupo) => (
              <ProductCard
                key={grupo.nomePrincipal}
                nomePrincipal={grupo.nomePrincipal}
                imagemCapa={grupo.imagemCapa}
                menorPrecoCapa={grupo.menorPrecoCapa}
                variacoes={grupo.variacoes}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">😢</div>
            <h3 className="text-xl font-bold text-gray-600">Nenhum produto encontrado</h3>
            <p className="text-gray-500 mt-2">Tente buscar por outro termo.</p>
          </div>
        )}
      </main>

      <Footer />
    </div>
  )
}
