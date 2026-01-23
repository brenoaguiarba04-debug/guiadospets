import { getProdutos, agruparProdutos } from '../src/lib/utils'

async function debugGrouping() {
    console.log('--- DEBUG GROUPING NEXGARD ---')
    const products = await getProdutos('nexgard')
    console.log(`Total products found: ${products.length}`)

    const groups = agruparProdutos(products)
    console.log(`Total groups: ${groups.length}`)

    groups.forEach(g => {
        console.log(`\nGroup: ${g.nomePrincipal}`)
        console.log(`Variants (${g.variacoes.length}):`)
        g.variacoes.forEach(v => {
            console.log(`  - [${v.id}] ${v.label} (Original: ${products.find(p => p.id === v.id).nome})`)
        })
    })
}

debugGrouping().catch(console.error)
