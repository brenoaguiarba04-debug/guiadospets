import Header from '@/components/Header'
import Footer from '@/components/Footer'
import HomeContent from '@/components/HomeContent'
import BenefitsBar from '@/components/BenefitsBar'
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


interface Grupo {
  nomePrincipal: string
  imagemCapa: string
  lojaCapa?: string
  menorPrecoCapa: number
  variacoes: Variacao[]
  labelsUsados: Set<string>
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
        lojaCapa: loja, // Track store for image priority
        menorPrecoCapa: preco,
        variacoes: [],
        labelsUsados: new Set()
      }
    }

    const grupoAtual = grupos[nomeGrupo]

    // Evita duplicatas
    if (!grupoAtual.labelsUsados.has(textoBotao)) {

      // Lógica de Melhor Imagem (Prioriza Lojas Confiáveis)
      const lojasConfiaveis = ['Petz', 'Amazon', 'Petlove', 'Cobasi', 'Magalu']
      const imagemAtualEhConfiavel = lojasConfiaveis.some(l => grupoAtual.lojaCapa?.includes(l))
      const novaImagemEhConfiavel = lojasConfiaveis.some(l => loja.includes(l))

      // Decisão de atualizar a capa (Imagem e Preço são tratados separadamente idealmente, mas aqui simplificamos)
      // Se não temos capa "confiável" ainda, e a nova é confiável -> ATUALIZA LINDA
      // Se ambas são confiáveis (ou ambas não), usa o menor preço como critério.

      let deveAtualizarCapa = false

      if (img && img.length > 10) {
        if (novaImagemEhConfiavel && !imagemAtualEhConfiavel) {
          deveAtualizarCapa = true
        } else if (imagemAtualEhConfiavel && !novaImagemEhConfiavel) {
          deveAtualizarCapa = false
        } else {
          // Critério de desempate: Menor Preço
          if (grupoAtual.menorPrecoCapa === 0 || preco < grupoAtual.menorPrecoCapa) {
            deveAtualizarCapa = true
          }
        }
      }

      if (deveAtualizarCapa) {
        grupoAtual.imagemCapa = img
        grupoAtual.lojaCapa = loja
      }

      // Atualiza sempre o menor preço visualizado (para o badge de preço)
      if (preco > 0 && (grupoAtual.menorPrecoCapa === 0 || preco < grupoAtual.menorPrecoCapa)) {
        grupoAtual.menorPrecoCapa = preco
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

  // Normalização de Imagens: Se o grupo tem uma capa "Confiável", aplica ela nas variações "Não Confiáveis"
  const lojasConfiaveis = ['Petz', 'Amazon', 'Petlove', 'Cobasi', 'Magalu']

  for (const g of Object.values(grupos)) {
    // Ordena por preço
    g.variacoes.sort((a, b) => a.preco - b.preco)

    // Verifica se a capa é confiável
    const capaEhConfiavel = lojasConfiaveis.some(l => (g.lojaCapa || '').toLowerCase().includes(l.toLowerCase()))

    if (capaEhConfiavel) {
      g.variacoes.forEach(v => {
        const varEhConfiavel = lojasConfiaveis.some(l => (v.loja || '').toLowerCase().includes(l.toLowerCase()))
        // Se a variação não é confiável (ex: Shopee), usa a capa confiável (Petz/Amazon)
        if (!varEhConfiavel) {
          v.imagem = g.imagemCapa
        }
      })
    }
  }

  return Object.values(grupos).map(g => ({
    nomePrincipal: g.nomePrincipal,
    imagemCapa: g.imagemCapa,
    menorPrecoCapa: g.menorPrecoCapa,
    variacoes: g.variacoes
  }))
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
    <div className="min-h-screen flex flex-col bg-white">
      <Header />

      <main className="flex-1 w-full">
        {/* Hero Banner - Purple Gradient */}
        <div className="bg-gradient-to-r from-[#522166] to-[#7c3aed] text-white py-8 sm:py-12 relative overflow-hidden">
          {/* Decorative Circles */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2 blur-xl"></div>

          <div className="max-w-7xl mx-auto px-4 relative z-10 text-center sm:text-left">
            <h1 className="font-titan text-3xl sm:text-5xl mb-4 leading-tight">
              Tudo para o seu pet <br /> com preço de internet
            </h1>
            <p className="text-purple-100 text-lg sm:text-xl max-w-xl">
              Compare preços de rações, medicamentos e acessórios nas maiores lojas do Brasil.
            </p>
          </div>
        </div>

        <BenefitsBar />

        {/* Categories Section - Rounded Icons */}
        <div className="max-w-7xl mx-auto px-4 py-8 sm:py-12">
          <h2 className="font-titan text-2xl text-[#522166] mb-8 text-center sm:text-left">
            Destaques para seu pet
          </h2>

          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-6 justify-items-center">
            {/* Categoria 1 */}
            <a href="/categoria/racoes" className="group flex flex-col items-center gap-3">
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-[#fa8c16] flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
                <span className="text-4xl sm:text-5xl">🦴</span>
              </div>
              <span className="font-bold text-gray-700 group-hover:text-[#522166]">Rações</span>
            </a>

            {/* Categoria 2 */}
            <a href="/categoria/higiene" className="group flex flex-col items-center gap-3">
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-[#1890ff] flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
                <span className="text-4xl sm:text-5xl">🚿</span>
              </div>
              <span className="font-bold text-gray-700 group-hover:text-[#522166]">Higiene</span>
            </a>

            {/* Categoria 3 */}
            <a href="/categoria/medicamentos" className="group flex flex-col items-center gap-3">
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-[#52c41a] flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
                <span className="text-4xl sm:text-5xl">💊</span>
              </div>
              <span className="font-bold text-gray-700 group-hover:text-[#522166]">Medicina</span>
            </a>

            {/* Categoria 4 */}
            <a href="/categoria/brinquedos" className="group flex flex-col items-center gap-3">
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-[#eb2f96] flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
                <span className="text-4xl sm:text-5xl">🎾</span>
              </div>
              <span className="font-bold text-gray-700 group-hover:text-[#522166]">Brinquedos</span>
            </a>

            {/* Categoria 5 */}
            <a href="/categoria/gatos" className="group flex flex-col items-center gap-3">
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-[#722ed1] flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
                <span className="text-4xl sm:text-5xl">🐱</span>
              </div>
              <span className="font-bold text-gray-700 group-hover:text-[#522166]">Gatos</span>
            </a>

            {/* Categoria 6 */}
            <a href="/categoria/caes" className="group flex flex-col items-center gap-3">
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-[#ffd000] flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
                <span className="text-4xl sm:text-5xl">🐶</span>
              </div>
              <span className="font-bold text-gray-700 group-hover:text-[#522166]">Cães</span>
            </a>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4">
          <HomeContent grupos={grupos} searchTerm={searchTerm} />
        </div>
      </main>

      <Footer />
    </div>
  )
}
