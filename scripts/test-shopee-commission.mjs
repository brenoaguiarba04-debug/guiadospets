
import crypto from 'crypto'
// import fetch from 'node-fetch' -- Using native global fetch

// Credenciais Shopee (Extraídas de sync-shopee.mjs)
const SHOPEE_APP_ID = '18353990856'
const SHOPEE_SECRET = 'HP3T635VIW5IUPLVXPPVCNE5ID35PF5S'
const SHOPEE_API_URL = 'https://open-api.affiliate.shopee.com.br/graphql'

function gerarAssinatura(payload, timestamp) {
    const factor = `${SHOPEE_APP_ID}${timestamp}${payload}${SHOPEE_SECRET}`
    return crypto.createHash('sha256').update(factor).digest('hex')
}

async function testarShopeeCommission() {
    const termo = "areia de gato"
    console.log(`🔎 Buscando comissão para: "${termo}"...`)

    const timestamp = Math.floor(Date.now() / 1000)
    // Tentando solicitar commissionRate
    const query = `{
        productOfferV2(keyword: "${termo}", limit: 5) {
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

        if (!response.ok) {
            console.log(`❌ Erro HTTP ${response.status}: ${await response.text()}`)
            return
        }

        const dados = await response.json()
        if (dados.errors) {
            console.log(`⚠️ Erro API: ${JSON.stringify(dados.errors, null, 2)}`)
            return
        }

        const produtos = dados?.data?.productOfferV2?.nodes || []
        if (produtos.length === 0) {
            console.log("⚠️ Nenhum produto encontrado")
        } else {
            console.log(`✅ Produtos encontrados (com comissão):`)
            produtos.forEach(p => {
                console.log(`   [${(p.commissionRate * 100).toFixed(1)}%] R$ ${p.price} - ${p.productName.slice(0, 30)}...`)
            })
        }

    } catch (err) {
        console.error("❌ Erro de execução:", err)
    }
}

testarShopeeCommission()
