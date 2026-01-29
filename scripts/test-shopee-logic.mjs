
import crypto from 'crypto'
// import fetch from 'node-fetch' -- Using native global fetch

const SHOPEE_APP_ID = '18353990856'
const SHOPEE_SECRET = 'HP3T635VIW5IUPLVXPPVCNE5ID35PF5S'
const SHOPEE_API_URL = 'https://open-api.affiliate.shopee.com.br/graphql'

function gerarAssinatura(payload, timestamp) {
    const factor = `${SHOPEE_APP_ID}${timestamp}${payload}${SHOPEE_SECRET}`
    return crypto.createHash('sha256').update(factor).digest('hex')
}

async function testarLogica() {
    const termo = "areia de gato"
    console.log(`🔎 Testando lógica de comissão para: "${termo}"...`)

    const timestamp = Math.floor(Date.now() / 1000)
    const query = `{
        productOfferV2(keyword: "${termo}", limit: 10) {
            nodes {
                productName
                price
                commissionRate
                offerLink
            }
        }
    }`

    const payload = JSON.stringify({ query })
    const signature = gerarAssinatura(payload, timestamp)

    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `SHA256 Credential=${SHOPEE_APP_ID}, Timestamp=${timestamp}, Signature=${signature}`
    }

    try {
        const response = await fetch(SHOPEE_API_URL, {
            method: 'POST',
            headers,
            body: payload
        })
        const dados = await response.json()
        const produtos = dados?.data?.productOfferV2?.nodes || []

        if (produtos.length === 0) {
            console.log("⚠️ Nenhum produto encontrado")
            return
        }

        console.log(`\n📋 Candidatos encontrados:`)
        produtos.forEach((p, i) => {
            console.log(`   [${i}] R$ ${p.price} | Com: ${(p.commissionRate * 100).toFixed(1)}% | ${p.productName.slice(0, 30)}...`)
        })

        // LÓGICA DE SELEÇÃO IDENTICA AO SCRIPT
        const TAXA_MINIMA = 0.09;
        const highCommission = produtos.filter(p => p.commissionRate >= TAXA_MINIMA);

        let escolhido = null;

        console.log(`\n🧠 Decisão:`)
        if (highCommission.length > 0) {
            highCommission.sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
            escolhido = highCommission[0];
            console.log(`   💎 VENCEDOR (Comissão Alta+Menor Preço):`)
        } else {
            produtos.sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
            escolhido = produtos[0];
            console.log(`   ⚠️ VENCEDOR (Fallback Menor Preço, sem comissão alta):`)
        }

        console.log(`   👉 R$ ${escolhido.price} | ${(escolhido.commissionRate * 100).toFixed(1)}% | ${escolhido.productName}`)

    } catch (err) {
        console.error("❌ Erro:", err)
    }
}

testarLogica()
