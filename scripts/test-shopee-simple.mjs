
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

async function testarShopee() {
    const termo = "areia de gato"
    console.log(`🔎 Testando Shopee API com termo: "${termo}"...`)

    const timestamp = Math.floor(Date.now() / 1000)
    const query = `{
        productOfferV2(keyword: "${termo}", limit: 1) {
            nodes {
                itemId
                productName
                price
                imageUrl
                offerLink
            }
        }
    }`

    const payload = JSON.stringify({ query })
    const signature = gerarAssinatura(payload, timestamp)

    console.log(`   Timestamp: ${timestamp}`)
    console.log(`   Signature: ${signature.slice(0, 10)}...`)

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
            console.log(`✅ Sucesso! Produto encontrado:`)
            console.log(`   Nome: ${produtos[0].productName}`)
            console.log(`   Preço: ${produtos[0].price}`)
            console.log(`   Link: ${produtos[0].offerLink}`)
        }

    } catch (err) {
        console.error("❌ Erro de execução:", err)
    }
}

testarShopee()
