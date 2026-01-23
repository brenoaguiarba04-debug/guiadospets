import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const envPath = path.resolve(__dirname, '../.env.local')

let SUPABASE_URL = ''
let SUPABASE_SERVICE_ROLE_KEY = ''

if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8')
    const urlMatch = envContent.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)
    const keyMatch = envContent.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)
    if (urlMatch) SUPABASE_URL = urlMatch[1].trim()
    if (keyMatch) SUPABASE_SERVICE_ROLE_KEY = keyMatch[1].trim()
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

// PASTE UTILS HERE TEMPORARILY
function extrairPesoParaBotao(nome) {
    if (!nome) return "Ver"
    const n = nome.toLowerCase()
    const matchFaixa = n.match(/(\d+[.,]?\d*)\s*(?:a|-|à|ate)\s*(\d+[.,]?\d*)\s*kg/)
    if (matchFaixa) {
        const p1 = parseFloat(matchFaixa[1].replace(',', '.'))
        const p2 = parseFloat(matchFaixa[2].replace(',', '.'))
        if (Math.abs(p2 - p1) < 30) return `${p1}-${p2}kg`
    }
    const matchKg = n.match(/(\d+[.,]?\d*)\s*kg/)
    if (matchKg) return `${matchKg[1].replace(',', '.')}kg`
    if (['comprimido', 'tablete', 'un'].some(termo => n.includes(termo))) {
        const matchQtd = n.match(/(\d+)\s*(?:un|comp|tab)/)
        if (matchQtd) return `${matchQtd[1]} Un.`
    }
    const matchMg = n.match(/(\d+)\s*mg/)
    if (matchMg) return `${matchMg[1]}mg`
    return "Ver"
}

function definirGrupo(nome) {
    if (!nome) return "Sem Nome"
    const n = nome.toLowerCase()
    let tipo = ""
    if (n.includes('nexgard')) {
        tipo = n.includes('spectra') ? "Spectra" : ""
        const is3Pack = /(?:3\s*(?:uni|tab|comp|dos|caps)|cx\s*3|pack\s*3|c\/\s*3|c\/3)/i.test(n)
        const qtd = is3Pack ? "3 Comp." : "1 Comp."
        return `NexGard ${tipo} ${qtd}`.trim()
    }
    if (n.includes('simparic')) {
        const is3Pack = /(?:3\s*(?:uni|tab|comp|dos|caps)|cx\s*3|pack\s*3|c\/\s*3|c\/3)/i.test(n)
        const qtd = is3Pack ? "3 Comp." : "1 Comp."
        return `Simparic ${qtd}`
    }
    return "Outro"
}

async function run() {
    const { data: products } = await supabase.from('produtos').select('id, nome').ilike('nome', '%nexgard%')
    const groups = {}

    products.forEach(p => {
        const groupName = definirGrupo(p.nome)
        const label = extrairPesoParaBotao(p.nome)
        if (!groups[groupName]) groups[groupName] = []
        groups[groupName].push({ id: p.id, nome: p.nome, label })
    })

    console.log(JSON.stringify(groups, null, 2))
}

run()
